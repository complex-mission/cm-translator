import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { hash } from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const adminPassword = await hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      nickname: 'Admin',
      avatarId: Math.floor(Math.random() * 30) + 1,
      role: 'admin',
      emailVerifiedAt: new Date(),
    },
  });
  console.log('Admin user:', admin.email);

  const testPassword = await hash('Test@1234', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: testPassword,
      nickname: 'TestUser',
      avatarId: Math.floor(Math.random() * 30) + 1,
      role: 'user',
      emailVerifiedAt: new Date(),
    },
  });
  console.log('Test user:', testUser.email);

  const configs = [
    { configKey: 'deepseek_model', configValue: 'deepseek-v4-flash' },
    { configKey: 'max_chars_guest', configValue: '1000' },
    { configKey: 'max_chars_user', configValue: '5000' },
    { configKey: 'daily_quota_guest', configValue: '10' },
    { configKey: 'daily_quota_user', configValue: '200' },
    { configKey: 'rate_limit_per_minute', configValue: '30' },
    { configKey: 'app_name', configValue: 'CM Translator' },
    { configKey: 'announcement', configValue: '' },
  ];
  for (const cfg of configs) {
    await prisma.systemConfig.upsert({ where: { configKey: cfg.configKey }, update: {}, create: cfg });
  }
  console.log('System configs seeded');
  console.log('\nDefault accounts:');
  console.log('  Admin: admin@example.com / Admin@123');
  console.log('  Test:  test@example.com / Test@1234');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
