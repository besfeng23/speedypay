import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebase/config';

// Re-export core providers and hooks for easy import
export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
export { signInWithGoogle, signOutUser } from './auth/auth';


let firebaseApp: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

// This function initializes Firebase and exports the instances.
// It's safe to call this multiple times, as it checks if Firebase
// has already been initialized.
export function initializeFirebase() {
  if (
    typeof window !== 'undefined' &&
    !getApps().length &&
    firebaseConfig.apiKey !== 'YOUR_API_KEY'
  ) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      auth = getAuth(firebaseApp);
      firestore = getFirestore(firebaseApp);
    } catch (e) {
      console.error('Failed to initialize Firebase', e);
    }
  }
  return { app: firebaseApp, auth, firestore };
}
