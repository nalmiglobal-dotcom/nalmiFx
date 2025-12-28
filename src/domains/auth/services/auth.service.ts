import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env } from '@/config';

// Role types
export type JwtScope = 'user' | 'admin' | 'ib' | 'tradeMaster';

// JWT Payload structure - only userId and scope
export interface JwtPayload {
  userId: number;
  scope: JwtScope;
  adminId?: number; // Optional adminId for admin sessions
}

// Get JWT secret for a specific role
function getJwtSecret(scope: JwtScope): string {
  switch (scope) {
    case 'user':
      return env.JWT_SECRET_USER;
    case 'admin':
      return env.JWT_SECRET_ADMIN;
    case 'ib':
      return env.JWT_SECRET_IB;
    case 'tradeMaster':
      return env.JWT_SECRET_TRADEMASTER;
    default:
      return env.JWT_SECRET;
  }
}

// Issue JWT token for a specific role (payload: userId and scope only)
export async function issueJwt(userId: number, scope: JwtScope, adminId?: number): Promise<string> {
  const secret = getJwtSecret(scope);
  const key = new TextEncoder().encode(secret);
  
  const payload: JwtPayload = { userId, scope };
  if (adminId && (scope === 'admin' || scope === 'tradeMaster')) {
    payload.adminId = adminId;
  }
  
  // Convert to jose-compatible format
  const josePayload = {
    userId: payload.userId,
    scope: payload.scope,
    ...(payload.adminId && { adminId: payload.adminId })
  };
  
  return await new SignJWT(josePayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(key);
}

// Verify JWT token with role-specific secret
export async function verifyJwt(token: string, scope: JwtScope): Promise<JwtPayload | null> {
  try {
    const secret = getJwtSecret(scope);
    const key = new TextEncoder().encode(secret);
    
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    
    // Convert JWTPayload to our JwtPayload interface
    const jwtPayload: JwtPayload = {
      userId: payload.userId as number,
      scope: payload.scope as JwtScope
    };
    
    // Add adminId if it exists
    if (payload.adminId) {
      jwtPayload.adminId = payload.adminId as number;
    }
    
    // Validate payload structure
    if (typeof jwtPayload.userId === 'number' && jwtPayload.scope === scope) {
      return jwtPayload;
    }
    
    return null;
  } catch {
    return null;
  }
}

// Legacy functions for backward compatibility (deprecated)
export async function encrypt(payload: any) {
  // Try to determine scope from payload
  let scope: JwtScope = 'user';
  if (payload.scope) {
    scope = payload.scope;
  } else if (payload.type === 'admin') {
    scope = 'admin';
  } else if (payload.type === 'user' && payload.isIB) {
    scope = 'ib';
  }
  
  return await issueJwt(payload.userId || payload.adminId, scope);
}

export async function decrypt(input: string) {
  // Try all scopes to find the correct one (for backward compatibility)
  const scopes: JwtScope[] = ['user', 'admin', 'ib', 'tradeMaster'];
  for (const scope of scopes) {
    const payload = await verifyJwt(input, scope);
    if (payload) {
      return payload;
    }
  }
  return null;
}

// Parse cookies string like "a=1; b=2" and return map
function parseCookieString(cookieHeader: string | null) {
  const map: Record<string, string> = {};
  if (!cookieHeader) return map;
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const name = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    map[name] = decodeURIComponent(val);
  });
  return map;
}

export async function getSessionFromRequest(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const cookiesMap = parseCookieString(cookieHeader);
    const sess = cookiesMap['session'];

    if (sess) {
      try {
        return await decrypt(sess);
      } catch (e) {
        return null;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

// Admin-specific request-based session (prefers admin_session)
export async function getAdminSessionFromRequest(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const cookiesMap = parseCookieString(cookieHeader);
    const admin = cookiesMap['admin_session'];
    const sess = cookiesMap['session'];

    if (admin) {
      try {
        return await decrypt(admin);
      } catch (e) {
        // continue to regular session
      }
    }

    if (sess) {
      try {
        return await decrypt(sess);
      } catch (e) {
        return null;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

export async function createSession(userId: number, email: string, role: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await encrypt({ userId, email, role, expires });

  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: env.isProduction,
    expires,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  // Return regular user session (do NOT prefer admin session here)
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    return await decrypt(session);
  } catch (error) {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get('admin_session')?.value;
  if (!adminSession) return null;
  try {
    return await decrypt(adminSession);
  } catch (error) {
    return null;
  }
}

// Helper to check if session is a valid admin session
export function isValidAdminSession(session: any): boolean {
  if (!session) return false;
  // Check for admin type OR admin roles (super_admin, admin, moderator)
  return session.type === 'admin' || ['super_admin', 'admin', 'moderator'].includes(session.role);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  cookieStore.delete('admin_session');
}

