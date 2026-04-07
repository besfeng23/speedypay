import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ADMIN_PREFIXES = ['/dashboard', '/merchants', '/transactions', '/settlements', '/audit-logs', '/testing', '/settings', '/tenants'];

function isProtectedAdminPath(pathname: string): boolean {
  return PROTECTED_ADMIN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedAdminPath(pathname)) {
    // Auth is temporarily bypassed for development
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks/speedypay).*)'],
};
