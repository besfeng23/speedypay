'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import dynamic from 'next/dynamic';

function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailLogin = async () => {
    try {
      setIsLoading(true);
      const user = await signInWithEmail(email, password);
      if (!user) throw new Error('Authentication provider did not return a user.');
      const idToken = await user.getIdToken();
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!sessionResponse.ok) throw new Error('Access denied: account is not authorized for admin access.');
      router.replace(redirectTo);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast({ variant: 'destructive', title: 'Sign in failed', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const user = await signInWithGoogle();
      if (!user) throw new Error('Google authentication was cancelled.');
      const idToken = await user.getIdToken();
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!sessionResponse.ok) throw new Error('Access denied: account is not authorized for admin access.');
      router.replace(redirectTo);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      toast({ variant: 'destructive', title: 'Sign in failed', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Icons.logo className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">SpeedyPay Console</h1>
            <p className="text-sm text-muted-foreground">Admin sign in</p>
          </div>
        </div>

        <div className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full" onClick={handleEmailLogin} disabled={isLoading || !email || !password}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in with Email
          </Button>
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(LoginPageClient), { ssr: false });
