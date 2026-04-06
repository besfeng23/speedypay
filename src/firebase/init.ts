import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import type { Analytics } from 'firebase/analytics';
import { firebaseConfig } from '@/lib/firebase/config';

let firebaseApp: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let analytics: Analytics | undefined;
let analyticsInitPromise: Promise<void> | null = null;

async function initializeAnalytics(app: FirebaseApp): Promise<void> {
  if (!firebaseConfig?.measurementId) return;

  try {
    const analyticsModule = await import('firebase/analytics');
    if (await analyticsModule.isSupported()) {
      analytics = analyticsModule.getAnalytics(app);
    }
  } catch (error) {
    console.warn('Firebase Analytics initialization skipped:', error);
  }
}

// This function initializes Firebase and exports the instances.
// It's safe to call this multiple times, as it checks if Firebase
// has already been initialized.
export function initializeFirebase() {
  if (typeof window === 'undefined' || !firebaseConfig) {
    return { app: firebaseApp, auth, firestore, analytics };
  }

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);

  if (!analyticsInitPromise) {
    analyticsInitPromise = initializeAnalytics(firebaseApp);
  }

  return { app: firebaseApp, auth, firestore, analytics };
}
