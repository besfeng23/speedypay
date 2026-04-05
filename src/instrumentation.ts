import { validateServerEnvOnStartup } from '@/lib/env/server';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    validateServerEnvOnStartup();
  }
}
