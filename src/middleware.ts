import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt, type JwtScope, type JwtPayload } from '@/domains/auth/services/auth.service';

// Verify token with role-specific secret
async function verifyToken(token: string, expectedScope: JwtScope): Promise<JwtPayload | null> {
  return await verifyJwt(token, expectedScope);
}

/**
 * Extract subdomain from hostname
 * Supports both production (admin.setupx.com) and localhost (admin.localhost:3000)
 */
function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];
  
  // Handle localhost for development (admin.localhost, ib.localhost, etc.)
  if (hostWithoutPort.endsWith('.localhost')) {
    const parts = hostWithoutPort.split('.');
    if (parts.length >= 2) {
      return parts[0]; // admin.localhost -> admin
    }
  }
  
  // Handle regular localhost (no subdomain)
  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    return null; // Main domain in development
  }
  
  // Extract subdomain from production domains
  const parts = hostWithoutPort.split('.');
  if (parts.length >= 3) {
    // admin.setupx.com -> admin
    return parts[0];
  }
  
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomain(hostname);
  
  // Subdomain-based routing
  if (subdomain === 'admin') {
    // admin.setupx.com → /admin/*
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin') && !pathname.startsWith('/_next')) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }
  } else if (subdomain === 'ib') {
    // ib.setupx.com → /dashboard/ib
    if (!pathname.startsWith('/dashboard/ib') && !pathname.startsWith('/api/ib') && !pathname.startsWith('/_next')) {
      const url = request.nextUrl.clone();
      // Map root to IB dashboard
      if (pathname === '/') {
        url.pathname = '/dashboard/ib';
      } else if (pathname.startsWith('/api/')) {
        // Keep API routes as-is for /api/ib/*
        return NextResponse.next();
      } else {
        // Other routes under IB subdomain go to dashboard/ib
        url.pathname = `/dashboard/ib${pathname}`;
      }
      return NextResponse.rewrite(url);
    }
  } else if (subdomain === 'trademaster') {
    // trademaster.setupx.com → /admin/copy-trade/masters
    if (!pathname.startsWith('/admin/copy-trade/masters') && !pathname.startsWith('/_next')) {
      const url = request.nextUrl.clone();
      if (pathname === '/') {
        url.pathname = '/admin/copy-trade/masters';
      } else {
        url.pathname = `/admin/copy-trade/masters${pathname}`;
      }
      return NextResponse.rewrite(url);
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/signup', '/api/auth/send-otp', '/api/auth/verify-otp', '/api/auth/reset-password', '/admin/login', '/api/admin/auth/login'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticRoute = pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.');
  
  // Handle subdomain-specific login redirects
  const getLoginPath = () => {
    if (subdomain === 'admin') return '/admin/login';
    if (subdomain === 'ib') return '/login'; // IB uses regular login
    if (subdomain === 'trademaster') return '/admin/login';
    return '/login';
  };

  // Allow static files and public routes
  if (isStaticRoute || isPublicRoute) {
    return NextResponse.next();
  }

  // Check for admin routes (pages and API)
  // This includes /admin/* and /admin/copy-trade/masters (trademaster subdomain)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const adminSession = request.cookies.get('admin_session')?.value;
    
    if (!adminSession) {
      // For API routes, return 401 instead of redirect
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ success: false, message: 'Admin authentication required' }, { status: 401 });
      }
      const loginUrl = new URL(getLoginPath(), request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Determine expected scope: tradeMaster for trademaster subdomain, admin otherwise
    const expectedScope: JwtScope = subdomain === 'trademaster' ? 'tradeMaster' : 'admin';
    
    // Verify with role-specific secret - STRICT: only admin or tradeMaster scope allowed
    const payload = await verifyToken(adminSession, expectedScope);
    if (!payload || (payload.scope !== 'admin' && payload.scope !== 'tradeMaster')) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ success: false, message: 'Invalid admin session' }, { status: 401 });
      }
      const loginUrl = new URL(getLoginPath(), request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Additional check: tradeMaster routes require tradeMaster scope
    if (subdomain === 'trademaster' && payload.scope !== 'tradeMaster') {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ success: false, message: 'TradeMaster authentication required' }, { status: 401 });
      }
      const loginUrl = new URL(getLoginPath(), request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }
  
  // Check for IB dashboard routes
  // Allow users with 'user' scope to access /dashboard/ib and /api/ib/request (for approved IB or applying)
  if (pathname.startsWith('/dashboard/ib') || pathname.startsWith('/api/ib')) {
    const session = request.cookies.get('session')?.value;
    
    if (!session) {
      if (pathname.startsWith('/api/ib')) {
        return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Allow /api/ib/request and /dashboard/ib for regular users (user scope) - approved IB users
    if (pathname === '/api/ib/request' || pathname.startsWith('/dashboard/ib')) {
      const userPayload = await verifyToken(session, 'user');
      const ibPayload = await verifyToken(session, 'ib');
      if ((userPayload && userPayload.scope === 'user') || (ibPayload && ibPayload.scope === 'ib')) {
        return NextResponse.next();
      }
      if (pathname.startsWith('/api/ib')) {
        return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // STRICT: Only 'ib' scope allowed for other IB API routes - admin JWT NEVER accepted
    const payload = await verifyToken(session, 'ib');
    if (!payload || payload.scope !== 'ib') {
      if (pathname.startsWith('/api/ib')) {
        return NextResponse.json({ success: false, message: 'Invalid IB session' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // For other API routes, let them handle their own auth
  if (isApiRoute) {
    return NextResponse.next();
  }

  // Handle main domain routes
  if (!subdomain || subdomain === 'www') {
    const session = request.cookies.get('session')?.value;
    
    // Check authentication
    let isAuthenticated = false;
    if (session) {
      const payload = await verifyToken(session, 'user');
      isAuthenticated = !!(payload && payload.scope === 'user');
    }

    // Allow root page (/) to be public - it shows welcome page with login/signup buttons
    if (pathname === '/') {
      return NextResponse.next();
    }

    // Redirect /home to /login if not authenticated
    if (!isAuthenticated && pathname === '/home') {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Protect /userdashboard/* routes
    if (pathname.startsWith('/userdashboard')) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
      // STRICT: Only 'user' scope allowed
      if (!session) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
      const payload = await verifyToken(session, 'user');
      if (!payload || payload.scope !== 'user') {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Note: /admin/dashboard/* routes are already protected by the check at lines 104-138
    // No need for duplicate check here

    // Legacy routes: protect old routes that aren't public
    // Allow old /admin/* routes (non-dashboard) to work as before
    // Allow old trading routes if authenticated
    if (!isAuthenticated && !pathname.startsWith('/admin') && !isPublicRoute && !isStaticRoute) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
