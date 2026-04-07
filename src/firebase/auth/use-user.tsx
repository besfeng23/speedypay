'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { initializeFirebase } from '../init';
import type { Role } from '@/lib/types';

interface SessionInfo {
    role: Role | null;
    tenantId: string | null;
}

async function establishServerSession(user: User | null): Promise<SessionInfo> {
  if (!user) {
    await fetch('/api/auth/logout', { method: 'POST' });
    return { role: null, tenantId: null };
  }

  const idToken = await user.getIdToken();
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (response.ok) {
      const data = await response.json();
      return { role: data.role, tenantId: data.tenantId };
  }
  return { role: null, tenantId: null };
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({ role: null, tenantId: null });

  useEffect(() => {
    const { auth } = initializeFirebase();

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      const session = await establishServerSession(nextUser);
      setSessionInfo(session);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, role: sessionInfo.role, tenantId: sessionInfo.tenantId };
}
