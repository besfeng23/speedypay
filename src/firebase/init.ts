import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebase/config';

let firebaseApp: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

// This function initializes Firebase and exports the instances.
// It's safe to call this multiple times, as it checks if Firebase
// has already been initialized.
export function initializeFirebase() {
  if (typeof window !== 'undefined' && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
    if (!getApps().length) {
        try {
            firebaseApp = initializeApp(firebaseConfig);
            auth = getAuth(firebaseApp);
            firestore = getFirestore(firebaseApp);
        } catch (e) {
            console.error('Failed to initialize Firebase', e);
        }
    } else {
        // Get the default app if it's already initialized.
        firebaseApp = getApp();
        auth = getAuth(firebaseApp);
        firestore = getFirestore(firebaseApp);
    }
  }
  return { app: firebaseApp, auth, firestore };
}
