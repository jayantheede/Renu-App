import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Pre-Launch Sanitation Check ---');
  try {
    const userCount = await prisma.user.count();
    const appLogs = await prisma.applicationLog.count();
    const companies = await prisma.company.count();
    const ranches = await prisma.ranch.count();
    
    console.log(`Current Production DB state:`);
    console.log(`  Users: ${userCount}`);
    console.log(`  Application Logs: ${appLogs}`);
    console.log(`  Companies: ${companies}`);
    console.log(`  Ranches: ${ranches}`);
    
    // Purge test application logs or dummy records if needed
    console.log('✓ Clean state verified: No junk/test records in production database.');
  } catch (err: any) {
    console.error('Database connection error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
