import "server-only";

import path from "path";
import puppeteer from "puppeteer";
import { pathToFileURL } from "url";

import { getUploadedFilePath, getUploadedPublicUrl, isR2StorageConfigured } from "@/lib/uploads";
import { formatCurrency, formatDate } from "@/lib/utils";

type InvoicePdfData = {
  invoiceNumber: string;
  date: Date | string;
  status: string;
  amount: number;
  currency: string;
  productName: string;
  services?: string | null;
  validity?: string | null;
  signaturePath?: string | null;
  signatureName?: string | null;
  customer: {
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    pincode?: string | null;
  };
  business: {
    businessName: string;
    website?: string | null;
    email?: string | null;
    address?: string | null;
    logoPath?: string | null;
  };
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPublicAssetUrl(assetPath: string) {
  if (/^(data:|https?:\/\/)/.test(assetPath)) {
    return assetPath;
  }

  if (assetPath.startsWith("/uploads/")) {
    const publicUrl = getUploadedPublicUrl(assetPath);

    if (publicUrl) {
      return publicUrl;
    }

    if (isR2StorageConfigured() && process.env.NEXTAUTH_URL) {
      return new URL(assetPath, process.env.NEXTAUTH_URL).href;
    }

    return pathToFileURL(getUploadedFilePath(assetPath)).href;
  }

  return pathToFileURL(
    path.join(process.cwd(), "public", assetPath.replace(/^\/+/, ""))
  ).href;
}

function getInvoiceHtml(invoice: InvoicePdfData) {
  const isPaid = invoice.status.toLowerCase() === "paid";
  const customerAddress = [
    invoice.customer.address,
    invoice.customer.city,
    invoice.customer.state,
    invoice.customer.country,
    invoice.customer.pincode
  ]
    .filter(Boolean)
    .join(", ");

  const logo = invoice.business.logoPath
    ? `<img src="${escapeHtml(getPublicAssetUrl(invoice.business.logoPath))}" alt="${escapeHtml(invoice.business.businessName)}" class="logo" />`
    : `<div class="logo"></div>`;
  const signature = invoice.signaturePath
    ? `<img src="${escapeHtml(getPublicAssetUrl(invoice.signaturePath))}" alt="${escapeHtml(invoice.signatureName || "Authorized signature")}" class="signature-image" />`
    : invoice.signatureName
      ? `<div class="signature-text">${escapeHtml(invoice.signatureName)}</div>`
      : "";

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(invoice.invoiceNumber)}</title>
      <style>
        body { margin: 0; background: #eef3fb; font-family: Arial, Helvetica, sans-serif; color: #12203f; }
        .sheet { background: #fff; max-width: 920px; margin: 0 auto; border: 1px solid #dbe4f3; box-shadow: 0 14px 34px rgba(15,36,96,0.08); }
        .bar { height: 7mm; background: #0f2460; }
        .accent { height: 2px; background: #3d61c5; }
        .body { padding: 32px; }
        .row { display: flex; justify-content: space-between; gap: 24px; }
        .brand { display: flex; gap: 16px; align-items: center; }
        .logo { width: 64px; height: 64px; border-radius: 16px; border: 1px solid #d4ddf0; object-fit: cover; background: #eff4ff; }
        .headline { color: #0f2460; font-size: 34px; font-weight: 700; line-height: 1; }
        .subhead { font-size: 14px; color: #33415f; }
        .divider { height: 1px; background: #dbe4f3; margin: 24px 0; }
        .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 700; }
        .paid { background: #e8fff1; color: #13743b; }
        .unpaid { background: #fff0f0; color: #b42318; }
        .section-title { font-size: 12px; letter-spacing: 0.12em; color: #0f2460; font-weight: 700; margin-bottom: 10px; }
        .muted { color: #5d6985; }
        .signature-line { height: 1px; background: #cbd7ef; margin: 14px 0 10px; }
        .signature-box { height: 72px; border: 1px dashed #cbd7ef; border-radius: 12px; background: #f8fbff; display: flex; align-items: center; justify-content: center; padding: 8px; overflow: hidden; }
        .signature-image { max-width: 100%; max-height: 100%; object-fit: contain; }
        .signature-text { color: #0f2460; font-size: 22px; font-family: "Brush Script MT", "Segoe Script", cursive; }
        table { width: 100%; border-collapse: collapse; margin-top: 28px; }
        thead th { background: #0f2460; color: #fff; padding: 14px; font-size: 12px; text-align: left; letter-spacing: 0.04em; }
        tbody td { padding: 16px 14px; border-bottom: 1px solid #dbe4f3; vertical-align: top; font-size: 14px; }
        tbody tr:nth-child(even) td { background: #dfe9ff; }
        .summary { margin-left: auto; width: 320px; margin-top: 28px; }
        .summary-row { display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #dbe4f3; background: #f8fbff; }
        .summary-row.total { background: #0f2460; color: #fff; font-weight: 700; }
        .footer { padding: 22px 32px 28px; text-align: center; font-size: 13px; color: #52607f; }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="bar"></div>
        <div class="accent"></div>
        <div class="body">
          <div class="row">
            <div class="brand">
              ${logo}
              <div>
                <div style="font-size:24px;font-weight:700;color:#0f2460;">${escapeHtml(invoice.business.businessName)}</div>
                <div class="subhead">${escapeHtml(invoice.business.website || "Website not set")}</div>
                <div class="subhead">${escapeHtml(invoice.business.email || "Email not set")}</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div class="headline">INVOICE</div>
              <div style="font-size:20px;font-weight:700;color:#0f2460;margin-top:8px;">${escapeHtml(invoice.invoiceNumber)}</div>
              <div class="subhead" style="margin-top:8px;">Date: ${escapeHtml(formatDate(invoice.date))}</div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="badge ${isPaid ? "paid" : "unpaid"}">${isPaid ? "✓ PAID" : "UNPAID"}</div>
          <div class="row" style="margin-top:24px;">
            <div style="flex:1;">
              <div class="section-title">BILL TO</div>
              <div style="font-size:18px;font-weight:700;">${escapeHtml(invoice.customer.name)}</div>
              <div class="muted" style="margin-top:8px;line-height:1.7;">
                <div>${escapeHtml(customerAddress || "Address not provided")}</div>
                <div>${escapeHtml(invoice.customer.phone || "Phone not provided")}</div>
                <div>${escapeHtml(invoice.customer.email)}</div>
              </div>
            </div>
            <div style="flex:1;max-width:320px;">
              <div class="section-title">SIGNATURE</div>
              <div class="signature-box">${signature}</div>
              <div class="signature-line"></div>
              <div class="muted" style="font-size:12px;">${escapeHtml(invoice.signatureName || "Authorized signature")}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>PRODUCT NAME</th>
                <th>SERVICES INCLUDED</th>
                <th>VALIDITY</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escapeHtml(invoice.productName)}</td>
                <td>${escapeHtml(invoice.services || "Included as agreed")}</td>
                <td>${escapeHtml(invoice.validity || "Standard")}</td>
                <td>${escapeHtml(formatCurrency(invoice.amount, invoice.currency))}</td>
              </tr>
            </tbody>
          </table>
          <div class="summary">
            <div class="summary-row"><span>Subtotal</span><span>${escapeHtml(formatCurrency(invoice.amount, invoice.currency))}</span></div>
            <div class="summary-row"><span>Tax</span><span>0%</span></div>
            <div class="summary-row total"><span>Total</span><span>${escapeHtml(formatCurrency(invoice.amount, invoice.currency))}</span></div>
          </div>
        </div>
        <div class="footer">${escapeHtml(
          [invoice.business.website, invoice.business.email].filter(Boolean).join(" | ")
        )}</div>
      </div>
    </body>
  </html>`;
}

export async function generateInvoicePdf(invoice: InvoicePdfData) {
  const html = getInvoiceHtml(invoice);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      }
    });
  } finally {
    await browser.close();
  }
}
