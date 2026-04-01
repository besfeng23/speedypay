"use client";

import { useAuthContext } from './auth-provider';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const { user, loading } = useAuthContext();
  const { toast } = useToast();

  const login = async (email: string, pass: string) => {
    toast({
        variant: "destructive",
        title: "Authentication Disabled",
        description: "Logging in is not available in this version of the app.",
    });
  };

  const logout = async () => {
    toast({
        title: "Authentication Disabled",
        description: "Logging out is not available in this version of the app.",
    });
  };

  return { user, loading, login, logout };
};
