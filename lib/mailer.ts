import fs from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";

import { decryptValue } from "@/lib/crypto";

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
  botFilePath?: string | null;
  botFileName?: string | null;
};

export async function sendInvoiceEmail({
  config,
  to,
  subject,
  message,
  invoicePdf,
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
      filename: "invoice.pdf",
      content: invoicePdf
    }
  ];

  if (botFilePath) {
    attachments.push({
      filename: botFileName || path.basename(botFilePath),
      path: path.join(process.cwd(), "public", botFilePath.replace(/^\/+/, ""))
    });
  }

  const from = config.smtpFromName
    ? `"${config.smtpFromName}" <${config.businessEmail || config.smtpUser}>`
    : config.businessEmail || config.smtpUser;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f8ff;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d8e0f1;">
        <div style="height:10px;background:#0f2460;"></div>
        <div style="padding:28px;">
          <h1 style="margin:0 0 12px;color:#0f2460;font-size:24px;">${config.businessName}</h1>
          <p style="margin:0 0 16px;color:#33415f;line-height:1.7;">${message}</p>
          <p style="margin:0;color:#5c6885;line-height:1.7;">
            Attached: invoice PDF${botFileName ? ` and ${botFileName}` : ""}.
          </p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments
  });
}

export async function readUploadedFile(relativePath: string) {
  const filePath = path.join(process.cwd(), "public", relativePath.replace(/^\/+/, ""));
  return fs.readFile(filePath);
}
