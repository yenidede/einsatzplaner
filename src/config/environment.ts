// src/config/environment.ts
import zod from 'zod';

const envSchema = zod.object({
  // Required Environment Variables
  DATABASE_URL: zod.string().min(1, 'DATABASE_URL ist erforderlich'),
  NEXTAUTH_SECRET: zod.string().min(32, 'NEXTAUTH_SECRET muss mindestens 32 Zeichen haben'),
  NEXTAUTH_URL: zod.string().url('NEXTAUTH_URL muss eine gültige URL sein'),
  
  // Optional with Defaults
  NODE_ENV: zod.enum(['development', 'production', 'test']).default('development'),
  DEBUG: zod.string().transform(val => val === 'true').optional().default(false),
  LOG_LEVEL: zod.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Email (optional)
  SMTP_HOST: zod.string().optional(),
  SMTP_PORT: zod.string().transform(val => parseInt(val) || 587).optional(),
  SMTP_USER: zod.string().optional(),
  SMTP_PASS: zod.string().optional(),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('❌ Environment Validation Error:', envResult.error.format());
  process.exit(1);
}

export const env = {
  ...envResult.data,
  
  // Computed values based on NODE_ENV
  isDevelopment: envResult.data.NODE_ENV === 'development',
  isProduction: envResult.data.NODE_ENV === 'production',
  isTest: envResult.data.NODE_ENV === 'test',
  
  // Smart defaults based on environment
  database: {
    url: envResult.data.DATABASE_URL,
    maxPoolSize: envResult.data.NODE_ENV === 'production' ? 50 : 10,
    serverSelectionTimeoutMS: envResult.data.NODE_ENV === 'production' ? 5000 : 2000,
  },
  
  auth: {
    secret: envResult.data.NEXTAUTH_SECRET,
    url: envResult.data.NEXTAUTH_URL,
    sessionMaxAge: envResult.data.NODE_ENV === 'production' ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
    debug: envResult.data.NODE_ENV === 'development' && envResult.data.DEBUG,
  },
  
  logging: {
    level: envResult.data.LOG_LEVEL,
    enabled: envResult.data.DEBUG || envResult.data.NODE_ENV === 'development',
  },
  
  email: {
    host: envResult.data.SMTP_HOST,
    port: envResult.data.SMTP_PORT,
    user: envResult.data.SMTP_USER,
    pass: envResult.data.SMTP_PASS,
    enabled: !!(envResult.data.SMTP_HOST && envResult.data.SMTP_USER),
  }
} as const;