// This file serves as a barrel file for easily importing Firebase-related modules.

// The initializeFirebase function is now in its own file to prevent
// circular dependencies, which can be an issue with barrel files.
export { initializeFirebase } from './init';

// Re-export core providers and hooks for easy import
export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
export { signInWithGoogle, signOutUser } from './auth/auth';
