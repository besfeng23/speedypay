import 'server-only';

import { getServerEnv } from '@/lib/env/server';

const supportedProtocols = ['postgres://', 'postgresql://'];

export function getDatabaseUrlOrThrow(): string {
  const { DATABASE_URL: url } = getServerEnv();
  if (!url) {
    throw new Error('DATABASE_URL is required for managed database connectivity.');
  }

  if (!supportedProtocols.some((protocol) => url.startsWith(protocol))) {
    throw new Error('DATABASE_URL must use postgres:// or postgresql://.');
  }

  return url;
}

export function validateDatabaseConfig(): void {
  const url = getDatabaseUrlOrThrow();

  if (!url.includes('@')) {
    throw new Error('DATABASE_URL must include credentials and host information.');
  }

  const { DATABASE_REQUIRE_SSL } = getServerEnv();
  const requireSsl = DATABASE_REQUIRE_SSL === 'true';
  if (requireSsl && !url.includes('sslmode=require')) {
    throw new Error('DATABASE_REQUIRE_SSL=true but DATABASE_URL is missing sslmode=require.');
  }
}
