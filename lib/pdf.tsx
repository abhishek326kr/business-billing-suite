import "server-only";

import path from "path";
import PDFDocument from "pdfkit";
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
  const customerAddress = getCustomerAddress(invoice);

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
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        html, body { width: 210mm; min-height: 297mm; margin: 0; background: #fff; }
        body { font-family: Arial, Helvetica, sans-serif; color: #12203f; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .sheet { background: #fff; width: 210mm; min-height: 297mm; margin: 0; display: flex; flex-direction: column; overflow: hidden; }
        .bar { height: 7mm; background: #0f2460; }
        .accent { height: 2px; background: #3d61c5; }
        .body { flex: 1; padding: 12mm 14mm 8mm; }
        .row { display: flex; justify-content: space-between; gap: 24px; }
        .brand { display: flex; gap: 16px; align-items: center; }
        .logo { width: 20mm; height: 20mm; border-radius: 6px; border: 1px solid #d4ddf0; object-fit: cover; background: #eff4ff; }
        .headline { color: #0f2460; font-size: 34px; font-weight: 700; line-height: 1; }
        .subhead { font-size: 14px; color: #33415f; }
        .divider { height: 1px; background: #dbe4f3; margin: 22px 0; }
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
        .footer { padding: 0 14mm 9mm; text-align: center; font-size: 13px; color: #52607f; }
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

function getCustomerAddress(invoice: InvoicePdfData) {
  return [
    invoice.customer.address,
    invoice.customer.city,
    invoice.customer.state,
    invoice.customer.country,
    invoice.customer.pincode
  ]
    .filter(Boolean)
    .join(", ");
}

function generateFallbackInvoicePdf(invoice: InvoicePdfData) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 42,
      bufferPages: false
    });
    const chunks: Buffer[] = [];
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const rightColumn = pageWidth - doc.page.margins.right - 190;
    const customerAddress = getCustomerAddress(invoice);
    const amount = formatCurrency(invoice.amount, invoice.currency);
    const isPaid = invoice.status.toLowerCase() === "paid";

    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.rect(0, 0, pageWidth, 28).fill("#0f2460");
    doc.rect(0, 28, pageWidth, 3).fill("#3d61c5");

    doc
      .fillColor("#0f2460")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(invoice.business.businessName, left, 58, { width: 300 });

    doc
      .fillColor("#52607f")
      .fontSize(10)
      .font("Helvetica")
      .text(invoice.business.website || "Website not set", left, 88, { width: 300 })
      .text(invoice.business.email || "Email not set", left, 104, { width: 300 });

    doc
      .fillColor("#0f2460")
      .fontSize(34)
      .font("Helvetica-Bold")
      .text("INVOICE", rightColumn, 58, { width: 190, align: "right" });

    doc
      .fillColor("#33415f")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(invoice.invoiceNumber, rightColumn, 98, { width: 190, align: "right" })
      .font("Helvetica")
      .text(formatDate(invoice.date), rightColumn, 116, { width: 190, align: "right" });

    doc.moveTo(left, 150).lineTo(left + contentWidth, 150).strokeColor("#dbe4f3").stroke();

    doc
      .roundedRect(left, 168, 76, 24, 12)
      .fill(isPaid ? "#e8fff1" : "#fff0f0")
      .fillColor(isPaid ? "#13743b" : "#b42318")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(isPaid ? "PAID" : "UNPAID", left, 175, { width: 76, align: "center" });

    doc
      .fillColor("#0f2460")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("BILL TO", left, 220);

    doc
      .fillColor("#12203f")
      .fontSize(16)
      .text(invoice.customer.name, left, 240, { width: 260 });

    doc
      .fillColor("#52607f")
      .fontSize(10)
      .font("Helvetica")
      .text(customerAddress || "Address not provided", left, 265, { width: 260, lineGap: 4 })
      .text(invoice.customer.phone || "Phone not provided", left, doc.y + 8, { width: 260 })
      .text(invoice.customer.email, left, doc.y + 4, { width: 260 });

    doc
      .fillColor("#0f2460")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("SIGNATURE", rightColumn, 220, { width: 190 });

    doc
      .roundedRect(rightColumn, 240, 190, 58, 8)
      .strokeColor("#cbd7ef")
      .dash(4, { space: 4 })
      .stroke()
      .undash();

    doc
      .fillColor("#0f2460")
      .fontSize(15)
      .font("Helvetica-Oblique")
      .text(invoice.signatureName || "Authorized signature", rightColumn + 10, 262, {
        width: 170,
        align: "center"
      });

    const tableTop = 350;
    const rowHeight = 52;

    doc.rect(left, tableTop, contentWidth, 30).fill("#0f2460");
    doc
      .fillColor("#ffffff")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("PRODUCT NAME", left + 12, tableTop + 10, { width: 145 })
      .text("SERVICES INCLUDED", left + 170, tableTop + 10, { width: 150 })
      .text("VALIDITY", left + 330, tableTop + 10, { width: 80 })
      .text("AMOUNT", left + 420, tableTop + 10, { width: 90, align: "right" });

    doc.rect(left, tableTop + 30, contentWidth, rowHeight).fill("#f8fbff");
    doc
      .fillColor("#12203f")
      .fontSize(10)
      .font("Helvetica")
      .text(invoice.productName, left + 12, tableTop + 46, { width: 145 })
      .text(invoice.services || "Included as agreed", left + 170, tableTop + 46, { width: 150 })
      .text(invoice.validity || "Standard", left + 330, tableTop + 46, { width: 80 })
      .font("Helvetica-Bold")
      .text(amount, left + 420, tableTop + 46, { width: 90, align: "right" });

    const summaryLeft = pageWidth - doc.page.margins.right - 220;
    const summaryTop = tableTop + 120;

    doc
      .fillColor("#12203f")
      .font("Helvetica")
      .fontSize(11)
      .text("Subtotal", summaryLeft, summaryTop)
      .text(amount, summaryLeft + 110, summaryTop, { width: 110, align: "right" })
      .text("Tax", summaryLeft, summaryTop + 26)
      .text("0%", summaryLeft + 110, summaryTop + 26, { width: 110, align: "right" });

    doc.rect(summaryLeft, summaryTop + 52, 220, 34).fill("#0f2460");
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("Total", summaryLeft + 12, summaryTop + 63)
      .text(amount, summaryLeft + 110, summaryTop + 63, { width: 98, align: "right" });

    doc
      .fillColor("#52607f")
      .font("Helvetica")
      .fontSize(9)
      .text([invoice.business.website, invoice.business.email].filter(Boolean).join(" | "), left, 770, {
        width: contentWidth,
        align: "center"
      });

    doc.end();
  });
}

export async function generateInvoicePdf(invoice: InvoicePdfData) {
  const html = getInvoiceHtml(invoice);
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    return await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      }
    });
  } catch (error) {
    console.error("Puppeteer PDF generation failed; using fallback PDF renderer.", error);
    return generateFallbackInvoicePdf(invoice);
  } finally {
    await browser?.close();
  }
}
