import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Supabase
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Server
  PORT: z.string().regex(/^\d+$/).transform(Number),
  FRONTEND_URL: z.string().url(),
  SERVER_NAME: z.string(),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 chars long'),
  JWT_INTERNAL_SECRET: z.string().min(8, 'JWT_INTERNAL_SECRET must be at least 8 chars long'),
  INTERNAL_OTP: z.string(),
  PLATFORM_WALLET_ID: z.uuidv4(),
  WS_URL: z.url(),
  WS_SERVER_URL: z.url(),
  // Server
  ENV: z.string(),

  // OTP service
  OTP_SERVICE_URL: z.string().url(),
  OTP_SERVICE_CLIENT_ID: z.string(),
  OTP_SERVICE_CLIENT_SECRET: z.string(),

  //agora service
  AGORA_APP_ID: z.string(),
  AGORA_APP_CERTIFICATE: z.string(),
  AGORA_WEBHOOK_SECREAT: z.string(),
  // Agora REST (kick / token invalidation)
  AGORA_CUSTOMER_ID: z.string(),
  AGORA_CUSTOMER_SECRET: z.string(),
  AGORA_REST_BASE_URL: z.string().url().default('https://api.agora.io'),
  AGORA_REST_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).default(5000),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;
