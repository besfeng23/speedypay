import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie, resolveRole, sessionCookieConfig, verifyFirebaseIdToken } from '@/lib/auth/session';
import { addAuditLog } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = typeof body?.idToken === 'string' ? body.idToken : null;

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const { uid, email } = await verifyFirebaseIdToken(idToken);
    const { role, tenantId } = resolveRole(email);

    // Any valid role is allowed to create a session.
    // Specific permissions are handled by the middleware and application logic.
    if (!role) {
      await addAuditLog({
        eventType: 'auth.session.denied',
        user: email,
        details: 'Session denied: user has no assigned role.',
        entityType: 'user',
        entityId: uid,
        outcome: 'denied',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sessionPayload = { uid, email, role, tenantId };
    const sessionToken = await createSessionCookie(sessionPayload);

    const response = NextResponse.json({ ok: true, role, tenantId });
    response.cookies.set(sessionCookieConfig.name, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionCookieConfig.maxAge,
    });

    await addAuditLog({
      eventType: 'auth.session.created',
      user: email,
      details: `Admin session established with role: ${role}.`,
      entityType: 'user',
      entityId: uid,
      outcome: 'success',
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown auth error';
    await addAuditLog({
      eventType: 'auth.session.failed',
      user: 'system',
      details: `Failed to establish admin session: ${message}`,
      entityType: 'user',
      entityId: null,
      outcome: 'failed',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
