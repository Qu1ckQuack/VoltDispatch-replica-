import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: 'hq@voltdispatch.app' },
  });
  if (existing) {
    console.log('Seed data already exists — skipping');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.create({
    data: {
      email: 'hq@voltdispatch.app',
      passwordHash,
      role: 'HQ',
      isActive: true,
    },
  });

  console.log(
    'Seed·complete:·HQ·user·created·(hq@voltdispatch.app·/·password123',
  );
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
