import "server-only";

import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import puppeteer from "puppeteer";
import { pathToFileURL } from "url";

import { getUploadedFilePath, getUploadedPublicUrl, isR2StorageConfigured } from "@/lib/uploads";
import { getUploadedFile } from "@/lib/uploads";
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

function pdfColor(hex: string) {
  const normalized = hex.replace("#", "");
  return rgb(
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255
  );
}

function safePdfText(value?: string | number | null) {
  return `${value ?? ""}`
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function formatPdfCurrency(amount: number, currency: string) {
  if (currency === "INR") {
    return `INR ${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(amount)}`;
  }

  return safePdfText(formatCurrency(amount, currency));
}

function wrapPdfText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;

    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      line = nextLine;
      continue;
    }

    if (line) {
      lines.push(line);
    }

    line = word;
  }

  if (line) {
    lines.push(line);
  }

  return lines.length ? lines : [""];
}

function drawPdfTextBlock({
  page,
  text,
  x,
  y,
  maxWidth,
  font,
  size,
  color = "#12203f",
  lineHeight = size + 4
}: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  color?: string;
  lineHeight?: number;
}) {
  let currentY = y;

  for (const line of wrapPdfText(text, font, size, maxWidth)) {
    page.drawText(line, {
      x,
      y: currentY,
      size,
      font,
      color: pdfColor(color)
    });
    currentY -= lineHeight;
  }

  return currentY;
}

async function getPdfImageBytes(assetPath?: string | null) {
  if (!assetPath) {
    return null;
  }

  try {
    if (assetPath.startsWith("/uploads/")) {
      const uploaded = await getUploadedFile(assetPath);
      return {
        bytes: uploaded.buffer,
        contentType: uploaded.contentType || ""
      };
    }

    if (/^https?:\/\//.test(assetPath)) {
      const response = await fetch(assetPath);

      if (!response.ok) {
        return null;
      }

      return {
        bytes: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get("content-type") || ""
      };
    }

    return null;
  } catch (error) {
    console.warn(`Unable to load PDF image asset: ${assetPath}`, error);
    return null;
  }
}

async function embedPdfImage(pdfDoc: PDFDocument, assetPath?: string | null) {
  const image = await getPdfImageBytes(assetPath);

  if (!image) {
    return null;
  }

  const contentType = image.contentType.toLowerCase();
  const isPng = contentType.includes("png") || assetPath?.toLowerCase().endsWith(".png");
  const isJpg =
    contentType.includes("jpeg") ||
    contentType.includes("jpg") ||
    assetPath?.toLowerCase().endsWith(".jpg") ||
    assetPath?.toLowerCase().endsWith(".jpeg");

  try {
    if (isPng) {
      return await pdfDoc.embedPng(image.bytes);
    }

    if (isJpg) {
      return await pdfDoc.embedJpg(image.bytes);
    }
  } catch (error) {
    console.warn(`Unable to embed PDF image asset: ${assetPath}`, error);
  }

  return null;
}

async function generateFallbackInvoicePdf(invoice: InvoicePdfData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const width = page.getWidth();
  const height = page.getHeight();
  const left = 42;
  const contentWidth = width - 84;
  const rightColumn = width - 232;
  const amount = formatPdfCurrency(invoice.amount, invoice.currency);
  const customerAddress = getCustomerAddress(invoice) || "Address not provided";
  const isPaid = invoice.status.toLowerCase() === "paid";
  const logoImage = await embedPdfImage(pdfDoc, invoice.business.logoPath);
  const signatureImage = await embedPdfImage(pdfDoc, invoice.signaturePath);

  page.drawRectangle({ x: 0, y: height - 28, width, height: 28, color: pdfColor("#0f2460") });
  page.drawRectangle({ x: 0, y: height - 31, width, height: 3, color: pdfColor("#3d61c5") });

  if (logoImage) {
    const logoSize = 56;
    const scaledLogo = logoImage.scaleToFit(logoSize, logoSize);
    page.drawImage(logoImage, {
      x: left,
      y: 732,
      width: scaledLogo.width,
      height: scaledLogo.height
    });
  } else {
    page.drawRectangle({
      x: left,
      y: 732,
      width: 56,
      height: 56,
      borderWidth: 1,
      borderColor: pdfColor("#d4ddf0"),
      color: pdfColor("#eff4ff")
    });
  }

  const brandLeft = left + 72;
  page.drawText(safePdfText(invoice.business.businessName) || "Business", {
    x: brandLeft,
    y: 758,
    size: 24,
    font: bold,
    color: pdfColor("#0f2460")
  });
  page.drawText(safePdfText(invoice.business.website || "Website not set"), {
    x: brandLeft,
    y: 736,
    size: 10,
    font,
    color: pdfColor("#52607f")
  });
  page.drawText(safePdfText(invoice.business.email || "Email not set"), {
    x: brandLeft,
    y: 720,
    size: 10,
    font,
    color: pdfColor("#52607f")
  });

  page.drawText("INVOICE", {
    x: rightColumn,
    y: 754,
    size: 34,
    font: bold,
    color: pdfColor("#0f2460")
  });
  page.drawText(safePdfText(invoice.invoiceNumber), {
    x: rightColumn,
    y: 728,
    size: 11,
    font: bold,
    color: pdfColor("#33415f")
  });
  page.drawText(safePdfText(formatDate(invoice.date)), {
    x: rightColumn,
    y: 712,
    size: 10,
    font,
    color: pdfColor("#33415f")
  });

  page.drawLine({
    start: { x: left, y: 680 },
    end: { x: left + contentWidth, y: 680 },
    thickness: 1,
    color: pdfColor("#dbe4f3")
  });

  page.drawRectangle({
    x: left,
    y: 650,
    width: 76,
    height: 24,
    color: pdfColor(isPaid ? "#e8fff1" : "#fff0f0")
  });
  page.drawText(isPaid ? "PAID" : "UNPAID", {
    x: left + 18,
    y: 657,
    size: 10,
    font: bold,
    color: pdfColor(isPaid ? "#13743b" : "#b42318")
  });

  page.drawText("BILL TO", {
    x: left,
    y: 612,
    size: 10,
    font: bold,
    color: pdfColor("#0f2460")
  });
  page.drawText(safePdfText(invoice.customer.name) || "Customer", {
    x: left,
    y: 590,
    size: 16,
    font: bold,
    color: pdfColor("#12203f")
  });
  let customerY = drawPdfTextBlock({
    page,
    text: customerAddress,
    x: left,
    y: 568,
    maxWidth: 260,
    font,
    size: 10,
    color: "#52607f"
  });
  customerY -= 8;
  page.drawText(safePdfText(invoice.customer.phone || "Phone not provided"), {
    x: left,
    y: customerY,
    size: 10,
    font,
    color: pdfColor("#52607f")
  });
  page.drawText(safePdfText(invoice.customer.email), {
    x: left,
    y: customerY - 16,
    size: 10,
    font,
    color: pdfColor("#52607f")
  });

  page.drawText("SIGNATURE", {
    x: rightColumn,
    y: 612,
    size: 10,
    font: bold,
    color: pdfColor("#0f2460")
  });
  page.drawRectangle({
    x: rightColumn,
    y: 532,
    width: 190,
    height: 58,
    borderWidth: 1,
    borderColor: pdfColor("#cbd7ef"),
    color: pdfColor("#f8fbff")
  });

  if (signatureImage) {
    const scaledSignature = signatureImage.scaleToFit(166, 42);
    page.drawImage(signatureImage, {
      x: rightColumn + (190 - scaledSignature.width) / 2,
      y: 540 + (42 - scaledSignature.height) / 2,
      width: scaledSignature.width,
      height: scaledSignature.height
    });
  } else {
    page.drawText(safePdfText(invoice.signatureName || "Authorized signature"), {
      x: rightColumn + 18,
      y: 555,
      size: 14,
      font: italic,
      color: pdfColor("#0f2460")
    });
  }

  const tableTop = 465;
  page.drawRectangle({ x: left, y: tableTop, width: contentWidth, height: 30, color: pdfColor("#0f2460") });
  page.drawText("PRODUCT NAME", { x: left + 12, y: tableTop + 11, size: 9, font: bold, color: pdfColor("#ffffff") });
  page.drawText("SERVICES INCLUDED", { x: left + 170, y: tableTop + 11, size: 9, font: bold, color: pdfColor("#ffffff") });
  page.drawText("VALIDITY", { x: left + 330, y: tableTop + 11, size: 9, font: bold, color: pdfColor("#ffffff") });
  page.drawText("AMOUNT", { x: left + 430, y: tableTop + 11, size: 9, font: bold, color: pdfColor("#ffffff") });
  page.drawRectangle({ x: left, y: tableTop - 54, width: contentWidth, height: 54, color: pdfColor("#f8fbff") });

  drawPdfTextBlock({ page, text: invoice.productName, x: left + 12, y: tableTop - 20, maxWidth: 145, font, size: 10 });
  drawPdfTextBlock({ page, text: invoice.services || "Included as agreed", x: left + 170, y: tableTop - 20, maxWidth: 150, font, size: 10 });
  drawPdfTextBlock({ page, text: invoice.validity || "Standard", x: left + 330, y: tableTop - 20, maxWidth: 80, font, size: 10 });
  page.drawText(amount, { x: left + 420, y: tableTop - 20, size: 10, font: bold, color: pdfColor("#12203f") });

  const summaryLeft = width - 262;
  const summaryTop = 335;
  page.drawText("Subtotal", { x: summaryLeft, y: summaryTop, size: 11, font, color: pdfColor("#12203f") });
  page.drawText(amount, { x: summaryLeft + 110, y: summaryTop, size: 11, font, color: pdfColor("#12203f") });
  page.drawText("Tax", { x: summaryLeft, y: summaryTop - 26, size: 11, font, color: pdfColor("#12203f") });
  page.drawText("0%", { x: summaryLeft + 110, y: summaryTop - 26, size: 11, font, color: pdfColor("#12203f") });
  page.drawRectangle({ x: summaryLeft, y: summaryTop - 74, width: 220, height: 34, color: pdfColor("#0f2460") });
  page.drawText("Total", { x: summaryLeft + 12, y: summaryTop - 63, size: 11, font: bold, color: pdfColor("#ffffff") });
  page.drawText(amount, { x: summaryLeft + 110, y: summaryTop - 63, size: 11, font: bold, color: pdfColor("#ffffff") });

  const footer = safePdfText([invoice.business.website, invoice.business.email].filter(Boolean).join(" | "));
  const footerWidth = font.widthOfTextAtSize(footer, 9);
  page.drawText(footer, {
    x: Math.max(left, (width - footerWidth) / 2),
    y: 34,
    size: 9,
    font,
    color: pdfColor("#52607f")
  });

  return Buffer.from(await pdfDoc.save());
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
