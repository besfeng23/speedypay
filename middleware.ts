import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, JWTPayload } from 'jose';
import { ROLES, type Role } from '@/lib/types';

const PROTECTED_ADMIN_PREFIXES = ['/dashboard', '/merchants', '/transactions', '/settlements', '/audit-logs', '/testing', '/settings', '/tenants'];
const SESSION_COOKIE_NAME = 'sp_admin_session';

type SessionTokenPayload = JWTPayload & { role?: Role };

function isProtectedAdminPath(pathname: string): boolean {
  return PROTECTED_ADMIN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    return payload as SessionTokenPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedAdminPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await verifySessionToken(token) : null;

  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Check if the role in the token is a valid, recognized role.
  const isValidRole = payload.role && ROLES.includes(payload.role);

  if (!isValidRole) {
    // If the user has a session but an invalid/unrecognized role, treat as forbidden.
    // This is safer than redirecting to login, as they are technically authenticated.
    return new NextResponse('Forbidden: Invalid role', { status: 403 });
  }

  // Allow access if the user has a valid session with any recognized role.
  // Page-level components will be responsible for finer-grained permission checks.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks/speedypay).*)'],
};
