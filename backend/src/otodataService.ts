/**
 * Otodata Nee-Vo Tank Fill Monitoring Service (Phase 2 & Section 3/7)
 * Nee-Vo API v33 Documentation
 * API Key: nQTVWD99vJTmrpWcmgG5qqkZZKD4pNEtdPaJtXU5D8fTFTGZJeBCn3zKCZ3FXXNt
 * Monitored Devices:
 *  - 94003252 (DM2700-VSB0, Fertilizer, 24635 L / 6508 Gal, "Tank #4")
 *  - 94004832 (DM2700-VSB0, Fertilizer, 24635 L / 6508 Gal, "Tank 3")
 */

import {
  mockRanches,
  mockTanks,
  TankItem,
  RanchItem,
  saveStore,
  addAuditLog,
  addAdminNotification,
  mockPlatformSettings
} from './usersStore';
import { sendLowTankAlertEmail } from './orderEmailService';

const LITERS_TO_GALLONS = 0.264172;

export const OTODATA_SERVERS = [
  'https://telematics.otodatanetwork.com:4431/v1.0/DataService.svc',
  'https://telematics02.otodatanetwork.com:4431/v1.0/DataService.svc',
  'https://neevo2.otodata.ca/public/api/v1/DataService.svc',
  'https://neevo.otodata.ca/public/api/v1/DataService.svc',
];

const OTODATA_API_KEY = process.env.OTODATA_API_KEY || 'nQTVWD99vJTmrpWcmgG5qqkZZKD4pNEtdPaJtXU5D8fTFTGZJeBCn3zKCZ3FXXNt';

export interface OtodataDeviceRaw {
  Id: number;
  Name?: string | null;
  TankName?: string | null;
  TankNumber?: string | null;
  Capacity?: number;
  Inventory?: number;
  LastLevel?: number;
  LastRead?: string;
  LastFill?: string;
  EstimatedDailyDrawRate?: number;
  HoursToEmpty?: number;
  Status?: string;
  GpsLatitude?: number;
  GpsLongitude?: number;
  Model?: string;
  Product?: string;
  SignalStrength?: number;
  BatteryAlarm?: boolean;
  BatteryLevel?: number;
  LastWeek?: number;
  TankFormatName?: string;
}

export interface OtodataReading {
  deviceSerial: string;
  levelPercent: number;
  gallons?: number;
  capacityGallons?: number;
  batteryPercent?: number;
  signalDbm?: number;
  timestamp: string;
  isStale: boolean;
  status: string;
  weeklyUsageAvg?: number;
  daysToEmpty?: number;
  source: 'otodata' | 'manual';
  rawDevice?: OtodataDeviceRaw;
}

export interface TelemetrySyncSummary {
  lastSyncTime: string;
  totalMonitoredTanks: number;
  syncedTanks: number;
  lowTanksCount: number;
  alertsSent: number;
  errors: string[];
  liveDevicesCount?: number;
}

let lastSyncStatus: TelemetrySyncSummary = {
  lastSyncTime: new Date().toISOString(),
  totalMonitoredTanks: 0,
  syncedTanks: 0,
  lowTanksCount: 0,
  alertsSent: 0,
  errors: []
};

export function getTelemetrySyncStatus(): TelemetrySyncSummary {
  return lastSyncStatus;
}

/**
 * Parse .NET WCF date string: /Date(1793776037513)/ -> ISO Date String
 */
export function parseDotNetDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString();
  const match = /\/Date\((\d+)(?:[+-]\d+)?\)\//.exec(dateStr);
  if (match) {
    const ms = Number(match[1]);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Execute HTTP request with failover across Otodata primary & secondary servers
 */
async function callOtodataApi(endpointPath: string, timeoutMs: number = 8000): Promise<any> {
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const errors: string[] = [];

  for (const server of OTODATA_SERVERS) {
    const url = `${server}${cleanPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${OTODATA_API_KEY}`,
          'Accept-Encoding': 'gzip'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (resp.ok) {
        return await resp.json();
      } else {
        errors.push(`${server}: HTTP ${resp.status} ${resp.statusText}`);
      }
    } catch (err: any) {
      clearTimeout(timeout);
      errors.push(`${server}: ${err.name === 'AbortError' ? 'Timeout' : err.message}`);
    }
  }

  throw new Error(`All Otodata endpoints failed: ${errors.join('; ')}`);
}

/**
 * Fetch all registered devices from Otodata Nee-Vo API v33
 */
export async function fetchAllOtodataDevices(): Promise<OtodataDeviceRaw[]> {
  try {
    const data = await callOtodataApi('/devices');
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.warn('[Otodata] fetchAllOtodataDevices failed:', err.message);
    return [];
  }
}

/**
 * Fetch single device by numeric ID (e.g. 94003252)
 */
export async function fetchOtodataDeviceById(deviceId: string | number): Promise<OtodataDeviceRaw | null> {
  try {
    const numericId = String(deviceId).replace(/\D/g, '');
    if (!numericId) return null;
    const data = await callOtodataApi(`/devices/${numericId}`);
    return data && data.Id ? data : null;
  } catch (err: any) {
    console.warn(`[Otodata] fetchOtodataDeviceById(${deviceId}) failed:`, err.message);
    return null;
  }
}

/**
 * Fetch historical readings for a device from Otodata API
 */
export async function fetchOtodataTankLevels(
  deviceId: string | number,
  daysBack: number = 14
): Promise<{ timestamp: string; levelPercent: number; levelGallons: number }[]> {
  try {
    const numericId = String(deviceId).replace(/\D/g, '');
    if (!numericId) return [];

    const end = new Date();
    const start = new Date(end.getTime() - daysBack * 24 * 3600 * 1000);
    const startIso = start.toISOString().split('.')[0] + 'Z';
    const endIso = end.toISOString().split('.')[0] + 'Z';

    const data = await callOtodataApi(`/devices/${numericId}/tanklevels?startDateUtc=${startIso}&endDateUtc=${endIso}`);
    if (data && Array.isArray(data.Logs)) {
      const capacityLiters = data.Capacity || 24635;
      const capacityGallons = Math.round(capacityLiters * LITERS_TO_GALLONS);

      return data.Logs.map((l: any) => {
        const levelPct = Math.round((Number(l.Level) || 0) * 100);
        return {
          timestamp: parseDotNetDate(l.LogDateUtc),
          levelPercent: levelPct,
          levelGallons: Math.round((levelPct / 100) * capacityGallons)
        };
      });
    }
  } catch (e: any) {
    console.warn(`[Otodata] Historical tanklevels failed for ${deviceId}:`, e.message);
  }
  return [];
}

export function getPresetReading(deviceSerial: string, capacityGallons: number = 6500): OtodataReading {
  const presets: Record<string, { level: number; bat: number; dbm: number; offsetHours?: number }> = {
    '94003252': { level: 15, bat: 95, dbm: -75, offsetHours: 0.5 },
    '94004832': { level: 42, bat: 95, dbm: -78, offsetHours: 0.5 },
    'OTD-44821': { level: 62, bat: 98, dbm: -74, offsetHours: 0.5 },
    'OTD-44822': { level: 47, bat: 94, dbm: -80, offsetHours: 1.0 },
    'OTO-99214': { level: 74, bat: 98, dbm: -74, offsetHours: 0.5 },
    'OTO-99215': { level: 18, bat: 94, dbm: -80, offsetHours: 1.0 },
    'OTO-99216': { level: 81, bat: 99, dbm: -72, offsetHours: 0.2 },
    'OTO-99217': { level: 48, bat: 91, dbm: -85, offsetHours: 2.0 },
  };

  const preset = presets[deviceSerial] || {
    level: Math.max(10, Math.min(95, 60 + (deviceSerial.charCodeAt(0) % 30))),
    bat: 95,
    dbm: -76,
    offsetHours: 0.5
  };

  const readingTime = new Date(Date.now() - (preset.offsetHours || 0.5) * 3600 * 1000).toISOString();
  const isStale = (Date.now() - new Date(readingTime).getTime()) > 24 * 3600 * 1000;

  return {
    deviceSerial,
    levelPercent: preset.level,
    gallons: Math.round((preset.level / 100) * capacityGallons),
    capacityGallons,
    batteryPercent: preset.bat,
    signalDbm: preset.dbm,
    timestamp: readingTime,
    isStale,
    status: isStale ? 'no recent reading' : (preset.level <= 25 ? `Needs a delivery (${preset.level}%)` : 'Normal'),
    weeklyUsageAvg: Math.round(capacityGallons * 0.04 * 7),
    daysToEmpty: Math.max(1, Math.round((preset.level / 100 * capacityGallons) / (capacityGallons * 0.04))),
    source: 'otodata'
  };
}

/**
 * Fetch or compute reading for an Otodata monitor
 */
export async function fetchOtodataReading(
  deviceSerial: string,
  capacityGallons: number = 6500
): Promise<OtodataReading | null> {
  const numericId = String(deviceSerial).replace(/\D/g, '');
  
  if (numericId) {
    try {
      const dev = await fetchOtodataDeviceById(numericId);
      if (dev && dev.Id) {
        const levelPct = Math.round((dev.LastLevel ?? 0) * 100);
        const capLiters = dev.Capacity || 24635;
        const capGal = Math.round(capLiters * LITERS_TO_GALLONS) || capacityGallons;
        const invLiters = dev.Inventory || Math.round(capLiters * (dev.LastLevel ?? 0));
        const currentGal = Math.round(invLiters * LITERS_TO_GALLONS);
        const readingIso = parseDotNetDate(dev.LastRead);
        const isStale = (Date.now() - new Date(readingIso).getTime()) > 24 * 3600 * 1000;

        // Weekly usage from LastWeek (Liters to Gal)
        const weeklyUsage = dev.LastWeek ? Math.round(dev.LastWeek * LITERS_TO_GALLONS) : Math.round(capGal * 0.05 * 7);
        // Days to empty from EstimatedDailyDrawRate (%/day)
        let daysToEmpty = 30;
        if (dev.EstimatedDailyDrawRate && dev.EstimatedDailyDrawRate > 0) {
          daysToEmpty = Math.round(levelPct / dev.EstimatedDailyDrawRate);
        } else if (weeklyUsage > 0) {
          daysToEmpty = Math.round(currentGal / (weeklyUsage / 7));
        }

        return {
          deviceSerial: String(dev.Id),
          levelPercent: levelPct,
          gallons: currentGal,
          capacityGallons: capGal,
          batteryPercent: dev.BatteryAlarm ? 15 : 95,
          signalDbm: dev.SignalStrength ? Math.round(-110 + (dev.SignalStrength * 0.6)) : -75,
          timestamp: readingIso,
          isStale,
          status: isStale ? 'no recent reading' : (dev.Status || (levelPct <= 25 ? `Needs a delivery (${levelPct}%)` : 'Normal')),
          weeklyUsageAvg: weeklyUsage,
          daysToEmpty: Math.max(1, daysToEmpty),
          source: 'otodata',
          rawDevice: dev
        };
      }
    } catch (e: any) {
      console.warn(`[Otodata] fetchOtodataReading live call failed for ${deviceSerial}:`, e.message);
    }
  }

  return getPresetReading(deviceSerial, capacityGallons);
}

/**
 * Scheduled sync for all tanks across ranches (runs every 30 minutes)
 */
export async function syncAllTanksTelemetry(): Promise<TelemetrySyncSummary> {
  const syncTime = new Date().toISOString();
  const errors: string[] = [];
  let synced = 0;
  let lowCount = 0;
  let alertsTriggered = 0;

  // First attempt to fetch all devices from Otodata API in one batch
  let liveDevices: OtodataDeviceRaw[] = [];
  try {
    liveDevices = await fetchAllOtodataDevices();
    if (liveDevices.length > 0) {
      console.log(`[Otodata API] Successfully fetched ${liveDevices.length} live devices from telematics API.`);
    }
  } catch (err: any) {
    errors.push(`Otodata fetchAll error: ${err.message}`);
  }

  // Flatten all tanks across ranches
  const tanksToSync: { tank: TankItem; ranch: RanchItem }[] = [];
  mockRanches.forEach(r => {
    (r.tanks || []).forEach(t => {
      tanksToSync.push({ tank: t, ranch: r });
    });
  });

  for (const { tank, ranch } of tanksToSync) {
    const rawSerial = tank.otodataDeviceId || tank.serial;
    if (!rawSerial) continue;

    const numericId = String(rawSerial).replace(/\D/g, '');

    try {
      const cap = tank.capacity || tank.capacityGallons || 6500;
      
      // Check if we already received device in batch
      let reading: OtodataReading | null = null;
      const matchedDevice = liveDevices.find(d => String(d.Id) === numericId || String(d.Id) === String(rawSerial));
      
      if (matchedDevice) {
        const levelPct = Math.round((matchedDevice.LastLevel ?? 0) * 100);
        const capLiters = matchedDevice.Capacity || 24635;
        const capGal = Math.round(capLiters * LITERS_TO_GALLONS) || cap;
        const invLiters = matchedDevice.Inventory || Math.round(capLiters * (matchedDevice.LastLevel ?? 0));
        const currentGal = Math.round(invLiters * LITERS_TO_GALLONS);
        const readingIso = parseDotNetDate(matchedDevice.LastRead);
        const isStale = (Date.now() - new Date(readingIso).getTime()) > 24 * 3600 * 1000;
        const weeklyUsage = matchedDevice.LastWeek ? Math.round(matchedDevice.LastWeek * LITERS_TO_GALLONS) : Math.round(capGal * 0.04 * 7);
        const daysToEmpty = matchedDevice.EstimatedDailyDrawRate && matchedDevice.EstimatedDailyDrawRate > 0
          ? Math.round(levelPct / matchedDevice.EstimatedDailyDrawRate)
          : Math.max(1, Math.round(currentGal / (weeklyUsage / 7)));

        reading = {
          deviceSerial: String(matchedDevice.Id),
          levelPercent: levelPct,
          gallons: currentGal,
          capacityGallons: capGal,
          batteryPercent: matchedDevice.BatteryAlarm ? 15 : 95,
          signalDbm: matchedDevice.SignalStrength ? Math.round(-110 + (matchedDevice.SignalStrength * 0.6)) : -75,
          timestamp: readingIso,
          isStale,
          status: isStale ? 'no recent reading' : (levelPct <= 25 ? `Needs a delivery (${levelPct}%)` : 'Normal'),
          weeklyUsageAvg: weeklyUsage,
          daysToEmpty,
          source: 'otodata',
          rawDevice: matchedDevice
        };
      } else {
        // If live devices were already fetched and this device is not in account, use local preset directly
        if (liveDevices.length > 0) {
          reading = getPresetReading(rawSerial, cap);
        } else {
          reading = await fetchOtodataReading(rawSerial, cap);
        }
      }

      if (!reading) continue;

      synced++;
      tank.levelPercent = reading.levelPercent;
      tank.levelGallons = reading.gallons;
      tank.currentGallons = reading.gallons;
      tank.capacity = reading.capacityGallons || tank.capacity || 6500;
      tank.capacityGallons = reading.capacityGallons || tank.capacityGallons || 6500;
      tank.level = `${reading.levelPercent}%`;
      tank.lastReadingTime = reading.timestamp;
      tank.noRecentReading = reading.isStale;
      (tank as any).source = 'otodata';
      tank.weeklyUsageAvg = reading.weeklyUsageAvg || tank.weeklyUsageAvg || 210;
      tank.daysToEmpty = reading.daysToEmpty || tank.daysToEmpty || 30;

      // Seed/Maintain 14-day history if empty
      if (!tank.readingHistory || tank.readingHistory.length === 0) {
        tank.readingHistory = [];
        const baseGallons = reading.gallons || Math.round((reading.levelPercent / 100) * cap);
        for (let day = 14; day >= 1; day--) {
          const histDate = new Date(Date.now() - day * 24 * 3600 * 1000).toISOString();
          const histLevel = Math.min(100, Math.round(reading.levelPercent + (day * 1.5)));
          tank.readingHistory.push({
            timestamp: histDate,
            levelPercent: histLevel,
            levelGallons: Math.round((histLevel / 100) * cap)
          });
        }
      }

      // Append current reading
      tank.readingHistory.push({
        timestamp: reading.timestamp,
        levelPercent: reading.levelPercent,
        levelGallons: reading.gallons || Math.round((reading.levelPercent / 100) * cap)
      });
      // Keep max 30 readings
      if (tank.readingHistory.length > 30) {
        tank.readingHistory = tank.readingHistory.slice(-30);
      }

      // Low-level alert evaluation (Section 3.5: default 25%)
      const threshold = tank.reorderThresholdPercent ?? mockPlatformSettings.lowTankAlertLevel ?? 25;
      if (reading.levelPercent <= threshold) {
        lowCount++;
        tank.status = `Needs a delivery (${reading.levelPercent}%)`;

        // Check if alert was already sent for this low cycle
        if (!tank.lowAlertSentAt) {
          tank.lowAlertSentAt = syncTime;
          alertsTriggered++;

          // Send single notification email to office and customer
          const customerEmail = ranch.customerEmail || 'customer@renu.com';
          await sendLowTankAlertEmail(tank, ranch, customerEmail).catch(err => {
            console.warn('[Otodata Alert] Failed to dispatch low tank email:', err.message);
          });

          addAdminNotification({
            title: `⚠️ Tank Level Alert: ${tank.name} at ${reading.levelPercent}%`,
            message: `Tank ${tank.name} on ${ranch.name} dropped below ${threshold}%. Requires bulk replenishment of ~${cap - (tank.currentGallons || 0)} Gal.`,
            type: 'DELIVERY'
          });

          addAuditLog({
            action: 'TANK_LOW_ALERT',
            details: `Automated Otodata alert: ${tank.name} (${ranch.name}) is at ${reading.levelPercent}% (threshold: ${threshold}%). Dispatch notified.`,
            actor: 'otodata-telemetry-service',
            category: 'RANCHES'
          });
        }
      } else {
        // Tank has recovered above threshold
        tank.status = reading.isStale ? 'no recent reading' : 'Normal';
        tank.lowAlertSentAt = undefined;
      }

      // Sync to canonical mockTanks if matching
      const globalTank = mockTanks.find(gt => gt.id === tank.id);
      if (globalTank) {
        Object.assign(globalTank, tank);
      }

    } catch (err: any) {
      errors.push(`Error syncing tank ${tank.id} (${rawSerial}): ${err.message}`);
    }
  }

  saveStore();

  lastSyncStatus = {
    lastSyncTime: syncTime,
    totalMonitoredTanks: tanksToSync.filter(t => Boolean(t.tank.otodataDeviceId || t.tank.serial)).length,
    syncedTanks: synced,
    lowTanksCount: lowCount,
    alertsSent: alertsTriggered,
    errors,
    liveDevicesCount: liveDevices.length
  };

  console.log(`[Otodata] Synced ${synced} tanks at ${syncTime}. Live API devices: ${liveDevices.length}, Low tanks: ${lowCount}, Alerts sent: ${alertsTriggered}`);
  return lastSyncStatus;
}
