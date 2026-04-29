import React from "react";

import { formatCurrency, formatDate } from "@/lib/utils";

type InvoiceTemplateData = {
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

const primary = "#0f2460";
const accent = "#dfe9ff";

export function InvoiceTemplate({
  invoice
}: {
  invoice: InvoiceTemplateData;
}) {
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

  return (
    <div className="invoice-sheet">
      <style>{`
        .invoice-sheet {
          background: #ffffff;
          color: #12203f;
          font-family: Arial, Helvetica, sans-serif;
          width: 100%;
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          border: 1px solid #dbe4f3;
          box-shadow: 0 14px 34px rgba(15, 36, 96, 0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .bar { height: 7mm; background: ${primary}; }
        .accent-line { height: 2px; background: #3d61c5; }
        .invoice-body {
          flex: 1;
          padding: 12mm 14mm 8mm;
        }
        .row { display: flex; justify-content: space-between; gap: 24px; }
        .row > div { min-width: 0; }
        .brand { display: flex; gap: 16px; align-items: center; }
        .brand > div { min-width: 0; overflow-wrap: anywhere; }
        .logo {
          width: 20mm;
          height: 20mm;
          border-radius: 6px;
          border: 1px solid #d4ddf0;
          object-fit: cover;
          background: #eff4ff;
        }
        .muted { color: #5d6985; }
        .headline { color: ${primary}; font-size: 34px; font-weight: 700; line-height: 1; }
        .subhead { font-size: 14px; color: #33415f; }
        .divider { height: 1px; background: #dbe4f3; margin: 24px 0; }
        .badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 700;
        }
        .badge-paid { background: #e8fff1; color: #13743b; }
        .badge-unpaid { background: #fff0f0; color: #b42318; }
        .section-title {
          font-size: 12px;
          letter-spacing: 0.12em;
          color: ${primary};
          font-weight: 700;
          margin-bottom: 10px;
        }
        .signature-line { height: 1px; background: #cbd7ef; margin: 14px 0 10px; }
        .signature-box {
          height: 72px;
          border: 1px dashed #cbd7ef;
          border-radius: 12px;
          background: #f8fbff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          overflow: hidden;
        }
        .signature-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .signature-text {
          color: ${primary};
          font-size: 22px;
          font-family: "Brush Script MT", "Segoe Script", cursive;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 28px;
        }
        thead th {
          background: ${primary};
          color: #ffffff;
          padding: 14px;
          font-size: 12px;
          text-align: left;
          letter-spacing: 0.04em;
        }
        tbody td {
          padding: 16px 14px;
          border-bottom: 1px solid #dbe4f3;
          vertical-align: top;
          font-size: 14px;
          overflow-wrap: anywhere;
        }
        tbody tr:nth-child(even) td { background: ${accent}; }
        .summary {
          margin-left: auto;
          width: 320px;
          margin-top: 28px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 16px;
          border-bottom: 1px solid #dbe4f3;
          background: #f8fbff;
        }
        .summary-row span:last-child { text-align: right; }
        .summary-row.total {
          background: ${primary};
          color: #ffffff;
          font-weight: 700;
        }
        .footer {
          padding: 0 14mm 9mm;
          text-align: center;
          font-size: 13px;
          color: #52607f;
        }
        @media (max-width: 720px) {
          .invoice-sheet { min-height: auto; }
          .invoice-body { padding: 24px; }
          .row { flex-direction: column; }
          .brand { align-items: flex-start; }
          .logo { width: 56px; height: 56px; }
          .headline { font-size: 28px; }
          .headline, .subhead { text-align: left; }
          table, thead, tbody, tr, td { display: block; }
          thead { display: none; }
          tbody td {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 12px 0;
          }
          tbody td::before {
            color: ${primary};
            content: "";
            flex: 0 0 42%;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.04em;
          }
          tbody td:nth-child(1)::before { content: "PRODUCT"; }
          tbody td:nth-child(2)::before { content: "SERVICES"; }
          tbody td:nth-child(3)::before { content: "VALIDITY"; }
          tbody td:nth-child(4)::before { content: "AMOUNT"; }
          .summary { width: 100%; }
          .footer { padding: 0 24px 24px; }
        }
      `}</style>

      <div className="bar" />
      <div className="accent-line" />

      <div className="invoice-body">
        <div className="row">
          <div className="brand">
            {invoice.business.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={invoice.business.logoPath}
                alt={invoice.business.businessName}
                className="logo"
              />
            ) : (
              <div className="logo" />
            )}
            <div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: primary }}>
                {invoice.business.businessName}
              </div>
              <div className="subhead">{invoice.business.website || "Website not set"}</div>
              <div className="subhead">{invoice.business.email || "Email not set"}</div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div className="headline">INVOICE</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: primary, marginTop: "8px" }}>
              {invoice.invoiceNumber}
            </div>
            <div className="subhead" style={{ marginTop: "8px" }}>
              Date: {formatDate(invoice.date)}
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className={`badge ${isPaid ? "badge-paid" : "badge-unpaid"}`}>
          {isPaid ? "✓ PAID" : "UNPAID"}
        </div>

        <div className="row" style={{ marginTop: "24px" }}>
          <div style={{ flex: 1 }}>
            <div className="section-title">BILL TO</div>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>{invoice.customer.name}</div>
            <div className="muted" style={{ marginTop: "8px", lineHeight: 1.7 }}>
              <div>{customerAddress || "Address not provided"}</div>
              <div>{invoice.customer.phone || "Phone not provided"}</div>
              <div>{invoice.customer.email}</div>
            </div>
          </div>

          <div style={{ flex: 1, maxWidth: "320px" }}>
            <div className="section-title">SIGNATURE</div>
            <div className="signature-box">
              {invoice.signaturePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={invoice.signaturePath}
                  alt={invoice.signatureName || "Authorized signature"}
                  className="signature-image"
                />
              ) : invoice.signatureName ? (
                <div className="signature-text">{invoice.signatureName}</div>
              ) : null}
            </div>
            <div className="signature-line" />
            <div className="muted" style={{ fontSize: "12px" }}>
              {invoice.signatureName || "Authorized signature"}
            </div>
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
              <td>{invoice.productName}</td>
              <td>{invoice.services || "Included as agreed"}</td>
              <td>{invoice.validity || "Standard"}</td>
              <td>{formatCurrency(invoice.amount, invoice.currency)}</td>
            </tr>
          </tbody>
        </table>

        <div className="summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.amount, invoice.currency)}</span>
          </div>
          <div className="summary-row">
            <span>Tax</span>
            <span>0%</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatCurrency(invoice.amount, invoice.currency)}</span>
          </div>
        </div>
      </div>

      <div className="footer">
        {[invoice.business.website, invoice.business.email].filter(Boolean).join(" | ")}
      </div>
    </div>
  );
}
