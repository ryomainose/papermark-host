import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Diagnostic logging for production deployment issues
if (process.env.NODE_ENV === "production") {
  console.log('Prisma client initialization in production');
  console.log('DATABASE_URL configured:', !!process.env.DATABASE_URL);
  console.log('Node version:', process.version);
  console.log('Environment:', process.env.NODE_ENV);
}

const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "production" ? ['error', 'warn'] : ['error'],
  errorFormat: "pretty",
});

if (process.env.NODE_ENV === "development") global.prisma = prisma;

// Test connection on startup in production
if (process.env.NODE_ENV === "production") {
  prisma.$connect()
    .then(() => console.log('Database connection established successfully'))
    .catch((err) => console.error('Database connection failed:', err));
}

export default prisma;
