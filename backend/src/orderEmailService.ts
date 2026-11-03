import { transporter, OrderItem, mockRanches, TankItem, RanchItem, LabSample } from './usersStore';

export const DISPATCH_NOTIFICATION_EMAIL = process.env.DISPATCH_EMAIL || 'support@renu-biome.com';

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
          ReNu-Biome Inc. · Precision Agricultural Nutrition · Email: support@renu-biome.com
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
                <label for="contactPhone">Contact Phone</label>
                <input type="text" id="contactPhone" name="contactPhone" value="${order.contactPhone || ''}" placeholder="Contact Phone">
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

/**
 * Phase 1 & 2: Delivery status emails sent to customer on Scheduled, Out for Delivery, Delivered.
 * Includes live arrival estimate (from OptimoRoute), delivery location, and QR code install banner.
 */
export async function sendDeliveryStatusEmailToCustomer(
  order: OrderItem,
  status: 'Scheduled' | 'Out for delivery' | 'Delivered' | 'Cancelled',
  liveEta?: string,
  req?: any
): Promise<boolean> {
  const customerEmail = order.customerEmail;
  if (!customerEmail) return false;

  const frontendUrl = getBaseFrontendUrl(req);
  const installUrl = `${frontendUrl}/install`;
  const viewOrderUrl = `${frontendUrl}/deliveries?orderId=${order.id || order.orderId}`;

  const statusColors: Record<string, { bg: string; text: string; header: string }> = {
    'Scheduled': { bg: '#EFF6FF', text: '#1E40AF', header: '#0C6054' },
    'Out for delivery': { bg: '#FEF3C7', text: '#92400E', header: '#D97706' },
    'Delivered': { bg: '#ECFDF5', text: '#065F46', header: '#059669' },
    'Cancelled': { bg: '#FEF2F2', text: '#991B1B', header: '#DC2626' }
  };

  const currentTheme = statusColors[status] || statusColors['Scheduled'];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Update • ${order.orderId}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 14px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .header { background: ${currentTheme.header}; padding: 24px; color: #FFFFFF; }
        .badge { display: inline-block; background: ${currentTheme.bg}; color: ${currentTheme.text}; font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin-bottom: 8px; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; }
        .header p { margin: 6px 0 0 0; font-size: 13px; color: #E2E8F0; }
        .content { padding: 24px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .info-table td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
        .info-table td.label { font-weight: 600; color: #64748B; width: 38%; }
        .info-table td.value { font-weight: 600; color: #0F172A; }
        .eta-banner { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 14px; margin: 16px 0; display: flex; align-items: center; justify-content: space-between; }
        .eta-title { font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; }
        .eta-value { font-size: 18px; font-weight: 800; color: #14532D; }
        .qr-section { background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 16px; margin-top: 24px; text-align: center; }
        .qr-text { font-size: 13px; font-weight: 700; color: #0C6054; margin-bottom: 6px; }
        .qr-sub { font-size: 12px; color: #64748B; }
        .footer { padding: 16px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="badge">${status}</div>
          <h1>Delivery Update: Order #${order.orderId}</h1>
          <p>ReNu-Biome Precision Agricultural Nutrition</p>
        </div>
        <div class="content">
          <p>Dear Valued Grower,</p>
          <p>Your delivery status has been updated to: <strong>${status}</strong>.</p>

          ${liveEta || order.estimatedArrival ? `
          <div class="eta-banner">
            <div>
              <div class="eta-title">🚚 OptimoRoute Estimated Arrival</div>
              <div class="eta-value">${liveEta || order.estimatedArrival}</div>
            </div>
            ${order.driverName ? `<div style="font-size: 13px; color: #166534; text-align: right;">Driver: <strong>${order.driverName}</strong></div>` : ''}
          </div>
          ` : ''}

          <table class="info-table">
            <tr>
              <td class="label">Product / Blend</td>
              <td class="value">${order.product || order.productName}</td>
            </tr>
            <tr>
              <td class="label">Quantity</td>
              <td class="value"><strong>${(order.deliveredGallons || order.gallons || 0).toLocaleString()} Gallons</strong></td>
            </tr>
            <tr>
              <td class="label">Destination Ranch</td>
              <td class="value">${order.ranchName || 'Ranch'}</td>
            </tr>
            <tr>
              <td class="label">Destination Tank</td>
              <td class="value">${order.tankName || 'Primary Fertigation Tank'}</td>
            </tr>
            <tr>
              <td class="label">Delivery Window / Date</td>
              <td class="value">${order.deliveryWindow || order.date}</td>
            </tr>
            ${order.completedTime ? `
            <tr>
              <td class="label">Completion Timestamp</td>
              <td class="value">${order.completedTime}</td>
            </tr>
            ` : ''}
          </table>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${viewOrderUrl}" style="display: inline-block; background: #0C6054; color: #FFFFFF; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
              View Delivery in Portal
            </a>
          </div>

          <div class="qr-section">
            <div class="qr-text">📲 Scan to install the ReNu-Biome app</div>
            <div class="qr-sub">Instant 1-tap access to live tank levels, delivery schedules & nutrient reports</div>
            <div style="margin-top: 8px;">
              <a href="${installUrl}" style="font-weight: 700; color: #0C6054; font-size: 13px;">${installUrl.replace(/^https?:\/\//, '')}</a>
            </div>
          </div>
        </div>
        <div class="footer">
          ReNu-Biome Inc. · Support: support@renu-biome.com
        </div>
      </div>
    </body>
    </html>
  `;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"ReNu-Biome Operations" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: `Delivery Update: Order #${order.orderId} is ${status}`,
        html
      });
      console.log(`[Email Success] Sent status "${status}" email to: ${customerEmail}`);
      return true;
    } catch (e: any) {
      console.warn(`[Email Warning] Could not send delivery status email:`, e.message);
      return false;
    }
  } else {
    console.log(`[Email Simulation] Sent status "${status}" to ${customerEmail} for order #${order.orderId}`);
    return true;
  }
}

/**
 * Section A6.8 / 1.6: Admin notification when delivery is marked Delivered.
 */
export async function sendDeliveryCompletedEmailToAdmin(order: OrderItem, req?: any): Promise<boolean> {
  const adminEmail = DISPATCH_NOTIFICATION_EMAIL;

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #0F172A;">
      <h2 style="color: #059669;">✅ Delivery Completed • Order #${order.orderId}</h2>
      <p>Delivery has been marked complete and injected into ranch tank.</p>
      <ul>
        <li><strong>Customer:</strong> ${order.customerName || order.customerEmail}</li>
        <li><strong>Product:</strong> ${order.product}</li>
        <li><strong>Delivered Gallons:</strong> ${(order.deliveredGallons || order.gallons || 0).toLocaleString()} Gal</li>
        <li><strong>Destination:</strong> ${order.ranchName} (${order.tankName})</li>
        <li><strong>Completed At:</strong> ${order.completedTime || new Date().toISOString()}</li>
        ${order.driverName ? `<li><strong>Driver:</strong> ${order.driverName}</li>` : ''}
      </ul>
      <p>Please upload or link QuickBooks invoice in Admin Console.</p>
    </div>
  `;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"ReNu-Biome System" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `[Admin Alert] Delivery Completed: Order #${order.orderId} (${order.customerName || order.customerEmail})`,
        html
      });
      return true;
    } catch (e: any) {
      console.warn('[Email Warning] Could not notify admin of delivery completion:', e.message);
      return false;
    }
  }
  return true;
}

/**
 * Section 3.5: Low-tank level alert email sent to office and customer.
 */
export async function sendLowTankAlertEmail(
  tank: TankItem,
  ranch: RanchItem,
  customerEmail: string
): Promise<boolean> {
  const officeEmail = DISPATCH_NOTIFICATION_EMAIL;
  const currentLevel = tank.levelPercent ?? 20;
  const cap = tank.capacity || tank.capacityGallons || 3000;
  const gallonsNeeded = cap - (tank.currentGallons || 0);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #1E293B; background: #F8FAFC;">
      <div style="max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: #D97706; padding: 20px 24px; color: #FFFFFF;">
          <h2 style="margin: 0; font-size: 20px;">⚠️ Low Tank Alert: ${tank.name}</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #FEF3C7;">Otodata Telemetry Automated Notice</p>
        </div>
        <div style="padding: 24px;">
          <p>The tank monitor for <strong>${tank.name}</strong> on ranch <strong>${ranch.name}</strong> has dropped below its reorder threshold.</p>
          <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <div style="font-size: 14px; margin-bottom: 6px;"><strong>Current Level:</strong> <span style="color: #D97706; font-weight: 800; font-size: 18px;">${currentLevel}%</span> (${(tank.currentGallons || 0).toLocaleString()} Gal)</div>
            <div style="font-size: 14px; margin-bottom: 6px;"><strong>Tank Capacity:</strong> ${cap.toLocaleString()} Gallons</div>
            <div style="font-size: 14px; margin-bottom: 6px;"><strong>Suggested Refill:</strong> ~${gallonsNeeded.toLocaleString()} Gallons</div>
            <div style="font-size: 14px;"><strong>Estimated Days to Empty:</strong> ~${tank.daysToEmpty || 14} days</div>
          </div>
          <p>ReNu-Biome dispatch has scheduled bulk staging. To request an expedited injection or verify field access, contact <a href="mailto:support@renu-biome.com" style="color: #0C6054; font-weight: 700;">support@renu-biome.com</a>.</p>
        </div>
        <div style="padding: 16px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center;">
          ReNu-Biome Automated Tank Telemetry System
        </div>
      </div>
    </div>
  `;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const recipients = [officeEmail];
      if (customerEmail && customerEmail !== officeEmail) {
        recipients.push(customerEmail);
      }
      await transporter.sendMail({
        from: `"ReNu-Biome Telemetry" <${process.env.SMTP_USER}>`,
        to: recipients.join(', '),
        subject: `⚠️ Low Tank Alert: ${tank.name} on ${ranch.name} (${currentLevel}%)`,
        html
      });
      console.log(`[Email Success] Sent low-tank alert for ${tank.name} to: ${recipients.join(', ')}`);
      return true;
    } catch (e: any) {
      console.warn('[Email Warning] Could not send low-tank alert email:', e.message);
      return false;
    }
  }
  return true;
}

/**
 * Section 5.1: Customer submits lab sample -> notification email to office.
 */
export async function sendLabSampleReceivedEmailToOffice(
  sample: LabSample,
  customerName?: string
): Promise<boolean> {
  const officeEmail = DISPATCH_NOTIFICATION_EMAIL;

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #0F172A;">
      <h2 style="color: #0C6054;">🔬 New Lab Sample Submitted</h2>
      <p>A customer has uploaded lab results awaiting agronomist review.</p>
      <ul>
        <li><strong>Customer:</strong> ${customerName || sample.customerEmail}</li>
        <li><strong>Ranch:</strong> ${sample.ranchName}</li>
        <li><strong>Block:</strong> ${sample.blockId}</li>
        <li><strong>Sample Type:</strong> ${sample.sampleType}</li>
        <li><strong>Sample Date:</strong> ${sample.sampleDate}</li>
        <li><strong>Lab Name:</strong> ${sample.labName}</li>
        ${sample.customerNotes ? `<li><strong>Notes:</strong> ${sample.customerNotes}</li>` : ''}
        ${sample.pdfFileName ? `<li><strong>Attached File:</strong> ${sample.pdfFileName}</li>` : ''}
      </ul>
      <p>Log into Admin Console &rarr; Samples to review and generate recommendation.</p>
    </div>
  `;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"ReNu-Biome Agronomy" <${process.env.SMTP_USER}>`,
        to: officeEmail,
        subject: `[Sample Received] ${sample.sampleType} analysis for ${sample.ranchName} (${customerName || sample.customerEmail})`,
        html
      });
      return true;
    } catch (e: any) {
      console.warn('[Email Warning] Failed to notify office of lab sample:', e.message);
      return false;
    }
  }
  return true;
}

/**
 * Section 5.4: Agronomist recommendation ready email to customer.
 */
export async function sendRecommendationReadyEmailToCustomer(
  sample: LabSample,
  recommendation: any,
  customerEmail: string
): Promise<boolean> {
  if (!customerEmail) return false;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #1E293B; background: #F8FAFC;">
      <div style="max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden;">
        <div style="background: #0C6054; padding: 20px 24px; color: #FFFFFF;">
          <h2 style="margin: 0; font-size: 20px;">🌿 Agronomic Nutrition Recommendation Ready</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #CCFBF1;">ReNu-Biome Custom Recommendation</p>
        </div>
        <div style="padding: 24px;">
          <p>Our agronomy team has completed analysis for your <strong>${sample.sampleType}</strong> results on <strong>${sample.ranchName} (${sample.blockId})</strong>.</p>
          <div style="background: #F0FDFA; border: 1px solid #99F6E4; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <div style="font-weight: 700; color: #0C6054; margin-bottom: 8px;">Agronomist Summary:</div>
            <div style="font-size: 14px; line-height: 1.5; color: #134E4A;">${recommendation.summary}</div>
          </div>
          <p>Log into your ReNu-Biome Grower Portal to view full nutrient chart, stage window, and applied formulations.</p>
        </div>
      </div>
    </div>
  `;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"ReNu-Biome Agronomy" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: `Nutrition Recommendation Ready: ${sample.ranchName} (${sample.blockId})`,
        html
      });
      return true;
    } catch (e: any) {
      console.warn('[Email Warning] Could not send recommendation email:', e.message);
      return false;
    }
  }
  return true;
}

/**
 * Section 4.6: Program window opening reminder email to office.
 */
export async function sendProgramWindowReminderEmailToOffice(programs: any[]): Promise<boolean> {
  const officeEmail = DISPATCH_NOTIFICATION_EMAIL;

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #0F172A;">
      <h2 style="color: #0C6054;">📅 Program Window Opening Reminder (Next 2 Weeks)</h2>
      <p>The following ranches have nutrition programs scheduled to open within 14 days and remain in Planned status:</p>
      <ul>
        ${programs.map(p => `<li><strong>${p.ranchName || p.ranchId}</strong>: ${p.name} (${p.crop}, ${p.stageWindow})</li>`).join('')}
      </ul>
      <p>Please review and schedule tank deliveries accordingly in Admin Console.</p>
    </div>
  `;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"ReNu-Biome Operations" <${process.env.SMTP_USER}>`,
        to: officeEmail,
        subject: `[Program Reminder] ${programs.length} planned programs opening within 2 weeks`,
        html
      });
      return true;
    } catch (e: any) {
      return false;
    }
  }
  return true;
}

/**
 * Section A5.2: Admin customer creation invitation email with password set link.
 */
export async function sendNewUserInvitationEmail(user: any, resetUrl: string): Promise<boolean> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #1E293B; background: #F8FAFC;">
      <div style="max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 28px;">
        <h2 style="color: #0C6054; margin-top: 0;">Welcome to ReNu-Biome Grower Portal</h2>
        <p>Hello ${user.name || 'Grower'},</p>
        <p>An authorized account has been created for you by ReNu-Biome administration. Use the secure link below to set your password and access your delivery tracking, tank telemetry, and nutrition programs:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background: #0C6054; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">
            Set Your Password
          </a>
        </div>
        <p style="font-size: 12px; color: #64748B;">This secure activation link will expire in 7 days.</p>
      </div>
    </div>
  `;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"ReNu-Biome Accounts" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Welcome to ReNu-Biome: Set Your Portal Password`,
        html
      });
      return true;
    } catch (e: any) {
      console.warn('[Email Warning] Failed to send user invitation email:', e.message);
      return false;
    }
  }
  return true;
}
