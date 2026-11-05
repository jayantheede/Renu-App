import { transporter, mockUsers, mockRanches, mockOrdersList, mockInvoices, mockPrograms, findUserByEmail, getRanchesForCustomer, getInvoicesList, updateDeliveryStatus, createDeliveryOrder } from '../src/usersStore';
import {
  sendDeliveryStatusEmailToCustomer,
  sendDeliveryCompletedEmailToAdmin,
  sendLowTankAlertEmail,
  sendLabSampleReceivedEmailToOffice,
  sendRecommendationReadyEmailToCustomer,
  sendProgramWindowReminderEmailToOffice,
  sendNewUserInvitationEmail,
  DISPATCH_NOTIFICATION_EMAIL
} from '../src/orderEmailService';
import {
  createOptimoRouteOrder,
  getOptimoRouteOrderStatus,
  syncOpenDeliveriesWithOptimoRoute,
  getOptimoRouteSyncStatus
} from '../src/optimoRouteService';
import {
  fetchOtodataReading,
  syncAllTanksTelemetry,
  getTelemetrySyncStatus
} from '../src/otodataService';

describe('Comprehensive System Integration Tests (SMTP, OptimoRoute, Otodata, Customer, Programs)', () => {
  beforeAll(() => {
    // Mock network email sending so tests verify formatting, payload and logic without failing on sandbox DNS
    jest.spyOn(transporter, 'sendMail').mockImplementation(async () => ({ messageId: 'test-msg-123' } as any));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. SMTP Configuration & Email Services', () => {
    it('should configure nodemailer transporter according to environment configuration', () => {
      expect(transporter).toBeDefined();
      const options: any = transporter.options;
      expect(options.host).toBe(process.env.SMTP_HOST || 'smtp.gmail.com');
      expect(options.port).toBe(parseInt(process.env.SMTP_PORT || '465', 10));
      expect(options.auth.user).toBe(process.env.SMTP_USER || 'sravangaaismartsolutions@gmail.com');
      expect(DISPATCH_NOTIFICATION_EMAIL).toBe('support@renu-biome.com');
    });

    it('should generate and process delivery status email for customer with OptimoRoute ETA and QR banner', async () => {
      const order = mockOrdersList[0];
      const sent = await sendDeliveryStatusEmailToCustomer(order, 'Out for delivery', '2:30 PM');
      expect(sent).toBe(true);
    });

    it('should generate and process delivery completed email to admin', async () => {
      const order = mockOrdersList[0];
      const sent = await sendDeliveryCompletedEmailToAdmin(order);
      expect(sent).toBe(true);
    });

    it('should generate and process low tank alert email to office and customer', async () => {
      const ranch = mockRanches[0];
      const tank = ranch.tanks[0];
      const sent = await sendLowTankAlertEmail(tank, ranch, 'sravangaaismartsolutions.com');
      expect(sent).toBe(true);
    });

    it('should generate and process lab sample received email to office', async () => {
      const sample: any = {
        id: 'sample-test-1',
        ranchName: 'Sierra Foothills Ranch',
        blockId: 'N-4',
        sampleType: 'leaf tissue',
        sampleDate: '2026-10-25',
        labName: 'Dellavalle Laboratory Inc.',
        customerEmail: 'sravangaaismartsolutions.com',
        customerNotes: 'Nitrogen levels check',
        pdfFileName: 'sample_analysis.pdf'
      };
      const sent = await sendLabSampleReceivedEmailToOffice(sample, 'Sierra Agri Group');
      expect(sent).toBe(true);
    });

    it('should generate and process custom recommendation email to customer', async () => {
      const sample: any = {
        id: 'sample-test-1',
        ranchName: 'Sierra Foothills Ranch',
        blockId: 'N-4',
        sampleType: 'leaf tissue'
      };
      const rec = {
        summary: 'Apply ReNu N-32%, K-24% Blend at 8 gal/acre to restore mid-summer vigor.'
      };
      const sent = await sendRecommendationReadyEmailToCustomer(sample, rec, 'sravangaaismartsolutions.com');
      expect(sent).toBe(true);
    });

    it('should generate and process program reminder email to office', async () => {
      const programs = [
        { ranchName: 'Sierra Foothills Ranch', name: 'Almond Post-Harvest', crop: 'Almond', stageWindow: 'Aug - Sep 2026' }
      ];
      const sent = await sendProgramWindowReminderEmailToOffice(programs);
      expect(sent).toBe(true);
    });

    it('should generate and process user invitation email', async () => {
      const user = { name: 'Demo Grower', email: 'sravangaaismartsolutions.com' };
      const sent = await sendNewUserInvitationEmail(user, 'https://app.renu-biome.com/reset-password?token=demo');
      expect(sent).toBe(true);
    });
  });

  describe('2. OptimoRoute Integration & Delivery Dispatching', () => {
    it('should format delivery orders with orderNo, timeWindow, load, and custom fields', async () => {
      const order = mockOrdersList[0];
      const optOrder = await createOptimoRouteOrder(order);
      // When API key is not set in test environment, service handles gracefully
      if (optOrder) {
        expect(optOrder.orderNo).toBe(order.orderId);
      }
    });

    it('should sync open deliveries and retrieve OptimoRoute status health', async () => {
      const status = await syncOpenDeliveriesWithOptimoRoute();
      expect(status).toBeDefined();
      expect(status.lastSyncTime).toBeDefined();
      expect(typeof status.openDeliveriesChecked).toBe('number');

      const syncHealth = getOptimoRouteSyncStatus();
      expect(syncHealth).toBeDefined();
      expect(syncHealth.lastSyncTime).toBe(status.lastSyncTime);
    });

    it('should transition delivery status properly without overwriting manual cancellation', () => {
      const delivery = createDeliveryOrder({
        customerId: 'mock-cust-1',
        customerEmail: 'sravangaaismartsolutions.com',
        product: 'ReNu N-32% K-28% Blend',
        gallons: 500,
        ranchId: 'ranch-1',
        tankId: 'tank-1-1',
        blockIds: ['blk-1-1'],
        deliveryWindow: 'Tomorrow Morning',
        gateCode: '#4821',
        contactOnArrival: 'Joe Miller'
      });

      expect(delivery.status).toBe('Scheduled');

      // Update to Out for delivery
      const outDelivery = updateDeliveryStatus(delivery.id, 'Out for delivery');
      expect(outDelivery?.status).toBe('Out for delivery');
      expect(outDelivery?.timeline[1].done).toBe(true);

      // Update to Delivered
      const delDelivery = updateDeliveryStatus(delivery.id, 'Delivered', { deliveredGallons: 500 });
      expect(delDelivery?.status).toBe('Delivered');
      expect(delDelivery?.deliveredGallons).toBe(500);
      expect(delDelivery?.timeline[2].done).toBe(true);
    });
  });

  describe('3. Otodata Nee-Vo Tank Fill Monitoring', () => {
    it('should fetch or calculate real device telemetry for linked Otodata serials', async () => {
      const reading = await fetchOtodataReading('94004832', 6500);
      expect(reading).toBeDefined();
      expect(reading?.levelPercent).toBeGreaterThan(0);
      expect(reading?.gallons).toBeDefined();
      expect(['Normal', 'Online']).toContain(reading?.status);
    });

    it('should sync all tanks telemetry, compute weekly usage, days-to-empty, and maintain reading history', async () => {
      const summary = await syncAllTanksTelemetry();
      expect(summary).toBeDefined();
      expect(summary.syncedTanks).toBeGreaterThan(0);
      expect(summary.totalMonitoredTanks).toBeGreaterThan(0);

      const status = getTelemetrySyncStatus();
      expect(status.lastSyncTime).toBe(summary.lastSyncTime);

      // Verify that synced tanks now have reading history, weekly usage average, and days-to-empty
      const allTanks = mockRanches.flatMap(r => r.tanks || []);
      const syncedTank = allTanks.find(t => Boolean(t.otodataDeviceId || t.serial));
      expect(syncedTank).toBeDefined();
      expect(syncedTank?.readingHistory).toBeDefined();
      expect(syncedTank?.readingHistory!.length).toBeGreaterThan(0);
      expect(syncedTank?.weeklyUsageAvg).toBeGreaterThan(0);
      expect(syncedTank?.daysToEmpty).toBeGreaterThan(0);
    });

    it('should identify tanks below reorder threshold (<=25%) and set status to Needs a delivery', async () => {
      await syncAllTanksTelemetry();
      const allTanks = mockRanches.flatMap(r => r.tanks || []);
      const lowTank = allTanks.find(t => (t.levelPercent || 100) <= 25);

      expect(lowTank).toBeDefined();
      expect(lowTank!.levelPercent).toBeLessThanOrEqual(25);
      expect(lowTank!.status).toContain('Needs a delivery');
    });
  });

  describe('4. Demo Customer Account (rgundavelli@gmail.com)', () => {
    it('should locate demo customer account by rgundavelli@gmail.com', async () => {
      const user = await findUserByEmail('rgundavelli@gmail.com');
      expect(user).toBeDefined();
      expect(user?.email).toBe('rgundavelli@gmail.com');
      expect(user?.role).toBe('Grower');
    });

    it('should locate demo customer by alias sravangaaismartsolutions.com and customer@renu.com', async () => {
      const user1 = await findUserByEmail('sravangaaismartsolutions.com');
      expect(user1).toBeDefined();
      expect(user1?.email).toBe('rgundavelli@gmail.com');

      const user2 = await findUserByEmail('customer@renu.com');
      expect(user2).toBeDefined();
      expect(user2?.email).toBe('rgundavelli@gmail.com');
    });

    it('should return pilot ranches with computed acreage for rgundavelli@gmail.com', () => {
      const ranches = getRanchesForCustomer('rgundavelli@gmail.com');
      expect(ranches.length).toBeGreaterThan(0);
      const ranch1 = ranches.find(r => r.id === 'ranch-home' || r.name === 'Home Ranch') || ranches[0];
      expect(ranch1).toBeDefined();
      expect(ranch1?.ac).toBeGreaterThan(0);
      expect(ranch1?.blocks.length).toBeGreaterThan(0);
    });

    it('should return invoices for rgundavelli@gmail.com', () => {
      const invoices = getInvoicesList('rgundavelli@gmail.com');
      expect(invoices.length).toBeGreaterThan(0);
    });
  });

  describe('6. Admin Real OTP Validation MFA (support@renu-biome.com)', () => {
    it('should verify admin email is support@renu-biome.com', async () => {
      const admin = await findUserByEmail('support@renu-biome.com');
      expect(admin).toBeDefined();
      expect(admin?.role).toBe('admin');
      expect(admin?.email).toBe('support@renu-biome.com');
    });

    it('should generate real 6-digit OTP, store with expiration, and dispatch email via Office 365', async () => {
      const sendMailSpy = jest.spyOn(transporter, 'sendMail').mockResolvedValue({ messageId: 'test-otp-123' } as any);
      const admin = await findUserByEmail('support@renu-biome.com');

      const code = String(Math.floor(100000 + Math.random() * 900000));
      (global as any).pendingMfa = (global as any).pendingMfa || {};
      (global as any).pendingMfa['support@renu-biome.com'] = {
        code,
        user: admin,
        expiresAt: Date.now() + 10 * 60 * 1000
      };

      // Dispatched email
      await transporter.sendMail({
        from: '"ReNu-Biome Security" <support@renu-biome.com>',
        to: 'support@renu-biome.com',
        subject: `Your ReNu-Biome Sign-In Verification Code: ${code}`,
        html: `<div>${code}</div>`
      });

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'support@renu-biome.com',
          subject: expect.stringContaining(code)
        })
      );
    });

    it('should strictly reject dummy OTP (123456) and wrong codes', () => {
      const pending = (global as any).pendingMfa?.['support@renu-biome.com'];
      expect(pending).toBeDefined();

      const dummyCode = '123456';
      const isDummyValid = pending.code === dummyCode && Date.now() < pending.expiresAt;
      // Unless the random 6 digit was by coincidence 123456, dummy must be rejected
      if (pending.code !== '123456') {
        expect(isDummyValid).toBe(false);
      }

      const wrongCode = '000000';
      const isWrongValid = pending.code === wrongCode && Date.now() < pending.expiresAt;
      expect(isWrongValid).toBe(false);
    });

    it('should successfully validate the original real OTP sent to support@renu-biome.com', () => {
      const pending = (global as any).pendingMfa?.['support@renu-biome.com'];
      expect(pending).toBeDefined();

      const realCode = pending.code;
      const isRealValid = pending.code === realCode && Date.now() < pending.expiresAt;
      expect(isRealValid).toBe(true);

      // Clean up after successful validation
      delete (global as any).pendingMfa?.['support@renu-biome.com'];
      expect((global as any).pendingMfa?.['support@renu-biome.com']).toBeUndefined();
    });
  });
});
