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
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 8px;">
          <img src="/brand/renu-biome-logo-teal-orange-for-light-backgrounds.png" alt="ReNu-Biome Logo" style="height: 48px; max-width: 170px; object-fit: contain;" />
          <div>
            <div class="brand-title" style="font-size: 22px; line-height: 1.1;">ReNu-Biome Inc.</div>
            <div class="brand-tagline">Farmer's Pride · Central Valley Operations</div>
          </div>
        </div>
        <div class="brand-meta">Agricultural Soil Nutrition & Biological Plant Formulations</div>
        <div class="brand-meta">ReNu-Biome Inc. · Email: support@renu-biome.com</div>
      </div>
      <div class="invoice-header-meta">
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
          <svg width="44" height="44" viewBox="0 0 100 100" fill="none" style="flex-shrink: 0;">
            <path d="M 36 21 L 59 21 C 63.5 21, 65 22.5, 65 27 L 65 40 M 65 43 L 65 56 M 60 78 L 37 78 L 25 66 L 25 27 C 25 22.5, 26.5 21, 31 21 L 36 21" stroke="#0C6054" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M 25 66 L 37 66 C 37 72, 37 78, 37 78" stroke="#0C6054" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
            <text x="45" y="31.5" text-anchor="middle" fill="#0C6054" font-size="11" font-weight="900" font-family="-apple-system, sans-serif" letter-spacing="1.2">INVOICE</text>
            <path d="M 30 38 L 49 38" stroke="#0C6054" stroke-width="3.6" stroke-linecap="round"/>
            <path d="M 55 38 L 58 38" stroke="#0C6054" stroke-width="3.6" stroke-linecap="round"/>
            <path d="M 30 46 L 43 46" stroke="#0C6054" stroke-width="3.6" stroke-linecap="round"/>
            <path d="M 55 46 L 58 46" stroke="#0C6054" stroke-width="3.6" stroke-linecap="round"/>
            <path d="M 30 54 L 52 54" stroke="#0C6054" stroke-width="3.6" stroke-linecap="round"/>
            <path d="M 55 54 L 58 54" stroke="#0C6054" stroke-width="3.6" stroke-linecap="round"/>
            <circle cx="66" cy="69" r="16" stroke="#0C6054" stroke-width="4.2" stroke-linecap="round" stroke-dasharray="95 12"/>
            <path d="M 66 60.5 L 66 77.5 M 69.5 64.5 C 69 63, 67.5 62.5, 66 62.5 C 64 62.5, 62.5 63.5, 62.5 65.5 C 62.5 68, 69.5 68.5, 69.5 72 C 69.5 74.5, 67.5 75.5, 66 75.5 C 64 75.5, 62.5 74.5, 62 73" stroke="#0C6054" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div>
            <div class="invoice-word">INVOICE</div>
            <div class="invoice-code">#${invoiceNumber}</div>
          </div>
        </div>
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
          Scan this QR code with your smartphone camera to download the ReNu-Biome app from the App Store, or visit <a href="https://apps.apple.com/app/id6832246515" style="color: #0C6054; font-weight: 700; text-decoration: none;">https://apps.apple.com/app/id6832246515</a> to review historical delivery records, live Otodata telemetry, and agronomist recommendations.
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

export interface YearEndPrintData {
  year: string;
  customerName: string;
  products: Array<{ name: string; deliveries: number; gallons: number }>;
  invoices: Array<{ invoiceNumber: string; date: string; status: string; paidDate?: string; amount: number }>;
  totalGallons: number;
  totalAmount: number;
}

export const printYearEndSummaryDocument = (data: YearEndPrintData) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    Alert.alert('PDF Export', `Year-End Summary ${data.year} generated for printing.`);
    return;
  }

  const { year, customerName, products, invoices, totalGallons, totalAmount } = data;
  const printDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const productRowsHtml = products.map(p => `
    <tr>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 600; color: #0F172A;">${p.name}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; text-align: right; color: #334155;">${p.deliveries}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; text-align: right; font-weight: 700; color: #0C6054;">${p.gallons.toLocaleString()} gal</td>
    </tr>
  `).join('');

  const invoiceRowsHtml = invoices.map(i => `
    <tr>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; color: #0F172A;">${i.invoiceNumber}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B;">${i.date}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: ${i.status === 'Paid' ? '#15803D' : '#D97706'}; font-weight: 600;">
        ${i.status === 'Paid' ? `Paid ${i.paidDate || ''}` : i.status}
      </td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; text-align: right; font-weight: 700; color: #0F172A;">$${i.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ReNu-Biome Year-End Purchase Summary ${year} — ${customerName}</title>
  <style>
    @page { size: letter portrait; margin: 16mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #FFFFFF; color: #0F172A; margin: 0; padding: 24px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #0C6054; margin-bottom: 20px; }
    .logo { height: 42px; width: auto; }
    .title-block { text-align: right; }
    .doc-title { font-size: 20px; font-weight: 800; color: #0C6054; }
    .doc-sub { font-size: 13px; color: #64748B; margin-top: 2px; }
    .section-title { font-size: 15px; font-weight: 800; color: #0C6054; margin: 20px 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #F0FDFA; color: #0C6054; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 14px; text-align: left; border-bottom: 2px solid #99F6E4; }
    th.r { text-align: right; }
    .total-row td { font-weight: 800; background: #F8FAFC; border-top: 2px solid #0C6054; }
    .qr-card { display: flex; align-items: center; gap: 16px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 12px; padding: 14px; margin-top: 24px; }
    .qr-img { width: 84px; height: 84px; border-radius: 8px; background: white; padding: 4px; border: 1px solid #E2E8F0; }
    .qr-title { font-size: 13px; font-weight: 700; color: #0C6054; }
    .qr-text { font-size: 11px; color: #475569; margin-top: 2px; line-height: 1.4; }
    .footer-note { font-size: 11px; color: #64748B; text-align: center; margin-top: 20px; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <img src="/brand/renu-biome-logo-teal-orange-for-light-backgrounds.png" class="logo" alt="ReNu-Biome" onerror="this.style.display='none'; document.getElementById('alt-logo').style.display='block';" />
      <div id="alt-logo" style="display:none; font-size: 22px; font-weight: 800; color: #0C6054;">ReNu-Biome</div>
      <div style="font-size: 12px; color: #64748B; margin-top: 4px;">support@renu-biome.com · Central Valley, California</div>
    </div>
    <div class="title-block">
      <div class="doc-title">Year-End Purchase Summary</div>
      <div class="doc-sub">Season ${year} · ${customerName}</div>
      <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">Generated: ${printDate}</div>
    </div>
  </div>

  <div class="section-title">Products Delivered (${year})</div>
  <table>
    <thead>
      <tr>
        <th>Product Formulation</th>
        <th class="r">Deliveries</th>
        <th class="r">Total Gallons</th>
      </tr>
    </thead>
    <tbody>
      ${productRowsHtml}
      <tr class="total-row">
        <td>Season Total</td>
        <td style="text-align: right;">${products.reduce((acc, p) => acc + p.deliveries, 0)}</td>
        <td style="text-align: right; color: #0C6054;">${totalGallons.toLocaleString()} gal</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">Invoices Summary (${year})</div>
  <table>
    <thead>
      <tr>
        <th>Invoice #</th>
        <th>Date</th>
        <th>Status</th>
        <th class="r">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceRowsHtml}
      <tr class="total-row">
        <td>Total Invoiced</td>
        <td></td>
        <td></td>
        <td style="text-align: right; color: #0C6054;">$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  <div class="qr-card">
    <img src="/brand/renu-biome-install-qr-300dpi.png" class="qr-img" alt="ReNu-Biome QR Code" />
    <div>
      <div class="qr-title">ReNu-Biome Grower Portal — Mobile Access</div>
      <div class="qr-text">
        Scan this QR code with your smartphone camera to download the ReNu-Biome app from the App Store (<a href="https://apps.apple.com/app/id6832246515" style="color: #0C6054; font-weight: 700; text-decoration: none;">https://apps.apple.com/app/id6832246515</a>) to review historical delivery records, tank telemetry, and season nutrition programs.
      </div>
    </div>
  </div>

  <div class="footer-note">
    Every delivery and invoice for the year, for your accountant. No unit prices are shown; amounts are the invoice totals.
  </div>
</body>
</html>`;

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
