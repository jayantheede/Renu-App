import request from 'supertest';
import express from 'express';
import { router } from '../src/routes';
import {
  getRanchesForCustomer,
  addMedicineToTank,
  deleteMedicineFromTank,
  updateTankTracker,
  addReportToTank,
  deleteReportFromTank,
  createSample,
  getSamplesForCustomer,
} from '../src/usersStore';

const app = express();
app.use(express.json());
app.use('/api', router);

describe('Tank Operations & Multi-Customer Tank Hub Integration', () => {
  it('should retrieve customer ranches with differentiated tanks, medicines, trackers, and reports', () => {
    const growerRanches = getRanchesForCustomer('customer@renu.com', 'grower');
    expect(growerRanches.length).toBeGreaterThan(0);
    const sierraRanch = growerRanches.find((r) => r.id === 'ranch-1');
    expect(sierraRanch).toBeDefined();
    expect(sierraRanch?.tanks).toBeDefined();
    expect(sierraRanch?.tanks?.length).toBeGreaterThan(0);

    const firstTank = sierraRanch?.tanks?.[0];
    expect(firstTank).toBeDefined();
    expect(Array.isArray(firstTank?.medicines)).toBe(true);
    expect(Array.isArray(firstTank?.reports)).toBe(true);
    expect(Array.isArray(firstTank?.trackers)).toBe(true);
  });

  it('should add and delete medicine on a specific customer tank', async () => {
    const res = await request(app)
      .post('/api/tanks/tank-1-1/medicines')
      .set('Authorization', 'Bearer mock_token')
      .send({
        name: 'ReNu Micro-Zinc Chelate',
        dosage: '10 Gallons',
        type: 'Micro-Nutrient',
        batchNumber: 'LOT-9921',
        targetDeficiency: 'Mid-summer zinc drop',
        notes: 'Injected alongside primary drip cycle',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.medicine).toBeDefined();
    expect(res.body.medicine.name).toBe('ReNu Micro-Zinc Chelate');

    const medId = res.body.medicine.id;

    // Delete medicine
    const delRes = await request(app)
      .delete(`/api/tanks/tank-1-1/medicines/${medId}`)
      .set('Authorization', 'Bearer mock_token');
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  it('should update tracker configuration for a tank', async () => {
    const res = await request(app)
      .post('/api/tanks/tank-1-1/trackers')
      .set('Authorization', 'Bearer mock_token')
      .send({
        serialNumber: 'OTO-CUSTOM-88',
        cellularUnitId: 'LTE-M-CUSTOM',
        reorderThresholdPercent: 30,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tracker.serialNumber).toBe('OTO-CUSTOM-88');
    expect(res.body.tracker.reorderThresholdPercent).toBe(30);
  });

  it('should add and delete reports with attached documents on a tank', async () => {
    const res = await request(app)
      .post('/api/tanks/tank-1-1/reports')
      .set('Authorization', 'Bearer mock_token')
      .send({
        title: 'Spring 2026 Tank Calibration & Pressure Audit',
        reportType: 'Maintenance & Sensor Check',
        notes: 'Verified transducer pressure: 42 PSI',
        fileName: 'Tank_Calibration_Audit.xlsx',
        fileData: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQAAAAIA...',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report.title).toBe('Spring 2026 Tank Calibration & Pressure Audit');
    expect(res.body.report.fileName).toBe('Tank_Calibration_Audit.xlsx');

    const reportId = res.body.report.id;
    const delRes = await request(app)
      .delete(`/api/tanks/tank-1-1/reports/${reportId}`)
      .set('Authorization', 'Bearer mock_token');
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  it('should submit a lab assay result with document attachment in any format (DOCX, XLSX, PDF, PNG)', async () => {
    const samplePayload = {
      ranchId: 'ranch-1',
      blockId: 'Block-01',
      sampleType: 'Leaf tissue',
      samplingDate: '2026-10-25',
      labName: 'Dellavalle Laboratory Inc.',
      customerNotes: 'Attached complete soil chemistry spreadsheet and PDF summary.',
      pdfFileName: 'Dellavalle_Tissue_Analysis_2026.docx',
      pdfData: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQAAAA...',
      documentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      documentSize: '48.2 KB',
    };

    const res = await request(app)
      .post('/api/samples')
      .set('Authorization', 'Bearer mock_token')
      .send(samplePayload);

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.pdfFileName).toBe('Dellavalle_Tissue_Analysis_2026.docx');
    expect(res.body.documentType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(res.body.documentSize).toBe('48.2 KB');
  });
});
