import { transporter, OrderItem, mockRanches } from './usersStore';

export const DISPATCH_NOTIFICATION_EMAIL = 'eedevnsskjayanth.asa@gmail.com';

export function getBaseBackendUrl(req?: any): string {
  if (process.env.BACKEND_PUBLIC_URL && process.env.BACKEND_PUBLIC_URL.trim()) {
    return process.env.BACKEND_PUBLIC_URL.replace(/\/+$/, '');
  }
  if (req) {
    const host = req.get ? req.get('host') : req.headers?.host;
    if (host) {
      const proto = (req.get ? req.get('x-forwarded-proto') : req.headers?.['x-forwarded-proto']) || req.protocol || 'http';
      return `${proto}://${host}`;
    }
  }
  return process.env.NODE_ENV === 'production'
    ? 'https://renu-app-backend.onrender.com'
    : 'http://localhost:3000';
}

export function getBaseFrontendUrl(req?: any): string {
  if (process.env.FRONTEND_PUBLIC_URL && process.env.FRONTEND_PUBLIC_URL.trim()) {
    return process.env.FRONTEND_PUBLIC_URL.replace(/\/+$/, '');
  }
  return process.env.NODE_ENV === 'production'
    ? 'https://renu-app-1.onrender.com'
    : 'http://localhost:8081';
}

/**
 * Step 1: When admin accepts order, email customer requesting delivery details confirmation.
 */
export async function sendOrderAcceptedEmailToCustomer(order: OrderItem, req?: any): Promise<boolean> {
  const customerEmail = order.customerEmail;
  if (!customerEmail) return false;

  const backendUrl = getBaseBackendUrl(req);
  const frontendUrl = getBaseFrontendUrl(req);
  const confirmUrl = `${backendUrl}/api/public/orders/${order.id}/confirm`;
  const appConfirmUrl = `${frontendUrl}/confirm-delivery?orderId=${order.id}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Accepted</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #0C6054; padding: 24px; color: #FFFFFF; text-align: left; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
        .header p { margin: 6px 0 0 0; font-size: 13px; color: #CCFBF1; }
        .content { padding: 24px; }
        .order-box { background: #F0FDFA; border: 1px solid #99F6E4; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .order-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .btn-confirm { display: block; text-align: center; background: #0C6054; color: #FFFFFF !important; font-weight: 700; font-size: 16px; padding: 14px 24px; border-radius: 8px; text-decoration: none; margin: 24px 0 12px 0; }
        .footer { padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Order #${order.orderId} Accepted!</h1>
          <p>ReNu-Biome Agronomy & Dispatch</p>
        </div>
        <div class="content">
          <p>Dear Valued Grower,</p>
          <p>Great news! Your order has been reviewed and <strong>accepted by ReNu-Biome administration</strong>. To schedule delivery and tank injection without delay, please confirm your delivery address and access details:</p>
          
          <div class="order-box">
            <div style="font-size: 15px; font-weight: 700; color: #0C6054; margin-bottom: 8px;">${order.product}</div>
            <div style="font-size: 13px; color: #334155; margin-bottom: 4px;"><strong>Quantity:</strong> ${(order.gallons || 0).toLocaleString()} Gallons</div>
            <div style="font-size: 13px; color: #334155; margin-bottom: 4px;"><strong>Destination Ranch:</strong> ${order.ranchName || order.ranchId || 'Ranch'}</div>
            <div style="font-size: 13px; color: #334155;"><strong>Destination Tank:</strong> ${order.tankName || order.tankId || 'Primary Injection Tank'}</div>
          </div>

          <p>Please click below to verify your ranch gate code, on-site contact, and preferred delivery window:</p>

          <a href="${confirmUrl}" class="btn-confirm" target="_blank">Confirm Delivery Details & Address</a>

          <p style="font-size: 12px; color: #64748B; text-align: center;">
            Or open the ReNu-Biome mobile app directly: <a href="${appConfirmUrl}" style="color: #0C6054; font-weight: 600;">Open Mobile App</a>
          </p>
        </div>
        <div class="footer">
          ReNu-Biome Inc. · Precision Agricultural Nutrition · Dispatch: (559) 555-0199
        </div>
      </div>
    </body>
    </html>
  `;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"ReNu-Biome Dispatch" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: `Order #${order.orderId} Accepted: Please Confirm Delivery Details`,
        html
      });
      console.log(`[Email Success] Sent confirmation request to customer: ${customerEmail}`);
      return true;
    } catch (e: any) {
      console.warn('[Email Warning] Could not send customer confirmation email:', e.message);
      return false;
    }
  } else {
    console.log(`[Email Simulation] Customer email to ${customerEmail}: Confirm link: ${confirmUrl}`);
    return true;
  }
}

/**
 * Step 2: When customer fills out confirmation, email dispatch at eedevnsskjayanth.asa@gmail.com
 * with address, gate code, contact, and Accept / Reschedule action options.
 */
export async function sendCustomerConfirmedEmailToDispatch(order: OrderItem, req?: any): Promise<boolean> {
  const backendUrl = getBaseBackendUrl(req);
  const acceptActionUrl = `${backendUrl}/api/public/orders/${order.id}/dispatch-action?action=accept`;
  const rescheduleActionUrl = `${backendUrl}/api/public/orders/${order.id}/dispatch-action?action=reschedule`;

  // Determine best address representation
  const ranch = mockRanches.find(r => r.id === order.ranchId);
  const displayAddress = order.deliveryAddress || (ranch ? `${ranch.name}, ${ranch.county} County, CA` : 'Ranch Main Gate, CA');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Customer Delivery Confirmed</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; color: #1E293B; margin: 0; padding: 20px; }
        .card { max-width: 640px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #CBD5E1; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .header { background: #0C6054; padding: 24px; color: #FFFFFF; }
        .badge { display: inline-block; background: #FEF3C7; color: #92400E; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 8px; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; }
        .header p { margin: 4px 0 0 0; font-size: 13px; color: #99F6E4; }
        .content { padding: 24px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .info-table td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
        .info-table td.label { font-weight: 600; color: #64748B; width: 36%; vertical-align: top; }
        .info-table td.value { font-weight: 500; color: #0F172A; }
        .address-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
        .address-title { font-size: 12px; font-weight: 700; color: #1E40AF; text-transform: uppercase; margin-bottom: 4px; }
        .address-val { font-size: 15px; font-weight: 700; color: #1E3A8A; }
        .actions-section { margin-top: 24px; padding-top: 20px; border-top: 2px solid #E2E8F0; text-align: center; }
        .actions-label { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 14px; }
        .btn-accept { display: inline-block; background: #059669; color: #FFFFFF !important; font-weight: 700; font-size: 15px; padding: 14px 26px; border-radius: 8px; text-decoration: none; margin: 6px; }
        .btn-reschedule { display: inline-block; background: #D97706; color: #FFFFFF !important; font-weight: 700; font-size: 15px; padding: 14px 26px; border-radius: 8px; text-decoration: none; margin: 6px; }
        .footer { padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="badge">Action Required • Customer Confirmed</div>
          <h1>Delivery Details Ready for Order #${order.orderId}</h1>
          <p>The customer has verified destination address, gate code & delivery window</p>
        </div>
        <div class="content">
          <table class="info-table">
            <tr>
              <td class="label">Customer</td>
              <td class="value"><strong>${order.customerName || order.customerEmail}</strong><br><span style="color: #64748B; font-size: 12px;">${order.customerEmail}</span></td>
            </tr>
            <tr>
              <td class="label">Product / Formulation</td>
              <td class="value"><strong>${order.product}</strong></td>
            </tr>
            <tr>
              <td class="label">Gallons to Deliver</td>
              <td class="value"><strong>${(order.gallons || 0).toLocaleString()} Gal</strong></td>
            </tr>
            <tr>
              <td class="label">Destination Ranch</td>
              <td class="value">${order.ranchName || order.ranchId || 'Ranch'}</td>
            </tr>
            <tr>
              <td class="label">Destination Tank</td>
              <td class="value">${order.tankName || order.tankId || 'Tank T-101'}</td>
            </tr>
          </table>

          <div class="address-box">
            <div class="address-title">📍 Verified Delivery Destination & Access</div>
            <div class="address-val">${displayAddress}</div>
            <div style="margin-top: 8px; font-size: 13px; color: #1E3A8A;">
              <strong>Gate / Lockbox Code:</strong> ${order.gateCode || 'None specified'}<br>
              <strong>Contact on Arrival:</strong> ${order.contactOnArrival || 'Foreman'} ${order.contactPhone ? `(${order.contactPhone})` : ''}
            </div>
          </div>

          <table class="info-table">
            <tr>
              <td class="label">Target Delivery Window</td>
              <td class="value"><strong style="color: #0C6054;">${order.deliveryWindow || 'Tomorrow Morning'}</strong></td>
            </tr>
            <tr>
              <td class="label">Field Dispatch Notes</td>
              <td class="value">${order.notes || 'None provided'}</td>
            </tr>
            <tr>
              <td class="label">Customer Confirmed At</td>
              <td class="value">${order.customerConfirmedAt || new Date().toISOString().replace('T', ' ').substring(0, 16)}</td>
            </tr>
          </table>

          <div class="actions-section">
            <div class="actions-label">Choose Dispatch Action for Order #${order.orderId}:</div>
            <div>
              <a href="${acceptActionUrl}" class="btn-accept" target="_blank">✅ Accept Delivery Window</a>
              <a href="${rescheduleActionUrl}" class="btn-reschedule" target="_blank">📅 Reschedule Delivery</a>
            </div>
            <p style="font-size: 12px; color: #64748B; margin-top: 14px;">
              Clicking either button will automatically update the order status in the ReNu-Biome database and notify all dispatch systems.
            </p>
          </div>
        </div>
        <div class="footer">
          ReNu-Biome Inc. Automated Dispatch Service · Destination: ${DISPATCH_NOTIFICATION_EMAIL}
        </div>
      </div>
    </body>
    </html>
  `;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"ReNu-Biome Orders" <${process.env.SMTP_USER}>`,
        to: DISPATCH_NOTIFICATION_EMAIL,
        subject: `⚡ Customer Delivery Confirmed: Order #${order.orderId} (${order.product}) - Action Required`,
        html
      });
      console.log(`[Email Success] Sent confirmed order details to dispatch: ${DISPATCH_NOTIFICATION_EMAIL}`);
      return true;
    } catch (e: any) {
      console.warn('[Email Warning] Could not send dispatch notification email:', e.message);
      return false;
    }
  } else {
    console.log(`[Email Simulation] Dispatch email to ${DISPATCH_NOTIFICATION_EMAIL} for Order #${order.orderId}`);
    return true;
  }
}

/**
 * Public HTML page for customer to fill and confirm delivery address and details.
 */
export function renderCustomerConfirmHtmlPage(order: OrderItem, backendUrl: string): string {
  const ranch = mockRanches.find(r => r.id === order.ranchId);
  const defaultAddress = order.deliveryAddress || (ranch ? `${ranch.name}, ${ranch.county} County, CA` : '12450 W Sierra Ave, Sanger, CA 93657');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirm Delivery Details • Order #${order.orderId}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; color: #0F172A; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
        .header { background: #0C6054; color: #FFFFFF; padding: 24px; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .header p { margin: 6px 0 0 0; font-size: 14px; color: #CCFBF1; }
        .content { padding: 24px; }
        .order-summary { background: #F0FDFA; border: 1px solid #99F6E4; border-radius: 10px; padding: 14px; margin-bottom: 20px; }
        .order-summary-title { font-size: 15px; font-weight: 700; color: #0C6054; margin-bottom: 4px; }
        .order-summary-sub { font-size: 13px; color: #334155; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px; }
        input, textarea, select { width: 100%; padding: 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 14px; font-family: inherit; color: #0F172A; outline: none; }
        input:focus, textarea:focus { border-color: #0C6054; box-shadow: 0 0 0 3px rgba(12, 96, 84, 0.15); }
        .btn-submit { width: 100%; background: #0C6054; color: #FFFFFF; border: none; padding: 15px; font-size: 16px; font-weight: 700; border-radius: 8px; cursor: pointer; transition: background 0.2s; margin-top: 10px; }
        .btn-submit:hover { background: #09473E; }
        .help-text { font-size: 11px; color: #64748B; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Confirm Delivery Details</h1>
          <p>Order #${order.orderId} • ReNu-Biome Precision Injection</p>
        </div>
        <div class="content">
          <div class="order-summary">
            <div class="order-summary-title">${order.product} (${(order.gallons || 0).toLocaleString()} Gallons)</div>
            <div class="order-summary-sub">Destination: <strong>${order.ranchName || order.ranchId || 'Ranch'}</strong> · ${order.tankName || 'Primary Tank'}</div>
          </div>

          <form action="${backendUrl}/api/public/orders/${order.id}/confirm-delivery" method="POST">
            <div class="form-group">
              <label for="deliveryAddress">Ranch Delivery Address / GPS *</label>
              <input type="text" id="deliveryAddress" name="deliveryAddress" value="${defaultAddress}" required placeholder="e.g. 12450 W Sierra Ave, Sanger, CA 93657">
              <div class="help-text">Physical gate address or cross-streets for the bulk delivery tanker</div>
            </div>

            <div class="form-group" style="display: flex; gap: 12px;">
              <div style="flex: 1;">
                <label for="gateCode">Gate / Lockbox Code</label>
                <input type="text" id="gateCode" name="gateCode" value="${order.gateCode || ''}" placeholder="e.g. #4921">
              </div>
              <div style="flex: 1;">
                <label for="contactPhone">Contact Phone *</label>
                <input type="text" id="contactPhone" name="contactPhone" value="${order.contactPhone || '559-555-0199'}" required placeholder="559-555-0199">
              </div>
            </div>

            <div class="form-group">
              <label for="contactOnArrival">On-Arrival Contact Name</label>
              <input type="text" id="contactOnArrival" name="contactOnArrival" value="${order.contactOnArrival || 'Ranch Foreman'}" placeholder="e.g. Joe Miller">
            </div>

            <div class="form-group">
              <label for="deliveryWindow">Requested Delivery Window *</label>
              <input type="text" id="deliveryWindow" name="deliveryWindow" value="${order.deliveryWindow || 'Tomorrow 8:00 AM - 12:00 PM'}" required placeholder="e.g. Tomorrow 8:00 AM - 12:00 PM">
            </div>

            <div class="form-group">
              <label for="notes">Special Field Instructions / Tank Location Notes</label>
              <textarea id="notes" name="notes" rows="3" placeholder="e.g. Tank is located next to north pump filter station. Driver please call 15 mins prior to arrival.">${order.notes || ''}</textarea>
            </div>

            <button type="submit" class="btn-submit">Submit Delivery Confirmation</button>
          </form>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Public HTML page rendered when dispatcher clicks Accept or Reschedule in email.
 */
export function renderDispatchActionHtmlPage(
  order: OrderItem,
  action: 'accept' | 'reschedule',
  message?: string,
  showRescheduleForm: boolean = false,
  backendUrl: string = ''
): string {
  const isAccepted = action === 'accept' && !showRescheduleForm;

  if (showRescheduleForm) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reschedule Delivery • Order #${order.orderId}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
          .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #CBD5E1; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
          .header { background: #D97706; padding: 20px 24px; color: #FFFFFF; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
          .content { padding: 24px; }
          .form-group { margin-bottom: 16px; }
          label { display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px; }
          input, textarea { width: 100%; padding: 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 14px; outline: none; }
          .btn-reschedule { width: 100%; background: #D97706; color: #FFFFFF; border: none; padding: 14px; font-size: 16px; font-weight: 700; border-radius: 8px; cursor: pointer; }
          .summary { background: #FFFBEB; border: 1px solid #FDE68A; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; color: #92400E; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Reschedule Delivery • Order #${order.orderId}</h1>
          </div>
          <div class="content">
            <div class="summary">
              <strong>Customer:</strong> ${order.customerName || order.customerEmail}<br>
              <strong>Product:</strong> ${order.product} (${(order.gallons || 0).toLocaleString()} Gal)<br>
              <strong>Current Requested Window:</strong> ${order.deliveryWindow || 'Not set'}
            </div>

            <form action="${backendUrl}/api/public/orders/${order.id}/dispatch-action" method="POST">
              <input type="hidden" name="action" value="reschedule">
              <div class="form-group">
                <label for="newWindow">Proposed New Delivery Window *</label>
                <input type="text" id="newWindow" name="newWindow" required value="Thursday 9:00 AM - 1:00 PM" placeholder="e.g. Thursday 9:00 AM - 1:00 PM">
              </div>

              <div class="form-group">
                <label for="reason">Reason for Rescheduling</label>
                <textarea id="reason" name="reason" rows="3" placeholder="e.g. Tanker route optimization / weather hold / earlier slot booked"></textarea>
              </div>

              <button type="submit" class="btn-reschedule">Confirm Reschedule to Database</button>
            </form>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isAccepted ? 'Delivery Accepted' : 'Reschedule Logged'} • Order #${order.orderId}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 32px 20px; }
        .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 14px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.06); text-align: center; padding: 32px 24px; }
        .icon { font-size: 56px; margin-bottom: 16px; }
        h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${isAccepted ? '#059669' : '#D97706'}; }
        p { margin: 0 0 20px 0; font-size: 14px; color: #475569; }
        .details-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; text-align: left; margin-bottom: 24px; font-size: 13px; line-height: 1.6; }
        .badge-status { display: inline-block; background: ${isAccepted ? '#D1FAE5' : '#FEF3C7'}; color: ${isAccepted ? '#065F46' : '#92400E'}; font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 12px; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${isAccepted ? '✅' : '📅'}</div>
        <div class="badge-status">${isAccepted ? 'DISPATCH CONFIRMED' : 'RESCHEDULE LOGGED'}</div>
        <h1>${isAccepted ? 'Delivery Slot Accepted & Scheduled' : 'Reschedule Logged in Database'}</h1>
        <p>${message || (isAccepted ? 'The delivery window has been locked in and committed to the database.' : 'The proposed reschedule was saved to the database.')}</p>

        <div class="details-box">
          <div><strong>Order #:</strong> ${order.orderId}</div>
          <div><strong>Customer:</strong> ${order.customerName || order.customerEmail}</div>
          <div><strong>Product:</strong> ${order.product} (${(order.gallons || 0).toLocaleString()} Gal)</div>
          <div><strong>Destination Address:</strong> ${order.deliveryAddress || 'Ranch Primary Entrance'}</div>
          <div><strong>Confirmed Window:</strong> ${order.rescheduledDeliveryWindow || order.deliveryWindow || 'Tomorrow Morning'}</div>
          ${order.rescheduleReason ? `<div><strong>Reschedule Reason:</strong> ${order.rescheduleReason}</div>` : ''}
          <div><strong>Status in DB:</strong> <span style="color: ${isAccepted ? '#059669' : '#D97706'}; font-weight: 700;">${order.confirmationStatus}</span></div>
        </div>

        <div style="font-size: 12px; color: #94A3B8;">
          ReNu-Biome Automated Dispatch Portal · Database synchronized
        </div>
      </div>
    </body>
    </html>
  `;
}
