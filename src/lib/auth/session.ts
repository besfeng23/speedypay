import 'server-only';

import { SignJWT, jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/lib/env/server';

const SESSION_COOKIE_NAME = 'sp_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

const env = getServerEnv();
const sessionSecret = env.AUTH_SESSION_SECRET;
const firebaseProjectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const adminEmailSet = new Set(
  (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

function getSessionSecret(): Uint8Array {
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error('AUTH_SESSION_SECRET must be set and at least 32 characters long.');
  }
  return new TextEncoder().encode(sessionSecret);
}

const firebaseJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

export type AdminRole = 'admin' | 'viewer';

export type AdminSession = {
  uid: string;
  email: string;
  role: AdminRole;
};

export async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email: string }> {
  if (!firebaseProjectId) {
    throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required for session verification.');
  }

  const { payload } = await jwtVerify(idToken, firebaseJwks, {
    issuer: `https://securetoken.google.com/${firebaseProjectId}`,
    audience: firebaseProjectId,
  });

  const uid = payload.user_id;
  const email = payload.email;

  if (typeof uid !== 'string' || typeof email !== 'string') {
    throw new Error('Firebase token missing required claims (user_id/email).');
  }

  return { uid, email };
}

export function resolveRole(email: string): AdminRole {
  if (adminEmailSet.size === 0) return 'viewer';
  return adminEmailSet.has(email.toLowerCase()) ? 'admin' : 'viewer';
}

export async function createSessionCookie(session: AdminSession): Promise<string> {
  const secret = getSessionSecret();
  return new SignJWT(session as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function readServerSession(): Promise<AdminSession | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    if (typeof payload.uid !== 'string' || typeof payload.email !== 'string') return null;

    const role: AdminRole = payload.role === 'admin' ? 'admin' : 'viewer';
    return { uid: payload.uid, email: payload.email, role };
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await readServerSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Unauthorized: admin session required.');
  }
  return session;
}

export const sessionCookieConfig = {
  name: SESSION_COOKIE_NAME,
  maxAge: SESSION_TTL_SECONDS,
};
