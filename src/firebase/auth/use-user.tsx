'use client';

import { useState } from 'react';
import { type User } from 'firebase/auth';
import type { Role } from '@/lib/types';

interface SessionInfo {
    role: Role | null;
    tenantId: string | null;
}

// Mock implementation to bypass Firebase Auth for development
export function useUser() {
  const mockUser: User = {
    uid: 'mock-dev-user',
    email: 'dev@example.com',
    displayName: 'Dev User',
    photoURL: `https://avatar.vercel.sh/dev-user.png`,
    providerId: 'mock',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
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

  const [user] = useState<User | null>(mockUser);
  const [loading] = useState(false);
  const [sessionInfo] = useState<SessionInfo>({ role: 'super_admin', tenantId: null });

  return { user, loading, role: sessionInfo.role, tenantId: sessionInfo.tenantId };
}
