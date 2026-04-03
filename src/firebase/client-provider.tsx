'use client';

import { initializeFirebase, FirebaseProvider } from '@/firebase';

// This ensures Firebase is initialized only once on the client
const { app, auth, firestore } = initializeFirebase();

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseProvider app={app} auth={auth} firestore={firestore}>
      {children}
    </FirebaseProvider>
  );
}