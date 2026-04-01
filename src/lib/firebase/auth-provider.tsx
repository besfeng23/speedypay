"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { User, IdTokenResult } from 'firebase/auth';

interface AuthContextType {
  app: FirebaseApp | null;
  user: (User & { claims?: IdTokenResult['claims'] }) | null;
  loading: boolean;
}

/**
 * ####################################################################
 * MOCK AUTHENTICATION FOR DEMO PURPOSES
 * ####################################################################
 * 
 * This provider is currently configured to use a static, mock user object.
 * This is done to allow the application to be demonstrated without requiring
 * a real Firebase project and user authentication setup.
 *
 * In a production environment, you would replace this with a real Firebase
 * Auth implementation using `onAuthStateChanged` to listen for user state
 * and fetch their ID token for custom claims/roles.
 *
 * The mock user includes a `claims: { role: 'admin' }` property to simulate
 * role-based access control for demonstration.
 */

// A mock user for when authentication is disabled.
const mockUser: User & { claims?: IdTokenResult['claims'] } = {
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
  claims: { role: 'admin' },
  delete: async () => {},
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({
      token: 'mock-token',
      claims: { role: 'admin' }, // Mock admin role
      authTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(),
      issuedAtTime: new Date().toISOString(),
      signInProvider: 'password',
      signInSecondFactor: null,
  }),
  reload: async () => {},
  toJSON: () => ({}),
};


const AuthContext = createContext<AuthContextType>({
  app: null,
  user: null,
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // For demo purposes, we'll just use the mock user and simulate a loading state.
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setUser(mockUser);
      setLoading(false);
    }, 500); // Simulate a short loading period

    return () => clearTimeout(timer);
  }, []);


  const value = {
    app: null,
    user,
    loading
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
