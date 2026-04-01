"use client";

import React, { createContext, useContext } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { User } from 'firebase/auth';

interface AuthContextType {
  app: FirebaseApp | null;
  user: User | null;
  loading: boolean;
}

// A mock user for when authentication is disabled.
const mockUser: User = {
  uid: 'mock-user-id',
  email: 'admin@speedypay.com',
  displayName: 'Admin User',
  photoURL: 'https://picsum.photos/seed/user1/100/100',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  providerId: 'password',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, authTime: '', expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null }),
  reload: async () => {},
  toJSON: () => ({}),
};


const AuthContext = createContext<AuthContextType>({
  app: null,
  user: mockUser,
  loading: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const value = {
    app: null,
    user: mockUser,
    loading: false
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  return useContext(AuthContext);
};
