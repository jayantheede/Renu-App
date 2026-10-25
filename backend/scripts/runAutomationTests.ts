/**
 * Automated End-to-End Functionality Test Suite
 * Tests all 12 Deferred Launch Capabilities, Authentication, and Business Logic
 */

interface TestResult {
  suite: string;
  test: string;
  status: 'PASSED' | 'FAILED';
  details?: string;
  durationMs: number;
}

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const results: TestResult[] = [];

async function runTest(suite: string, testName: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, test: testName, status: 'PASSED', durationMs });
    console.log(`  ✅ [PASS] ${testName} (${durationMs}ms)`);
  } catch (error: any) {
    const durationMs = Date.now() - start;
    results.push({ suite, test: testName, status: 'FAILED', details: error.message || String(error), durationMs });
    console.error(`  ❌ [FAIL] ${testName}: ${error.message}`);
  }
}

async function request(path: string, options: any = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, headers: res.headers, data };
}

async function main() {
  console.log('========================================================================');
  console.log('🚀 STARTING AUTOMATED FUNCTIONALITY TESTING SUITE');
  console.log(`Target Environment: ${BASE_URL}`);
  console.log('========================================================================\n');

  let adminToken = '';
  let customerToken = '';
  let employeeToken = '';

  // -------------------------------------------------------------------------
  // SUITE 1: AUTHENTICATION & ACCESS CONTROL
  // -------------------------------------------------------------------------
  console.log('📋 SUITE 1: Authentication, Role Authorization & Security');

  await runTest('Authentication', 'Admin Login with support@renu-biome.com', async () => {
    let res = await request('/app/login', {
      method: 'POST',
      body: { email: 'support@renu-biome.com', password: 'admin' }
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.mfaRequired) {
      const code = res.data.demoCode || '123456';
      const mfaRes = await request('/app/verify-mfa', {
        method: 'POST',
        body: { email: 'support@renu-biome.com', code }
      });
      if (mfaRes.status !== 200) throw new Error(`MFA verification failed: ${JSON.stringify(mfaRes.data)}`);
      res = mfaRes;
    }
    if (!res.data.token) throw new Error('No JWT token returned');
    if (res.data.user.role !== 'admin') throw new Error(`Expected role 'admin', got '${res.data.user.role}'`);
    if (res.data.user.email !== 'support@renu-biome.com') throw new Error(`Expected email 'support@renu-biome.com', got '${res.data.user.email}'`);
    adminToken = res.data.token;
  });

  await runTest('Authentication', 'Admin Alias Login with admin@renu.com (Backward Compatibility)', async () => {
    let res = await request('/app/login', {
      method: 'POST',
      body: { email: 'admin@renu.com', password: 'admin' }
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (res.data.mfaRequired) {
      const code = res.data.demoCode || '123456';
      const mfaRes = await request('/app/verify-mfa', {
        method: 'POST',
        body: { email: 'admin@renu.com', code }
      });
      if (mfaRes.status !== 200) throw new Error(`MFA verification failed: ${JSON.stringify(mfaRes.data)}`);
      res = mfaRes;
    }
    if (res.data.user.role !== 'admin') throw new Error(`Expected role 'admin'`);
  });

  await runTest('Authentication', 'Customer Login with customer@renu.com', async () => {
    let res = await request('/app/login', {
      method: 'POST',
      body: { email: 'customer@renu.com', password: 'customer' }
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (res.data.mfaRequired) {
      const code = res.data.demoCode || '123456';
      const mfaRes = await request('/app/verify-mfa', {
        method: 'POST',
        body: { email: 'customer@renu.com', code }
      });
      if (mfaRes.status !== 200) throw new Error(`MFA verification failed: ${JSON.stringify(mfaRes.data)}`);
      res = mfaRes;
    }
    if (res.data.user.role !== 'Grower' && res.data.user.role !== 'customer') {
      throw new Error(`Expected Grower/customer role, got '${res.data.user.role}'`);
    }
    customerToken = res.data.token;
  });

  await runTest('Authentication', 'Field Staff Login with employee@renu.com', async () => {
    let res = await request('/app/login', {
      method: 'POST',
      body: { email: 'employee@renu.com', password: 'employee' }
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    if (res.data.mfaRequired) {
      const code = res.data.demoCode || '123456';
      const mfaRes = await request('/app/verify-mfa', {
        method: 'POST',
        body: { email: 'employee@renu.com', code }
      });
      if (mfaRes.status !== 200) throw new Error(`MFA verification failed: ${JSON.stringify(mfaRes.data)}`);
      res = mfaRes;
    }
    if (res.data.user.role !== 'employee' && res.data.user.role !== 'Staff') {
      throw new Error(`Expected employee/Staff role, got '${res.data.user.role}'`);
    }
    employeeToken = res.data.token;
  });

  await runTest('Authentication', 'Security: Reject Invalid Password', async () => {
    const res = await request('/app/login', {
      method: 'POST',
      body: { email: 'support@renu-biome.com', password: 'WrongPassword123!' }
    });
    if (res.status === 200) throw new Error('Expected 401 for invalid password, got 200');
  });

  // -------------------------------------------------------------------------
  // SUITE 2: FEATURE FLAGS (ALL 12 DEFERRED LAUNCH CAPABILITIES)
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 2: Deferred Launch Feature Flags Validation');

  await runTest('FeatureFlags', 'All 12 Deferred Launch Feature Flags are Active', async () => {
    const res = await request('/app/feature-flags', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const globalFlags = res.data.global || res.data;
    const requiredFlags = [
      'ordering', 'payments', 'recommendations', 'labResults',
      'documents', 'compliance', 'messaging', 'staffTasks',
      'optimoroute', 'telemetry', 'quickbooks', 'map'
    ];
    const missingOrDisabled = requiredFlags.filter(flag => !Boolean(globalFlags[flag]));
    if (missingOrDisabled.length > 0) {
      throw new Error(`Missing or disabled flags: ${missingOrDisabled.join(', ')}`);
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 3: RANCHES & COMPUTED ACREAGE
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 3: Ranches, Planted Blocks & Computed Acreage');

  let testRanchId = '';
  let testBlockId = '';
  let testTankId = '';

  await runTest('Ranches', 'Fetch Ranches & Verify Acreage Computation', async () => {
    const res = await request('/app/ranches', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data) || res.data.length === 0) throw new Error('No ranches returned');

    for (const ranch of res.data) {
      const blocks = ranch.blocks || [];
      const sumBlocksAc = blocks.reduce((acc: number, b: any) => acc + (Number(b.acreage) || 0), 0);
      const computedRanchAc = Number(ranch.ac) || sumBlocksAc;
      if (blocks.length > 0 && Math.abs(sumBlocksAc - computedRanchAc) > 0.1) {
        throw new Error(`Ranch ${ranch.name} acreage mismatch: blocks sum to ${sumBlocksAc}, ranch.ac is ${computedRanchAc}`);
      }
    }

    testRanchId = res.data[0].id;
    if (res.data[0].blocks && res.data[0].blocks.length > 0) {
      testBlockId = res.data[0].blocks[0].blockId;
    }
    if (res.data[0].tanks && res.data[0].tanks.length > 0) {
      testTankId = res.data[0].tanks[0].id;
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 4: OTODATA TANK TELEMETRY
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 4: Otodata Tank Telemetry & Depletion Tracking');

  await runTest('Telemetry', 'Fetch Tank Cellular Telemetry', async () => {
    if (!testTankId) return;
    const res = await request(`/app/tanks/${testTankId}/telemetry`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.serial) throw new Error('Missing sensor serial number');
    if (typeof res.data.currentGallons !== 'number') throw new Error('Missing currentGallons reading');
    if (typeof res.data.levelPercent !== 'number') throw new Error('Missing levelPercent reading');
  });

  await runTest('Telemetry', 'Update Tank Sensor Readings', async () => {
    if (!testTankId) return;
    const res = await request(`/app/tanks/${testTankId}/telemetry`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { levelPercent: 72, currentGallons: 3600, pressurePsi: 44 }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.levelPercent !== 72) throw new Error(`Expected level 72%, got ${res.data.levelPercent}%`);
  });

  // -------------------------------------------------------------------------
  // SUITE 5: CUSTOMER SELF-ORDERING (ZERO UNIT PRICE POLICY)
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 5: Customer Self-Ordering & Refill Requests');

  let createdOrderId = '';

  await runTest('Ordering', 'Submit Refill Order Request', async () => {
    const res = await request('/app/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        productId: 'prod-auto-1',
        product: 'ReNu N-CARE 32-0-0',
        gallons: 2500,
        ranchId: testRanchId,
        ranchName: 'Sierra Foothills Ranch',
        tankId: testTankId,
        tankName: 'Tank T-101',
        deliveryWindow: 'Tomorrow 8:00 AM - 12:00 PM',
        notes: 'Automation E2E test refill request. Gate Code #4921.'
      }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (!res.data.order && !res.data.delivery) throw new Error('No order confirmation returned');
    const order = res.data.order || res.data.delivery;
    createdOrderId = order.id || order.orderId;

    // Zero Unit Price Policy Check: Must not leak $/gallon or $/ton
    const orderStr = JSON.stringify(order).toLowerCase();
    if (orderStr.includes('$/ton') || orderStr.includes('$/gal') || orderStr.includes('unitprice')) {
      throw new Error('Policy violation: Unit price exposed in order payload');
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 6: OPTIMOROUTE DISPATCH & PROOF OF DELIVERY (POD)
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 6: OptimoRoute Dispatch & Proof of Delivery');

  await runTest('OptimoRoute', 'Update Delivery with OptimoRoute Dispatch Metadata', async () => {
    if (!createdOrderId) return;
    const res = await request(`/app/deliveries/${createdOrderId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: 'Out for delivery',
        optimoroute: {
          orderId: 'OR-AUTOMATION-99',
          driverName: 'Dave Miller',
          driverPhone: '(559) 555-0144',
          eta: '2:15 PM PST',
          status: 'in_transit'
        }
      }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await runTest('OptimoRoute', 'OptimoRoute Driver Webhook Simulation (Delivery Completed)', async () => {
    if (!createdOrderId) return;
    const res = await request('/app/webhooks/optimoroute', {
      method: 'POST',
      body: {
        orderId: createdOrderId,
        status: 'Delivered',
        driverName: 'Dave Miller',
        signatureName: 'Dave Miller (Driver)',
        geotag: { lat: 36.5963, lng: -119.4504, accuracy: 3 },
        deliveredGallons: 2500,
        completedAt: new Date().toISOString()
      }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.success !== true) throw new Error('Webhook execution not confirmed');
  });

  // -------------------------------------------------------------------------
  // SUITE 7: INVOICE PAYMENTS & QUICKBOOKS LIVE SYNC
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 7: Invoice Online Payments & QuickBooks 2-Way Live Sync');

  let targetInvoiceId = '';

  await runTest('Payments', 'Fetch Invoices & Locate Open Balance', async () => {
    const res = await request('/app/invoices', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data) || res.data.length === 0) throw new Error('No invoices returned');
    targetInvoiceId = res.data[0].id;
  });

  await runTest('Payments', 'Execute Online ACH Payment with Bank Authorization', async () => {
    if (!targetInvoiceId) return;
    const res = await request(`/app/invoices/${targetInvoiceId}/pay`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        paymentMethod: 'ACH',
        paymentDetails: {
          bankName: 'Farm Credit West',
          routingNumber: '121000358',
          accountLast4: '8841',
          accountType: 'Checking',
          authConfirmation: 'ACH-AUTH-2026-99412'
        }
      }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.invoice?.status !== 'Paid') throw new Error(`Expected invoice status 'Paid', got '${res.data.invoice?.status}'`);
  });

  await runTest('QuickBooks', 'Query QuickBooks Online Sync Health', async () => {
    const res = await request('/app/quickbooks/status', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.connected !== true) throw new Error('QuickBooks expected to be connected');
  });

  await runTest('QuickBooks', 'Trigger Manual QuickBooks Sync Now Action', async () => {
    const res = await request('/app/quickbooks/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.success !== true) throw new Error('QuickBooks sync did not return success');
  });

  // -------------------------------------------------------------------------
  // SUITE 8: SECTION 9.4 ILRP NITROGEN COMPLIANCE
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 8: Section 9.4 ILRP Nitrogen Compliance Reports');

  await runTest('Compliance', 'Fetch 2026 Nitrogen Report & Validate A/R Ratio Math', async () => {
    const res = await request('/app/compliance/nitrogen-report?season=2026', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const summary = res.data.summary;
    if (!summary) throw new Error('Missing compliance summary');
    if (typeof summary.overallRatio !== 'number') throw new Error('Missing overall A/R ratio');

    // Central Valley benchmark verification
    if (summary.overallRatio > 1.55) {
      throw new Error(`A/R ratio ${summary.overallRatio} exceeds allowable threshold`);
    }
  });

  await runTest('Compliance', 'Update Harvest Kernel Yield & Verify Recalculation', async () => {
    const res = await request('/app/compliance/yield', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { blockId: testBlockId || 'SF-1', yieldPerAcre: 2850 }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.success !== true) throw new Error('Failed to update yield');
  });

  await runTest('Compliance', 'Export Central Valley Coalition Compliance CSV', async () => {
    const res = await request('/app/compliance/export-csv?season=2026', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (typeof res.data !== 'string' || !res.data.includes('Block ID')) {
      throw new Error('Exported CSV missing required header fields');
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 9: DOCUMENTS, SDS & LEGAL DIGITAL SIGNATURES
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 9: Documents, SDS Vault & Digital E-Signatures');

  let masterContractId = '';

  await runTest('Documents', 'Fetch Regulatory Vault & Certificates', async () => {
    const res = await request('/app/documents', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data) || res.data.length === 0) throw new Error('No documents found');
    const contract = res.data.find((d: any) => d.type === 'CONTRACT' || d.title.includes('Agreement'));
    if (contract) masterContractId = contract.id;
  });

  await runTest('Documents', 'Execute Digital E-Signature on Agronomy Agreement', async () => {
    if (!masterContractId) return;
    const res = await request('/app/documents/sign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { documentId: masterContractId, signatureName: 'Sierra Agri Operations Exec' }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.document?.signed !== true) throw new Error('Document sign flag not set');
  });

  await runTest('Documents', 'Download Comprehensive Audit Pack', async () => {
    const res = await request('/app/documents/audit-pack', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // -------------------------------------------------------------------------
  // SUITE 10: IN-APP MESSAGING & DISPATCH CHAT
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 10: In-App Messaging & Agronomist Chat');

  let sentMessageId = '';

  await runTest('Messaging', 'Customer Dispatches In-App Message to Support', async () => {
    const res = await request('/app/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        title: 'Automation Check: Post-Harvest Fertigation Scheduling',
        body: 'Please confirm tanker dispatch window for Sierra Foothills Ranch Tank T-101.',
        toEmail: 'support@renu-biome.com'
      }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.message) throw new Error('Message confirmation not returned');
    sentMessageId = res.data.message.id;
  });

  await runTest('Messaging', 'Retrieve Message Thread & Mark Message Read', async () => {
    const res = await request('/app/messages', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Expected array of messages');

    if (sentMessageId) {
      const readRes = await request(`/app/messages/${sentMessageId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (readRes.status !== 200) throw new Error(`Failed to mark message read, status ${readRes.status}`);
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 11: FIELD STAFF TASKS & DISPATCH
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 11: Field Operations Staff Tasks & Dispatch');

  let createdTaskId = '';

  await runTest('StaffTasks', 'Admin Dispatches Maintenance Task to Field Staff', async () => {
    const res = await request('/app/admin/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Otodata Tank Level Sensor Calibration',
        description: 'Verify LTE-M transmitter antenna and calibrate zero-point gauge at Sierra Foothills Ranch.',
        ranchName: 'Sierra Foothills Ranch',
        assignedTo: 'employee@renu.com',
        priority: 'HIGH'
      }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.task) throw new Error('No task returned');
    createdTaskId = res.data.task.id;
  });

  await runTest('StaffTasks', 'Field Staff Retrieves Assigned Tasks', async () => {
    const res = await request('/app/tasks', {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data)) throw new Error('Expected tasks array');
  });

  await runTest('StaffTasks', 'Field Staff Updates Task Status to In-Progress / Completed', async () => {
    if (!createdTaskId) return;
    const res = await request(`/app/tasks/${createdTaskId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: { status: 'COMPLETED' }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // -------------------------------------------------------------------------
  // SUITE 12: AGRONOMY PRESCRIPTIONS & LAB SAMPLES
  // -------------------------------------------------------------------------
  console.log('\n📋 SUITE 12: Agronomy Prescriptions & Tissue Analysis');

  let testSampleId = '';

  await runTest('Recommendations', 'Fetch Lab Samples & Tissue Tests', async () => {
    const res = await request('/app/samples', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (Array.isArray(res.data) && res.data.length > 0) {
      testSampleId = res.data[0].id;
    }
  });

  await runTest('Recommendations', 'Submit Agronomist Prescription Recommendation', async () => {
    if (!testSampleId) return;
    const res = await request(`/app/samples/${testSampleId}/recommendation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        prescription: 'Apply 18 gal/ac ReNu N-CARE 32-0-0 via drip Set 1 during kernel fill stage.',
        agronomistName: 'Dr. Marcus Vance (Agronomy)',
        date: '2026-10-25'
      }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await runTest('Recommendations', 'Grower Posts Consultation Reply on Recommendation', async () => {
    if (!testSampleId) return;
    const res = await request(`/app/samples/${testSampleId}/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { question: 'Will this application timing align with our scheduled irrigation set on Tuesday?' }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // -------------------------------------------------------------------------
  // FINAL RESULTS REPORT
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('📊 AUTOMATION TEST RESULTS SUMMARY');
  console.log('========================================================================');

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`Total Tests Run:  ${total}`);
  console.log(`Passed:           ${passed} (${Math.round((passed / total) * 100)}%)`);
  console.log(`Failed:           ${failed}`);
  console.log(`Execution Time:   ${totalDuration}ms`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error('❌ Failures Encountered:');
    results.filter(r => r.status === 'FAILED').forEach(r => {
      console.error(`  - [${r.suite}] ${r.test}: ${r.details}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 ALL AUTOMATED FUNCTIONALITY TESTS PASSED SUCCESSFULLY! 100% PASS RATE.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
