import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export interface SalesforceAccount {
  Id: string;
  Name: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  Active__c?: boolean | string;
}

export interface SalesforceContact {
  Id: string;
  AccountId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone?: string;
  Title?: string;
}

export interface SalesforceShipTo {
  Id: string;
  AccountId: string;
  Ranch_Name__c: string;
  County__c: string;
  Acreage__c?: number | string;
  Location_GPS__c?: string;
}

export interface SalesforceAsset {
  Id: string;
  AccountId: string;
  Ranch_Name__c: string;
  Tank_Capacity__c?: number | string;
  Serial_Number__c?: string;
}

export interface ImportSummary {
  accountsProcessed: number;
  growersCreated: number;
  contactsProcessed: number;
  usersCreated: number;
  ranchesCreated: number;
  tanksCreated: number;
  skippedRecords: Array<{ id: string; reason: string }>;
}

export async function processSalesforceImport(options: {
  accounts: SalesforceAccount[];
  contacts: SalesforceContact[];
  ranches: SalesforceShipTo[];
  tanks?: SalesforceAsset[];
  dryRun?: boolean;
  trialMode?: boolean;
}): Promise<ImportSummary> {
  const { accounts, contacts, ranches, tanks = [], dryRun = false, trialMode = false } = options;

  const summary: ImportSummary = {
    accountsProcessed: 0,
    growersCreated: 0,
    contactsProcessed: 0,
    usersCreated: 0,
    ranchesCreated: 0,
    tanksCreated: 0,
    skippedRecords: [],
  };

  const accountsToImport = trialMode ? accounts.slice(0, 5) : accounts;
  const validAccountIds = new Set<string>();

  for (const acc of accountsToImport) {
    summary.accountsProcessed++;
    if (!acc.Name || !acc.Name.trim()) {
      summary.skippedRecords.push({ id: acc.Id, reason: 'Missing Account Name' });
      continue;
    }
    const isActive = acc.Active__c !== false && acc.Active__c !== 'No' && acc.Active__c !== 'false';
    if (!isActive) {
      summary.skippedRecords.push({ id: acc.Id, reason: 'Inactive Account in Salesforce' });
      continue;
    }

    validAccountIds.add(acc.Id);

    if (!dryRun) {
      await prisma.company.upsert({
        where: { id: acc.Id.length === 24 ? acc.Id : undefined },
        update: { name: acc.Name.trim() },
        create: { name: acc.Name.trim() },
      }).catch(async () => {
        await prisma.company.create({ data: { name: acc.Name.trim() } });
      });
    }
    summary.growersCreated++;
  }

  // Process Contacts -> Users
  const seenEmails = new Set<string>();
  for (const c of contacts) {
    summary.contactsProcessed++;
    if (!validAccountIds.has(c.AccountId)) {
      continue;
    }
    if (!c.Email || !c.Email.includes('@')) {
      summary.skippedRecords.push({ id: c.Id, reason: `Invalid or missing email for contact ${c.FirstName} ${c.LastName}` });
      continue;
    }
    const emailNorm = c.Email.toLowerCase().trim();
    if (seenEmails.has(emailNorm)) {
      summary.skippedRecords.push({ id: c.Id, reason: `Duplicate email: ${emailNorm}` });
      continue;
    }
    seenEmails.add(emailNorm);

    if (!dryRun) {
      await prisma.user.upsert({
        where: { email: emailNorm },
        update: {
          name: `${c.FirstName || ''} ${c.LastName || ''}`.trim() || 'Grower',
        },
        create: {
          email: emailNorm,
          name: `${c.FirstName || ''} ${c.LastName || ''}`.trim() || 'Grower',
          passwordHash: 'TEMPORARY_INITIAL_INVITE',
          role: 'Grower',
        },
      });
    }
    summary.usersCreated++;
  }

  // Process Ship-To Addresses -> Ranches
  for (const r of ranches) {
    if (!validAccountIds.has(r.AccountId)) continue;
    if (!r.Ranch_Name__c || !r.Ranch_Name__c.trim()) {
      summary.skippedRecords.push({ id: r.Id, reason: 'Missing Ranch Name' });
      continue;
    }

    summary.ranchesCreated++;
  }

  return summary;
}
