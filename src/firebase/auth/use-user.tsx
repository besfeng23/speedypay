'use client';

import { type User } from 'firebase/auth';

// By returning a mock user, we effectively disable real authentication checks
// throughout the application where this hook is used.
const mockUser: User = {
    uid: 'mock-user-id',
    email: 'admin@speedypay.com',
    displayName: 'Admin User (Demo)',
    photoURL: `https://avatar.vercel.sh/admin@speedypay.com.png`,
    providerId: 'password',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({
        token: '',
        authTime: '',
        issuedAtTime: '',
        signInProvider: null,
        signInSecondFactor: null,
        expirationTime: '',
        claims: {}
    }),
    reload: async () => {},
    toJSON: () => ({}),
};


export function useUser() {
  // Always return the mock user and a 'false' loading state to bypass auth checks.
  return { user: mockUser, loading: false };
}
