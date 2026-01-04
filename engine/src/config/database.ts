import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("[Database] Connected to PostgreSQL");
  } catch (error) {
    console.error("[Database] Connection failed:", error);
    process.exit(1);
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log("[Database] Disconnected");
}
