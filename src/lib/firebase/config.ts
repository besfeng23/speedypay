const isProd = process.env.NODE_ENV === 'production';

function readPublicEnv(name: string, fallback = ''): string {
  const value = process.env[name] ?? fallback;
  if (isProd && !value) {
    throw new Error(`${name} is required in production.`);
  }
  return value;
}

export const firebaseConfig = {
  apiKey: readPublicEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'YOUR_API_KEY'),
  authDomain: readPublicEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'your-project-id.firebaseapp.com'),
  projectId: readPublicEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'your-project-id'),
  storageBucket: readPublicEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'your-project-id.appspot.com'),
  messagingSenderId: readPublicEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '000000000000'),
  appId: readPublicEnv('NEXT_PUBLIC_FIREBASE_APP_ID', '1:000000000000:web:0000000000000000000000'),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
