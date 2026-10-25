import { Platform, Alert } from 'react-native';

export interface InvoicePrintData {
  id?: string;
  invoiceNumber: string;
  customerName?: string;
  customerEmail?: string;
  invoiceDate?: string;
  dueDate?: string;
  status?: string;
  paidDate?: string;
  product?: string;
  gallons?: number | string;
  amount: number | string;
  deliveryId?: string;
  blockIds?: string[];
  ranchName?: string;
  tankName?: string;
  quickbooksInvoiceId?: string;
}

export const printInvoiceDocument = (inv: InvoicePrintData) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    Alert.alert('PDF Export', `Invoice ${inv.invoiceNumber} document generated for printing.`);
    return;
  }

  const invoiceNumber = inv.invoiceNumber || 'INV-2026';
  const customerName = inv.customerName || 'Sierra Agri Group';
  const customerEmail = inv.customerEmail || 'customer@renu.com';
  const invoiceDate = inv.invoiceDate || new Date().toISOString().split('T')[0];
  const dueDate = inv.dueDate || 'Net 30 Days';
  const status = (inv.status || 'Open').toUpperCase();
  const isPaid = status === 'PAID';
  const product = inv.product || 'ReNu N-32% K-28% Blend';
  const gallons = inv.gallons ? Number(inv.gallons).toLocaleString() : '—';
  const amountNum = Number(inv.amount) || 0;
  const formattedAmount = amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const deliveryRef = inv.deliveryId ? `#${inv.deliveryId}` : '—';
  const blocks = Array.isArray(inv.blockIds) && inv.blockIds.length > 0 ? inv.blockIds.join(', ') : 'All Assigned Ranch Blocks';
  const qbId = inv.quickbooksInvoiceId || `QB-${inv.id || '10842'}`;
  const paidDateText = inv.paidDate ? ` (Paid on ${inv.paidDate})` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoiceNumber} - ReNu-Biome Inc.</title>
  <style>
    @page {
      size: letter portrait;
      margin: 14mm 16mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      background: #FFFFFF !important;
      color: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
    }
    .invoice-wrapper {
      max-width: 820px;
      margin: 0 auto;
      padding: 10px 0;
      background: #FFFFFF;
    }
    .top-header {
      width: 100%;
      border-bottom: 3px solid #0C6054;
      padding-bottom: 16px;
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-section {
      flex: 1;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 900;
      color: #0C6054;
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 11px;
      font-weight: 800;
      color: #F07E42;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 3px;
    }
    .brand-meta {
      font-size: 11.5px;
      color: #475569;
      margin-top: 4px;
      line-height: 1.4;
    }
    .invoice-header-meta {
      text-align: right;
    }
    .invoice-word {
      font-size: 32px;
      font-weight: 900;
      color: #0F172A;
      letter-spacing: 1px;
      line-height: 1;
    }
    .invoice-code {
      font-size: 16px;
      font-weight: 800;
      color: #0C6054;
      margin-top: 4px;
    }
    .status-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-paid {
      background: #F0FDF4;
      color: #166534;
      border: 1px solid #BBF7D0;
    }
    .status-open {
      background: #FFF7ED;
      color: #C2410C;
      border: 1px solid #FFEDD5;
    }
    .info-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 22px;
    }
    .info-card {
      flex: 1;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .card-heading {
      font-size: 11px;
      font-weight: 800;
      color: #0C6054;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
    }
    .card-body p {
      font-size: 12px;
      color: #334155;
      margin-bottom: 4px;
    }
    .card-body strong {
      color: #0F172A;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
    }
    .items-table th {
      background: #0C6054;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
    }
    .items-table th.center { text-align: center; }
    .items-table th.right { text-align: right; }
    .items-table td {
      padding: 14px 12px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 12.5px;
      vertical-align: top;
    }
    .items-table td.center { text-align: center; }
    .items-table td.right { text-align: right; }
    .item-title {
      font-weight: 800;
      font-size: 13.5px;
      color: #0F172A;
    }
    .item-desc {
      font-size: 11.5px;
      color: #64748B;
      margin-top: 3px;
    }
    .summary-grid {
      display: flex;
      gap: 20px;
      margin-bottom: 22px;
    }
    .remittance-card {
      flex: 1.2;
      background: #F8FAFC;
      border: 1px dashed #CBD5E1;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .remit-title {
      font-size: 11px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .remit-details {
      font-size: 11.5px;
      color: #64748B;
      line-height: 1.5;
    }
    .totals-card {
      flex: 1;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      background: #FFFFFF;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 14px;
      font-size: 12px;
      border-bottom: 1px solid #F1F5F9;
    }
    .totals-row.grand-total {
      background: #F0FDFA;
      border-top: 2px solid #0C6054;
      border-bottom: none;
      padding: 12px 14px;
    }
    .grand-label {
      font-size: 14px;
      font-weight: 800;
      color: #083F38;
    }
    .grand-value {
      font-size: 19px;
      font-weight: 900;
      color: #0C6054;
    }
    .qr-footer-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 10px;
    }
    .qr-image {
      width: 72px;
      height: 72px;
      background: #FFFFFF;
      padding: 4px;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .qr-text-title {
      font-size: 12px;
      font-weight: 800;
      color: #0C6054;
    }
    .qr-text-body {
      font-size: 11px;
      color: #64748B;
      line-height: 1.4;
      margin-top: 3px;
    }
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #94A3B8;
      margin-top: 18px;
      letter-spacing: 0.3px;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="top-header">
      <div class="brand-section">
        <div class="brand-title">ReNu-Biome Inc.</div>
        <div class="brand-tagline">Farmer's Pride · Central Valley Operations</div>
        <div class="brand-meta">Agricultural Soil Nutrition & Biological Plant Formulations</div>
        <div class="brand-meta">Direct Inquiries: (559) 555-0199 · Email: accounting@renu-biome.com</div>
      </div>
      <div class="invoice-header-meta">
        <div class="invoice-word">INVOICE</div>
        <div class="invoice-code">#${invoiceNumber}</div>
        <div>
          ${isPaid ? `<span class="status-badge status-paid">PAID IN FULL${paidDateText}</span>` : `<span class="status-badge status-open">OPEN · BALANCE DUE</span>`}
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="card-heading">Billed To (Customer Account)</div>
        <div class="card-body">
          <p><strong>${customerName}</strong></p>
          <p>Account Email: ${customerEmail}</p>
          <p>Account ID: ACC-7741</p>
          <p>Region: Central Valley, California</p>
        </div>
      </div>
      <div class="info-card">
        <div class="card-heading">Accounting & Delivery Specs</div>
        <div class="card-body">
          <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
          <p><strong>Payment Due:</strong> ${dueDate}</p>
          <p><strong>QuickBooks Ref ID:</strong> ${qbId}</p>
          <p><strong>Delivery Order Ref:</strong> ${deliveryRef}</p>
        </div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 52%;">Description / Agricultural Formulation</th>
          <th class="center" style="width: 16%;">Delivery Order</th>
          <th class="center" style="width: 14%;">Quantity</th>
          <th class="right" style="width: 18%;">Invoiced Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-title">${product}</div>
            <div class="item-desc">Treated Ranch Blocks: <strong>${blocks}</strong></div>
            <div class="item-desc">Application: Tanker direct offload into dedicated ranch holding system</div>
          </td>
          <td class="center" style="font-weight: 700; color: #475569;">${deliveryRef}</td>
          <td class="center" style="font-weight: 800; color: #0C6054;">${gallons} Gal</td>
          <td class="right" style="font-weight: 900; font-size: 14px; color: #0F172A;">$${formattedAmount}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-grid">
      <div class="remittance-card">
        <div class="remit-title">Payment & Remittance Notice</div>
        <div class="remit-details">
          Please remit checks payable to: <strong>ReNu-Biome Inc.</strong><br>
          Attn: Grower Accounting Operations<br>
          Central Valley Regional Facility, California<br>
          For ACH / Wire Transfer routing instructions, please contact billing@renu-biome.com
        </div>
      </div>
      <div class="totals-card">
        <div class="totals-row">
          <span style="color: #64748B;">Subtotal:</span>
          <strong>$${formattedAmount}</strong>
        </div>
        <div class="totals-row">
          <span style="color: #64748B;">CA Ag Fertilizer Exemption:</span>
          <span>$0.00</span>
        </div>
        <div class="totals-row grand-total">
          <span class="grand-label">Total Amount Due:</span>
          <span class="grand-value">$${formattedAmount}</span>
        </div>
      </div>
    </div>

    <div class="qr-footer-card">
      <img src="/brand/renu-biome-install-qr-300dpi.png" class="qr-image" alt="Install QR Code" />
      <div style="flex: 1;">
        <div class="qr-text-title">ReNu-Biome Grower Portal — Mobile Access</div>
        <div class="qr-text-body">
          Scan this QR code with your smartphone camera to install the Grower Portal on iOS or Android, or navigate to <strong>https://app.renu-biome.com/install</strong> to review historical delivery records, live Otodata telemetry, and agronomist recommendations.
        </div>
      </div>
    </div>

    <div class="footer-note">
      ReNu-Biome Inc. · Official QuickBooks Statement · Hand-entered by dispatch office · Thank you for choosing ReNu-Biome!
    </div>
  </div>
</body>
</html>`;

  // Use a dedicated invisible iframe to print ONLY this isolated invoice document
  let printFrame = document.getElementById('renu-print-frame') as HTMLIFrameElement | null;
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'renu-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);
  }

  const frameDoc = printFrame.contentWindow ? printFrame.contentWindow.document : (printFrame.contentDocument || null);
  if (frameDoc && printFrame.contentWindow) {
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    setTimeout(() => {
      printFrame?.contentWindow?.focus();
      printFrame?.contentWindow?.print();
    }, 200);
  } else {
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 200);
    }
  }
};
