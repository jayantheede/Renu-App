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
    const med = addMedicineToTank('tank-1-1', {
      name: 'ReNu Micro-Zinc Chelate',
      dosage: '10 Gallons',
      type: 'Micro-Nutrient',
      batchNumber: 'LOT-9921',
      targetDeficiency: 'Mid-summer zinc drop',
      notes: 'Injected alongside primary drip cycle',
    });

    expect(med).toBeDefined();
    expect(med?.name).toBe('ReNu Micro-Zinc Chelate');

    const medId = med!.id;
    const deleted = deleteMedicineFromTank('tank-1-1', medId);
    expect(deleted).toBe(true);
  });

  it('should update tracker configuration for a tank', async () => {
    const tracker = updateTankTracker('tank-1-1', {
      serialNumber: 'OTO-CUSTOM-88',
      cellularUnitId: 'LTE-M-CUSTOM',
      reorderThresholdPercent: 30,
    });

    expect(tracker).toBeDefined();
    expect(tracker?.serialNumber).toBe('OTO-CUSTOM-88');
    expect(tracker?.reorderThresholdPercent).toBe(30);
  });

  it('should add and delete reports with attached documents on a tank', async () => {
    const report = addReportToTank('tank-1-1', {
      title: 'Spring 2026 Tank Calibration & Pressure Audit',
      reportType: 'Maintenance & Sensor Check',
      notes: 'Verified transducer pressure: 42 PSI',
      fileName: 'Tank_Calibration_Audit.xlsx',
      fileData: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQAAAAIA...',
    });

    expect(report).toBeDefined();
    expect(report?.title).toBe('Spring 2026 Tank Calibration & Pressure Audit');
    expect(report?.fileName).toBe('Tank_Calibration_Audit.xlsx');

    const reportId = report!.id;
    const deleted = deleteReportFromTank('tank-1-1', reportId);
    expect(deleted).toBe(true);
  });

  it('should submit a lab assay result with document attachment in any format (DOCX, XLSX, PDF, PNG)', async () => {
    const samplePayload = {
      ranchId: 'ranch-1',
      blockId: 'Block-01',
      sampleType: 'leaf tissue' as const,
      sampleDate: '2026-10-25',
      labName: 'Dellavalle Laboratory Inc.',
      customerNotes: 'Attached complete soil chemistry spreadsheet and PDF summary.',
      pdfFileName: 'Dellavalle_Tissue_Analysis_2026.docx',
      pdfData: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQAAAA...',
      documentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      documentSize: '48.2 KB',
    };

    const sample = createSample(samplePayload, 'customer@renu.com');

    expect(sample).toBeDefined();
    expect(sample.id).toBeDefined();
    expect(sample.pdfFileName).toBe('Dellavalle_Tissue_Analysis_2026.docx');
    expect(sample.documentType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(sample.documentSize).toBe('48.2 KB');
  });
});
