const isProdRuntime = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build';

const requiredFirebaseEnvKeys = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

type RequiredFirebaseEnvKey = (typeof requiredFirebaseEnvKeys)[number];

type FirebaseConfigStatus = {
  isConfigured: boolean;
  missingKeys: RequiredFirebaseEnvKey[];
};

function readPublicEnv(name: RequiredFirebaseEnvKey): string {
  return process.env[name]?.trim() ?? '';
}

const requiredFirebaseEnvValues: Record<RequiredFirebaseEnvKey, string> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: readPublicEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: readPublicEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: readPublicEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: readPublicEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: readPublicEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  NEXT_PUBLIC_FIREBASE_APP_ID: readPublicEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
};

const missingFirebaseEnvKeys = requiredFirebaseEnvKeys.filter((key) => !requiredFirebaseEnvValues[key]);

if (isProdRuntime && missingFirebaseEnvKeys.length > 0) {
  throw new Error(
    `Missing required public Firebase env vars: ${missingFirebaseEnvKeys.join(', ')}`
  );
}

export const firebaseConfig = missingFirebaseEnvKeys.length === 0
  ? {
      apiKey: requiredFirebaseEnvValues.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: requiredFirebaseEnvValues.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: requiredFirebaseEnvValues.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: requiredFirebaseEnvValues.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: requiredFirebaseEnvValues.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: requiredFirebaseEnvValues.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
    }
  : null;

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  return {
    isConfigured: missingFirebaseEnvKeys.length === 0,
    missingKeys: missingFirebaseEnvKeys,
  };
}
