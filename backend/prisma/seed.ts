require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.block.deleteMany({});
  await prisma.ranch.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.entity.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.recommendation.deleteMany({});

  console.log('Seeding entities...');
  const e1 = await prisma.entity.create({
    data: {
      name: "Sierra Orchards, LLC",
      sub: "Grower portal",
      bal: 50385
    }
  });

  const e2 = await prisma.entity.create({
    data: {
      name: "Rio Vista Vineyards",
      sub: "Grower portal",
      bal: 4310
    }
  });

  console.log('Seeding ranches and blocks...');
  const r1 = await prisma.ranch.create({
    data: {
      entId: e1.id,
      name: "Home Ranch",
      county: "Solano",
      ac: 340
    }
  });

  await prisma.block.createMany({
    data: [
      { ranchId: r1.id, name: "N-4", crop: "Almond", var: "Nonpareil", ac: 42, yr: 2012, set: 3 },
      { ranchId: r1.id, name: "N-3", crop: "Almond", var: "Monterey", ac: 38, yr: 2012, set: 3 },
      { ranchId: r1.id, name: "N-1", crop: "Almond", var: "Nonpareil", ac: 55, yr: 2008, set: 2 },
      { ranchId: r1.id, name: "N-2", crop: "Almond", var: "Fritz", ac: 55, yr: 2008, set: 2 },
      { ranchId: r1.id, name: "S-1", crop: "Almond", var: "Nonpareil", ac: 60, yr: 2015, set: 4 }
    ]
  });

  console.log('Seeding invoices...');
  await prisma.invoice.createMany({
    data: [
      { entId: e1.id, invoiceId: "INV-10482", dt: new Date("2026-09-10"), due: new Date("2026-10-10"), amt: 18420, st: "open" },
      { entId: e1.id, invoiceId: "INV-10470", dt: new Date("2026-08-15"), due: new Date("2026-09-15"), amt: 31965, st: "open" },
      { entId: e2.id, invoiceId: "INV-10485", dt: new Date("2026-09-11"), due: new Date("2026-10-11"), amt: 4310, st: "open" },
      { entId: e1.id, invoiceId: "INV-10390", dt: new Date("2026-05-01"), due: new Date("2026-06-01"), amt: 12050, st: "paid" }
    ]
  });

  console.log('Seeding orders...');
  await prisma.order.createMany({
    data: [
      { orderId: "1028", step: 3, product: "Green Nitrogen", qty: "4,000 gal", amt: 14000, window: "Today" },
      { orderId: "1027", step: 4, product: "Peptide Nutrition", qty: "2 totes", amt: 850, window: "Aug 20" },
      { orderId: "1026", step: 4, product: "KTS", qty: "4,500 gal", amt: 21500, window: "Jul 15" }
    ]
  });

  console.log('Seeding messages...');
  await prisma.message.createMany({
    data: [
      { title: "New recommendation", sub: "Block N-4, post-harvest N and K", when: "Yesterday", dot: "on" },
      { title: "Lab results received", sub: "July leaf tissue, 5 blocks", when: "Sep 12", dot: "" },
      { title: "Contract expiring", sub: "2026 price agreement ends Dec 31.", when: "Sep 10", dot: "warn" }
    ]
  });

  console.log('Database seeded successfully!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
