'use client';

import type { User } from 'firebase/auth';

// Mock user for demo mode when authentication is disabled
const mockUser: User = {
  uid: 'mock-user-id',
  email: 'demo@speedypay.com',
  displayName: 'Demo User',
  photoURL: `https://avatar.vercel.sh/demo.png`,
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  providerId: 'password',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({
    token: 'mock-token',
    expirationTime: '',
    authTime: '',
    issuedAtTime: '',
    signInProvider: null,
    signInSecondFactor: null,
    claims: {},
  }),
  reload: async () => {},
  toJSON: () => ({}),
};


export function useUser() {
  // In demo mode, we return a mock user and set loading to false.
  // This bypasses all Firebase authentication checks.
  return { user: mockUser, loading: false };
}
