import { PrismaClient } from "@prisma/client";
import { env } from "./env.ts";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export async function connectDB(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log("🐘 Connected to PostgreSQL database successfully via Prisma ORM");
    return true;
  } catch (err: any) {
    console.warn("⚠️ PostgreSQL connection not available. (Check DATABASE_URL in .env)");
    return false;
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}

