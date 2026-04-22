import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient | null };

let prisma: PrismaClient | null = null;
if (process.env.DATABASE_URL) {
  prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ['query'] });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
}

export { prisma };
