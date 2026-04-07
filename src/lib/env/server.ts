import 'server-only';

import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SPEEDYPAY_ENV: z.enum(['test', 'production']).default('test'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
});

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    AUTH_SESSION_SECRET: z.string().optional(),
    ROLE_PLATFORM_ADMIN_EMAILS: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    DATABASE_REQUIRE_SSL: z.enum(['true', 'false']).default('false'),
    DATABASE_POOL_MAX: z.string().optional().refine((value) => value === undefined || Number.isInteger(Number(value)), 'DATABASE_POOL_MAX must be an integer when provided.').refine((value) => value === undefined || Number(value) > 0, 'DATABASE_POOL_MAX must be greater than 0 when provided.'),
    DATABASE_POOL_IDLE_MS: z.string().optional().refine((value) => value === undefined || Number.isInteger(Number(value)), 'DATABASE_POOL_IDLE_MS must be an integer when provided.').refine((value) => value === undefined || Number(value) >= 0, 'DATABASE_POOL_IDLE_MS must be >= 0 when provided.'),
    SPEEDYPAY_MERCH_SEQ: z.string().optional(),
    SPEEDYPAY_SECRET_KEY: z.string().optional(),
    SPEEDYPAY_NOTIFY_URL: z.string().optional(),
    SPEEDYPAY_PAYOUT_BASE_URL_PROD: z.string().url().optional(),
    SPEEDYPAY_PAYOUT_BASE_URL_TEST: z.string().url().optional(),
    SPEEDYPAY_CASHIER_BASE_URL_PROD: z.string().url().optional(),
    SPEEDYPAY_CASHIER_BASE_URL_TEST: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.DATABASE_REQUIRE_SSL === 'true' && env.DATABASE_URL && !env.DATABASE_URL.includes('sslmode=require')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'DATABASE_REQUIRE_SSL=true but DATABASE_URL is missing sslmode=require.' });
    }

    if (env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
      if (!env.AUTH_SESSION_SECRET || env.AUTH_SESSION_SECRET.length < 32) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['AUTH_SESSION_SECRET'], message: 'AUTH_SESSION_SECRET must be set and at least 32 characters long.' });
      }
      if (!env.ROLE_PLATFORM_ADMIN_EMAILS) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ROLE_PLATFORM_ADMIN_EMAILS'], message: 'ROLE_PLATFORM_ADMIN_EMAILS is required in production.' });
      }
      if (!env.DATABASE_URL) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'DATABASE_URL is required in production.' });
      } else {
        const validProtocol = env.DATABASE_URL.startsWith('postgres://') || env.DATABASE_URL.startsWith('postgresql://');
        if (!validProtocol) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'DATABASE_URL must use postgres:// or postgresql://.' });
      }
      if (!env.SPEEDYPAY_MERCH_SEQ) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SPEEDYPAY_MERCH_SEQ'], message: 'SPEEDYPAY_MERCH_SEQ is required in production.' });
      if (!env.SPEEDYPAY_SECRET_KEY) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SPEEDYPAY_SECRET_KEY'], message: 'SPEEDYPAY_SECRET_KEY is required in production.' });
      if (!env.SPEEDYPAY_NOTIFY_URL) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SPEEDYPAY_NOTIFY_URL'], message: 'SPEEDYPAY_NOTIFY_URL is required in production.' });
      } else if (!env.SPEEDYPAY_NOTIFY_URL.startsWith('https://')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SPEEDYPAY_NOTIFY_URL'], message: 'SPEEDYPAY_NOTIFY_URL must use https:// in production.' });
      }

      const parsedAdminEmails = (env.ROLE_PLATFORM_ADMIN_EMAILS ?? '').split(',').map((email) => email.trim()).filter(Boolean);
      if (parsedAdminEmails.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ROLE_PLATFORM_ADMIN_EMAILS'], message: 'ROLE_PLATFORM_ADMIN_EMAILS must contain at least one admin email in production.' });
      }
    }
  });

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema> & PublicEnv;

let cachedServerEnv: ServerEnv | null = null;

function formatErrors(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('\n');
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsedPublic = publicEnvSchema.safeParse(process.env);
  if (!parsedPublic.success) throw new Error(`Invalid public environment configuration:\n${formatErrors(parsedPublic.error)}`);

  const parsedServer = serverEnvSchema.safeParse(process.env);
  if (!parsedServer.success) throw new Error(`Invalid server environment configuration:\n${formatErrors(parsedServer.error)}`);

  if (parsedServer.data.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
    const requiredPublicKeys: Array<keyof PublicEnv> = [
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ];
    const missingPublic = requiredPublicKeys.filter((key) => !parsedPublic.data[key]);
    if (missingPublic.length > 0) {
      throw new Error(`Invalid public environment configuration:\n${missingPublic.map((key) => `${key}: ${key} is required in production.`).join('\n')}`);
    }
  }

  cachedServerEnv = { ...parsedServer.data, ...parsedPublic.data };
  return cachedServerEnv;
}

export function validateServerEnvOnStartup(): void {
  getServerEnv();
}
