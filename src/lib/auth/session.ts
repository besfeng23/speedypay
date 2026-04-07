import 'server-only';

import { SignJWT, jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/lib/env/server';
import type { Role } from '@/lib/types';
import { ROLES } from '@/lib/types';

const SESSION_COOKIE_NAME = 'sp_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

const env = getServerEnv();
const sessionSecret = env.AUTH_SESSION_SECRET;
const firebaseProjectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// A simple structure to hold role definitions from environment variables
const roleEmailSets: Map<Role, Set<string>> = new Map();

// Initialize role sets from environment variables
function initializeRoleSets() {
  const platformAdminEmails = (env.ROLE_PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  
  if (platformAdminEmails.length > 0) {
      roleEmailSets.set('platform_admin', new Set(platformAdminEmails));
  }
  // This can be expanded for other roles, e.g., finance_ops, compliance_ops
}

initializeRoleSets();

function getSessionSecret(): Uint8Array {
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error('AUTH_SESSION_SECRET must be set and at least 32 characters long.');
  }
  return new TextEncoder().encode(sessionSecret);
}

const firebaseJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

export type AdminSession = {
  uid: string;
  email: string;
  role: Role;
  tenantId?: string; // For tenant-scoped roles
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

export function resolveRole(email: string): Omit<AdminSession, 'uid'> {
  const lowerCaseEmail = email.toLowerCase();
  
  // Check for platform-level roles first
  for (const [role, emailSet] of roleEmailSets.entries()) {
    if (emailSet.has(lowerCaseEmail)) {
      return { email, role };
    }
  }

  // TODO: Implement logic for tenant_admin roles, which would likely involve a DB lookup.
  // For now, we default to the safest possible role.
  
  return { email, role: 'read_only_auditor' };
}

export async function createSessionCookie(session: Omit<AdminSession, 'iat' | 'exp'>): Promise<string> {
  const secret = getSessionSecret();
  return new SignJWT(session as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function readServerSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    if (typeof payload.uid !== 'string' || typeof payload.email !== 'string' || typeof payload.role !== 'string' || !ROLES.includes(payload.role as Role)) {
        return null;
    }

    return {
        uid: payload.uid,
        email: payload.email,
        role: payload.role as Role,
        tenantId: payload.tenantId as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await readServerSession();
  if (!session || !session.role) { // Check for any valid role
    throw new Error('Unauthorized: session required.');
  }
  return session;
}

export const sessionCookieConfig = {
  name: SESSION_COOKIE_NAME,
  maxAge: SESSION_TTL_SECONDS,
};
