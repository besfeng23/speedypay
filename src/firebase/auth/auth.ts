'use client';

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { initializeFirebase } from '../init';

export async function signInWithGoogle(): Promise<User | null> {
  const { auth } = initializeFirebase();
  if (!auth) return null;

  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return null;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User | null> {
    const { auth } = initializeFirebase();
    if (!auth) return null;
    
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        console.error('Error signing in with email:', error);
        // For a real app, you'd want to handle different error codes (e.g., 'auth/user-not-found')
        throw error;
    }
}


export async function signOutUser(): Promise<void> {
  const { auth } = initializeFirebase();
  if (!auth) {
    await fetch('/api/auth/logout', { method: 'POST' });
    return;
  }
  
  await signOut(auth);
  await fetch('/api/auth/logout', { method: 'POST' });
}
