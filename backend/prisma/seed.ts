import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const PASSWORD = await bcrypt.hash('password123', 10);

  // ── HQ ──────────────────────────────────────────────────────────────
  const hq = await prisma.user.upsert({
    where: { email: 'hq@voltdispatch.app' },
    update: {},
    create: {
      email: 'hq@voltdispatch.app',
      passwordHash: PASSWORD,
      role: 'HQ',
      isActive: true,
    },
  });
  console.log(`HQ: ${hq.email} / password123`);

  // ── COORDINATOR ─────────────────────────────────────────────────────
  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinator@volt.dev' },
    update: {},
    create: {
      email: 'coordinator@volt.dev',
      passwordHash: PASSWORD,
      role: 'COORDINATOR',
      isActive: true,
    },
  });
  await prisma.coordinator.upsert({
    where: { userId: coordinator.id },
    update: {},
    create: { userId: coordinator.id, department: 'Service' },
  });
  console.log(`COORDINATOR: ${coordinator.email} / password123`);

  // ── TECHNICIAN ─────────────────────────────────────────────────────
  const technician = await prisma.user.upsert({
    where: { email: 'tech@volt.dev' },
    update: {},
    create: {
      email: 'tech@volt.dev',
      passwordHash: PASSWORD,
      role: 'TECHNICIAN',
      isActive: true,
    },
  });
  const techProfile = await prisma.technician.upsert({
    where: { userId: technician.id },
    update: {},
    create: {
      userId: technician.id,
      district: 'Bangkok',
      subDistrict: 'Sukhumvit',
      zipCode: '10110',
      status: 'AVAILABLE',
    },
  });
  console.log(`TECHNICIAN: ${technician.email} / password123`);

  // ── DEALER ──────────────────────────────────────────────────────────
  const dealer = await prisma.user.upsert({
    where: { email: 'dealer@volt.dev' },
    update: {},
    create: {
      email: 'dealer@volt.dev',
      passwordHash: PASSWORD,
      role: 'DEALER',
      isActive: true,
    },
  });
  const dealerProfile = await prisma.dealer.upsert({
    where: { userId: dealer.id },
    update: {},
    create: {
      userId: dealer.id,
      companyName: 'VoltDealer Co.',
      contactInfo: { address: '123 Bangkok St', phone: '021234567' },
    },
  });
  console.log(`DEALER: ${dealer.email} / password123`);

  // ── CUSTOMER ────────────────────────────────────────────────────────
  const customer = await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Customer',
      email: 'kullatorn.chai@gmail.com',
      phone: '0812345678',
      address: '456 Test Rd, Bangkok',
      subDistrict: 'Sukhumvit',
    },
  });
  console.log(`CUSTOMER: ${customer.email}`);

  // ── DEVICE (linked to dealer) ───────────────────────────────────────
  const device = await prisma.device.upsert({
    where: { serialNumber: 'SEED-DEVICE-001' },
    update: {},
    create: {
      dealerId: dealerProfile.id,
      model: 'VC-2000',
      serialNumber: 'SEED-DEVICE-001',
    },
  });
  console.log(`DEVICE: ${device.serialNumber}`);

  // ── WORK ORDER (dealer -> customer -> technician -> device) ────────
  const workOrder = await prisma.workOrder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      dealerId: dealerProfile.id,
      customerId: customer.id,
      technicianId: techProfile.id,
      deviceId: device.id,
      status: 'ASSIGNED',
      priority: 0,
      subDistrict: 'Sukhumvit',
      department: 'Service',
      appointmentDate: new Date('2026-07-10T09:00:00Z'),
    },
  });
  console.log(`WORK ORDER: ${workOrder.id} (ASSIGNED)`);

  console.log('\nSeed complete — all roles created.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
