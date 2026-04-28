import path from "path";
import nodemailer from "nodemailer";

import { decryptValue } from "@/lib/crypto";
import { readUploadedFile as readStoredUploadedFile } from "@/lib/uploads";
import { formatCurrency, formatDate } from "@/lib/utils";

type MailerConfig = {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFromName?: string | null;
  businessEmail?: string | null;
  businessName: string;
};

type SendInvoiceEmailOptions = {
  config: MailerConfig;
  to: string;
  subject: string;
  message: string;
  invoicePdf: Buffer;
  invoiceNumber?: string;
  invoiceDate?: Date | string;
  invoiceAmount?: number;
  invoiceCurrency?: string;
  customerName?: string;
  botFilePath?: string | null;
  botFileName?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEmailMessage(message: string) {
  const trimmed = message.trim() || "Please find your invoice attached.";
  return escapeHtml(trimmed).replace(/\r?\n/g, "<br />");
}

function safeAttachmentName(value?: string) {
  return `${value || "invoice"}`.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export async function sendInvoiceEmail({
  config,
  to,
  subject,
  message,
  invoicePdf,
  invoiceNumber,
  invoiceDate,
  invoiceAmount,
  invoiceCurrency,
  customerName,
  botFilePath,
  botFileName
}: SendInvoiceEmailOptions) {
  if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPass) {
    throw new Error("SMTP settings are incomplete.");
  }

  const transporter = nodemailer.createTransport({
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

  const attachments: {
    filename: string;
    content?: Buffer;
    path?: string;
  }[] = [
    {
      filename: `${safeAttachmentName(invoiceNumber)}.pdf`,
      content: invoicePdf
    }
  ];

  if (botFilePath) {
    attachments.push({
      filename: botFileName || path.basename(botFilePath),
      content: await readStoredUploadedFile(botFilePath)
    });
  }

  const from = config.smtpFromName
    ? `"${config.smtpFromName}" <${config.businessEmail || config.smtpUser}>`
    : config.businessEmail || config.smtpUser;
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
  const attachmentCount = botFileName ? "2 attachments" : "1 attachment";

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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;border:1px solid #d8e0f1;">
                <tr>
                  <td style="background:#0f2460;padding:24px 28px;color:#ffffff;">
                    <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#dfe9ff;font-weight:700;">Invoice</div>
                    <div style="font-size:24px;line-height:1.25;font-weight:700;margin-top:8px;">${safeBusinessName}</div>
                    ${safeBusinessEmail ? `<div style="font-size:13px;line-height:1.6;color:#dfe9ff;margin-top:6px;">${safeBusinessEmail}</div>` : ""}
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

export async function readUploadedFile(relativePath: string) {
  return readStoredUploadedFile(relativePath);
}
