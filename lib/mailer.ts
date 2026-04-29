import path from "path";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

import { decryptValue } from "@/lib/crypto";
import {
  getUploadedFile,
  getUploadedPublicUrl,
  readUploadedFile as readStoredUploadedFile
} from "@/lib/uploads";
import { formatCurrency, formatDate } from "@/lib/utils";

type MailerConfig = {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFromName?: string | null;
  businessEmail?: string | null;
  businessName: string;
  businessWebsite?: string | null;
  logoPath?: string | null;
};

type SendInvoiceEmailOptions = {
  config: MailerConfig;
  to: string;
  subject: string;
  message: string;
  licenseKey?: string;
  endpointUrl?: string;
  invoicePdf: Buffer;
  invoiceNumber?: string;
  invoiceDate?: Date | string;
  invoiceAmount?: number;
  invoiceCurrency?: string;
  customerName?: string;
  botFilePath?: string | null;
  botFileName?: string | null;
};

type CustomerEmailAttachment = {
  fileName: string;
  filePath: string;
};

type SendCustomerEmailOptions = {
  config: MailerConfig;
  to: string;
  subject: string;
  message: string;
  customerName?: string;
  attachments?: CustomerEmailAttachment[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEmailMessage(message: string, fallback = "Please find your invoice attached.") {
  const trimmed = message.trim() || fallback;
  return escapeHtml(trimmed).replace(/\r?\n/g, "<br />");
}

function safeAttachmentName(value?: string) {
  return `${value || "invoice"}`.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function getContentTypeFromPath(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".zip") return "application/zip";
  if (extension === ".pdf") return "application/pdf";

  return "application/octet-stream";
}

function normalizeEndpointUrl(endpointUrl?: string) {
  const trimmed = endpointUrl?.trim() || "";

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getMaxAttachmentBytes() {
  const configured = Number(process.env.EMAIL_MAX_ATTACHMENT_MB || 22);
  return Math.max(1, configured) * 1024 * 1024;
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function getEmailLogo(logoPath?: string | null) {
  if (!logoPath) {
    return null;
  }

  const publicUrl =
    getUploadedPublicUrl(logoPath) ||
    (logoPath.startsWith("/uploads/") && process.env.NEXTAUTH_URL
      ? new URL(logoPath, process.env.NEXTAUTH_URL).href
      : /^https?:\/\//i.test(logoPath)
        ? logoPath
        : null);

  if (publicUrl) {
    return {
      src: publicUrl,
      attachment: null
    };
  }

  if (!logoPath.startsWith("/uploads/")) {
    return null;
  }

  try {
    const uploaded = await getUploadedFile(logoPath);

    return {
      src: "cid:business-logo",
      attachment: {
        filename: path.basename(logoPath),
        content: uploaded.buffer,
        contentType: uploaded.contentType || getContentTypeFromPath(logoPath),
        cid: "business-logo",
        contentDisposition: "inline" as const
      }
    };
  } catch (error) {
    console.warn(`Unable to attach email logo: ${logoPath}`, error);
    return null;
  }
}

function createTransporter(config: MailerConfig) {
  if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPass) {
    throw new Error("SMTP settings are incomplete.");
  }

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    requireTLS: config.smtpPort === 587,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
    tls: {
      servername: config.smtpHost
    },
    auth: {
      user: config.smtpUser,
      pass: decryptValue(config.smtpPass)
    }
  });
}

function getFromAddress(config: MailerConfig) {
  const address = config.businessEmail || config.smtpUser;

  if (!address) {
    return undefined;
  }

  return config.smtpFromName ? `"${config.smtpFromName}" <${address}>` : address;
}

export async function sendInvoiceEmail({
  config,
  to,
  subject,
  message,
  licenseKey,
  endpointUrl,
  invoicePdf,
  invoiceNumber,
  invoiceDate,
  invoiceAmount,
  invoiceCurrency,
  customerName,
  botFilePath,
  botFileName
}: SendInvoiceEmailOptions) {
  const transporter = createTransporter(config);

  const attachments: Mail.Attachment[] = [
    {
      filename: `${safeAttachmentName(invoiceNumber)}.pdf`,
      content: invoicePdf
    }
  ];

  let totalAttachmentBytes = invoicePdf.byteLength;

  if (botFilePath) {
    const botFileContent = await readStoredUploadedFile(botFilePath);
    totalAttachmentBytes += botFileContent.byteLength;
    attachments.push({
      filename: botFileName || path.basename(botFilePath),
      content: botFileContent,
      contentType: getContentTypeFromPath(botFileName || botFilePath)
    });
  }

  const logo = await getEmailLogo(config.logoPath);

  if (logo?.attachment) {
    attachments.push(logo.attachment);

    if (Buffer.isBuffer(logo.attachment.content)) {
      totalAttachmentBytes += logo.attachment.content.byteLength;
    }
  }

  const maxAttachmentBytes = getMaxAttachmentBytes();

  if (totalAttachmentBytes > maxAttachmentBytes) {
    throw new Error(
      `Email attachments are ${formatBytes(totalAttachmentBytes)}, which is above the configured ${formatBytes(maxAttachmentBytes)} SMTP-safe limit. Reduce the ZIP size or raise EMAIL_MAX_ATTACHMENT_MB if your provider supports it.`
    );
  }

  const from = getFromAddress(config);

  const safeBusinessName = escapeHtml(config.businessName);
  const safeCustomerName = customerName ? escapeHtml(customerName) : "there";
  const safeInvoiceNumber = escapeHtml(invoiceNumber || "Invoice");
  const safeInvoiceDate = invoiceDate ? escapeHtml(formatDate(invoiceDate)) : "Attached";
  const safeInvoiceAmount =
    typeof invoiceAmount === "number"
      ? escapeHtml(formatCurrency(invoiceAmount, invoiceCurrency || "USD"))
      : "Attached";
  const safeBusinessEmail = config.businessEmail ? escapeHtml(config.businessEmail) : "";
  const safeBotFileName = botFileName ? escapeHtml(botFileName) : "";
  const safeLicenseKey = licenseKey?.trim() ? escapeHtml(licenseKey.trim()) : "";
  const normalizedEndpointUrl = normalizeEndpointUrl(endpointUrl);
  const safeEndpointUrl = normalizedEndpointUrl ? escapeHtml(normalizedEndpointUrl) : "";
  const attachmentCount = botFileName ? "2 attachments" : "1 attachment";
  const logoMarkup = logo?.src
    ? `<img src="${escapeHtml(logo.src)}" width="56" height="56" alt="${safeBusinessName}" style="display:block;width:56px;height:56px;border-radius:14px;object-fit:cover;border:1px solid rgba(255,255,255,0.32);" />`
    : `<div style="width:56px;height:56px;border-radius:14px;background:#dfe9ff;color:#0f2460;font-size:22px;line-height:56px;text-align:center;font-weight:700;">${safeBusinessName.slice(0, 1).toUpperCase()}</div>`;
  const accessRows =
    safeLicenseKey || safeEndpointUrl
      ? `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #c9d6f0;margin:0 0 22px;background:#ffffff;">
                      <tr>
                        <td colspan="2" style="padding:13px 14px;background:#0f2460;color:#ffffff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Access details</td>
                      </tr>
                      ${
                        safeLicenseKey
                          ? `<tr>
                        <td style="padding:12px 14px;color:#5c6885;font-size:13px;border-top:1px solid #dbe4f3;">License key</td>
                        <td align="right" style="padding:12px 14px;color:#12203f;font-size:13px;border-top:1px solid #dbe4f3;font-family:Consolas,Monaco,monospace;">${safeLicenseKey}</td>
                      </tr>`
                          : ""
                      }
                      ${
                        safeEndpointUrl
                          ? `<tr>
                        <td style="padding:12px 14px;color:#5c6885;font-size:13px;border-top:1px solid #dbe4f3;">Endpoint URL</td>
                        <td align="right" style="padding:12px 14px;color:#12203f;font-size:13px;border-top:1px solid #dbe4f3;"><a href="${safeEndpointUrl}" style="color:#0f4fb8;text-decoration:none;">${safeEndpointUrl}</a></td>
                      </tr>`
                          : ""
                      }
                    </table>`
      : "";

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:#eef3fb;font-family:Arial,Helvetica,sans-serif;color:#12203f;">
        <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">
          ${safeInvoiceNumber} from ${safeBusinessName} is attached as a PDF.
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef3fb;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:collapse;background:#ffffff;border:1px solid #d8e0f1;">
                <tr>
                  <td style="background:#0f2460;padding:26px 28px;color:#ffffff;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      <tr>
                        <td width="68" valign="middle">${logoMarkup}</td>
                        <td valign="middle">
                          <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#dfe9ff;font-weight:700;">Invoice delivery</div>
                          <div style="font-size:25px;line-height:1.25;font-weight:700;margin-top:7px;">${safeBusinessName}</div>
                          ${safeBusinessEmail ? `<div style="font-size:13px;line-height:1.6;color:#dfe9ff;margin-top:5px;">${safeBusinessEmail}</div>` : ""}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#33415f;">Hi ${safeCustomerName},</p>
                    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#33415f;">${formatEmailMessage(message)}</p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #dbe4f3;margin:0 0 22px;">
                      <tr>
                        <td style="padding:12px 14px;background:#f8fbff;color:#5c6885;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Invoice number</td>
                        <td align="right" style="padding:12px 14px;background:#f8fbff;color:#0f2460;font-size:14px;font-weight:700;">${safeInvoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 14px;border-top:1px solid #dbe4f3;color:#5c6885;font-size:13px;">Invoice date</td>
                        <td align="right" style="padding:12px 14px;border-top:1px solid #dbe4f3;color:#12203f;font-size:13px;">${safeInvoiceDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 14px;border-top:1px solid #dbe4f3;color:#5c6885;font-size:13px;">Amount</td>
                        <td align="right" style="padding:12px 14px;border-top:1px solid #dbe4f3;color:#12203f;font-size:15px;font-weight:700;">${safeInvoiceAmount}</td>
                      </tr>
                    </table>

                    ${accessRows}

                    <div style="border-left:4px solid #3d61c5;background:#f8fbff;padding:14px 16px;margin:0 0 22px;color:#33415f;font-size:14px;line-height:1.6;">
                      Attached: invoice PDF${safeBotFileName ? ` and ${safeBotFileName}` : ""}.
                    </div>

                    <p style="margin:0;color:#5c6885;font-size:13px;line-height:1.7;">
                      This email includes ${attachmentCount}. Please reply to this email if anything needs to be adjusted.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px;background:#f8fbff;border-top:1px solid #dbe4f3;color:#5c6885;font-size:12px;line-height:1.6;text-align:center;">
                    Sent by ${safeBusinessName}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    await transporter.verify();
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP error.";

    if (/ECONNRESET|socket hang up|connection/i.test(message)) {
      throw new Error(
        `SMTP connection failed (${message}). Check SMTP host, port, SSL/TLS mode, and whether your provider allows SMTP from this server.`
      );
    }

    throw error;
  }
}

export async function sendCustomerEmail({
  config,
  to,
  subject,
  message,
  customerName,
  attachments: selectedAttachments = []
}: SendCustomerEmailOptions) {
  const transporter = createTransporter(config);
  const attachments: Mail.Attachment[] = [];
  let totalAttachmentBytes = 0;

  for (const attachment of selectedAttachments) {
    const content = await readStoredUploadedFile(attachment.filePath);
    totalAttachmentBytes += content.byteLength;
    attachments.push({
      filename: attachment.fileName || path.basename(attachment.filePath),
      content,
      contentType: getContentTypeFromPath(attachment.fileName || attachment.filePath)
    });
  }

  const logo = await getEmailLogo(config.logoPath);

  if (logo?.attachment) {
    attachments.push(logo.attachment);

    if (Buffer.isBuffer(logo.attachment.content)) {
      totalAttachmentBytes += logo.attachment.content.byteLength;
    }
  }

  const maxAttachmentBytes = getMaxAttachmentBytes();

  if (totalAttachmentBytes > maxAttachmentBytes) {
    throw new Error(
      `Email attachments are ${formatBytes(totalAttachmentBytes)}, which is above the configured ${formatBytes(maxAttachmentBytes)} SMTP-safe limit. Remove some files or raise EMAIL_MAX_ATTACHMENT_MB if your provider supports it.`
    );
  }

  const from = getFromAddress(config);
  const safeBusinessName = escapeHtml(config.businessName);
  const safeCustomerName = customerName ? escapeHtml(customerName) : "there";
  const safeBusinessEmail = config.businessEmail ? escapeHtml(config.businessEmail) : "";
  const safeBusinessWebsite = config.businessWebsite ? escapeHtml(config.businessWebsite) : "";
  const safeSubject = escapeHtml(subject);
  const logoMarkup = logo?.src
    ? `<img src="${escapeHtml(logo.src)}" width="56" height="56" alt="${safeBusinessName}" style="display:block;width:56px;height:56px;border-radius:14px;object-fit:cover;border:1px solid rgba(255,255,255,0.32);" />`
    : `<div style="width:56px;height:56px;border-radius:14px;background:#dfe9ff;color:#0f2460;font-size:22px;line-height:56px;text-align:center;font-weight:700;">${safeBusinessName.slice(0, 1).toUpperCase()}</div>`;
  const attachmentList = selectedAttachments.length
    ? `
                    <div style="border-left:4px solid #3d61c5;background:#f8fbff;padding:14px 16px;margin:0 0 22px;color:#33415f;font-size:14px;line-height:1.6;">
                      <div style="font-weight:700;color:#12203f;margin-bottom:8px;">Attached files</div>
                      ${selectedAttachments
                        .map(
                          (attachment) =>
                            `<div style="padding:4px 0;">${escapeHtml(attachment.fileName || path.basename(attachment.filePath))}</div>`
                        )
                        .join("")}
                    </div>`
    : "";
  const contactLine = [safeBusinessWebsite, safeBusinessEmail]
    .filter(Boolean)
    .join(" | ");
  const text = [
    `Hi ${customerName || "there"},`,
    "",
    message.trim() || "We wanted to get in touch with an update.",
    "",
    selectedAttachments.length
      ? `Attached files: ${selectedAttachments.map((attachment) => attachment.fileName).join(", ")}`
      : "",
    "",
    `Sent by ${config.businessName}`
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safeSubject}</title>
      </head>
      <body style="margin:0;padding:0;background:#eef3fb;font-family:Arial,Helvetica,sans-serif;color:#12203f;">
        <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">
          ${safeSubject} from ${safeBusinessName}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef3fb;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:collapse;background:#ffffff;border:1px solid #d8e0f1;">
                <tr>
                  <td style="background:#0f2460;padding:26px 28px;color:#ffffff;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      <tr>
                        <td width="68" valign="middle">${logoMarkup}</td>
                        <td valign="middle">
                          <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#dfe9ff;font-weight:700;">Customer message</div>
                          <div style="font-size:25px;line-height:1.25;font-weight:700;margin-top:7px;">${safeBusinessName}</div>
                          ${contactLine ? `<div style="font-size:13px;line-height:1.6;color:#dfe9ff;margin-top:5px;">${contactLine}</div>` : ""}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#0f2460;font-weight:700;margin:0 0 12px;">${safeSubject}</div>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#33415f;">Hi ${safeCustomerName},</p>
                    <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#33415f;">${formatEmailMessage(message, "We wanted to get in touch with an update.")}</p>

                    ${attachmentList}

                    <p style="margin:0;color:#5c6885;font-size:13px;line-height:1.7;">
                      You can reply to this email if anything needs to be adjusted.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px;background:#f8fbff;border-top:1px solid #dbe4f3;color:#5c6885;font-size:12px;line-height:1.6;text-align:center;">
                    Sent by ${safeBusinessName}${contactLine ? ` | ${contactLine}` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    await transporter.verify();
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP error.";

    if (/ECONNRESET|socket hang up|connection/i.test(message)) {
      throw new Error(
        `SMTP connection failed (${message}). Check SMTP host, port, SSL/TLS mode, and whether your provider allows SMTP from this server.`
      );
    }

    throw error;
  }
}

export async function readUploadedFile(relativePath: string) {
  return readStoredUploadedFile(relativePath);
}
