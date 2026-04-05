'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Icons } from '@/components/icons';

// This page now serves as a redirect gateway when authentication is disabled.
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to the dashboard.
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
            <Icons.logo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">SpeedyPay Console</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p>Authentication is disabled. Redirecting to dashboard...</p>
            </div>
        </div>
    </div>
  );
}
