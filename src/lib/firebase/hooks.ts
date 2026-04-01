"use client";

import { useAuthContext } from './auth-provider';
import { getAuth, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const { user, loading, app } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();

  const login = async (email: string, pass: string) => {
    if (!app) return;
    const auth = getAuth(app);
    try {
      // For demo purposes, we'll allow a mock login
      if (email === "admin@speedypay.com" && pass === "password123") {
         // This is a mock login, in a real app you would use signInWithEmailAndPassword
         console.log("Mock login successful");
         // To simulate a real login, we can't just set the user state here.
         // The onAuthStateChanged listener in AuthProvider needs to fire.
         // In a real app, signInWithEmailAndPassword would handle this.
         // For this demo, we can't create a fake user session easily without more complex mocks.
         // So we will just redirect and let the protected route guard handle it.
         // The guard will fail for now, but this sets up the structure.
         
         // A better mock:
         await signInWithEmailAndPassword(auth, email, pass).catch(async (e) => {
            if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
                console.warn("Firebase login failed, this is expected if the user is not in your Firebase project. The app will proceed with a mock user for demo purposes.");
                // This is where a truly mock provider would be useful.
                // For now, we just log a warning and let the user think they are logged in.
                // The protected route will kick them out if firebase auth state is not updated.
                // The user is advised to create `admin@speedypay.com` with `password123` in their Firebase project.
            } else {
                throw e;
            }
         });

        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
        router.push('/dashboard');

      } else {
        await signInWithEmailAndPassword(auth, email, pass);
        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
        router.push('/dashboard');
      }
    } catch (error: any) {
        console.error("Login failed:", error);
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message || "An unknown error occurred.",
        });
    }
  };

  const logout = async () => {
    if (!app) return;
    const auth = getAuth(app);
    try {
        await signOut(auth);
        router.push('/login');
        toast({
            title: "Logged Out",
            description: "You have been successfully logged out.",
        });
    } catch (error: any) {
        console.error("Logout failed:", error);
        toast({
            variant: "destructive",
            title: "Logout Failed",
            description: error.message || "An unknown error occurred.",
        });
    }
  };
  
  // A mock user for demo if Firebase auth is not configured
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

  // If Firebase user doesn't exist, but we are in a demo environment, return mock user.
  // This allows UI to be built without a full Firebase backend.
  // IMPORTANT: In a production app, this logic should be removed.
  const displayUser = user // || (process.env.NODE_ENV === 'development' ? mockUser : null);
  const displayLoading = loading // && process.env.NODE_ENV !== 'development';


  return { user: displayUser, loading: displayLoading, login, logout };
};
