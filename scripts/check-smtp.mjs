import nodemailer from "nodemailer";

const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  console.error("Usage: SMTP_HOST=smtp.example.com SMTP_PORT=587 SMTP_USER=user SMTP_PASS=pass npm run smtp:check");
  process.exit(1);
}

const port = Number(process.env.SMTP_PORT);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  requireTLS: port === 587,
  connectionTimeout: 30_000,
  greetingTimeout: 30_000,
  socketTimeout: 60_000,
  tls: {
    servername: process.env.SMTP_HOST
  },
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

try {
  await transporter.verify();
  console.log("SMTP connection verified.");
} catch (error) {
  console.error(error);
  process.exit(1);
}
