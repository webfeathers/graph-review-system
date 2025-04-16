import { PrismaClient } from '@prisma/client';

// Define global variable to store client during development
const globalForPrisma = global;

// Prevent multiple instances of Prisma Client in development
export const prisma = 
  globalForPrisma.prisma || 
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Only store client reference in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}