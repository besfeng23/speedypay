'use client';

import { useUser } from '@/firebase';
import {
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser as firebaseSignOut,
  signInWithEmail as firebaseSignInWithEmail,
} from '@/firebase/auth/auth';

export const useAuth = () => {
  const { user, loading, role, tenantId } = useUser();

  const signInWithGoogle = async () => {
    return firebaseSignInWithGoogle();
  };

  const signInWithEmail = async (email: string, password: string) => {
    return firebaseSignInWithEmail(email, password);
  }

  const logout = async () => {
    await firebaseSignOut();
  };

  return { user, loading, role, tenantId, signInWithGoogle, signInWithEmail, logout };
};
