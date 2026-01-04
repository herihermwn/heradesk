import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.string().default("3002"),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database
  DATABASE_URL: z.string(),

  // S3
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string(),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_FORCE_PATH_STYLE: z.string().default("true"),
  S3_PUBLIC_URL: z.string(),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Features
  MAX_CHAT_PER_CS: z.string().default("5"),
  CHAT_IDLE_TIMEOUT: z.string().default("1800"),
  AUTO_ASSIGN_ENABLED: z.string().default("true"),

  // Admin
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const config = {
  server: {
    port: parseInt(env.PORT),
    host: env.HOST,
    isDev: env.NODE_ENV === "development",
  },
  s3: {
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
    publicUrl: env.S3_PUBLIC_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  features: {
    maxChatPerCs: parseInt(env.MAX_CHAT_PER_CS),
    chatIdleTimeout: parseInt(env.CHAT_IDLE_TIMEOUT),
    autoAssignEnabled: env.AUTO_ASSIGN_ENABLED === "true",
  },
  admin: {
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  },
};
