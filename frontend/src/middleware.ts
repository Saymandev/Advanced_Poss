import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_ROLE_FEATURES: Record<string, string[]> = {
  owner: [
    'dashboard', 'reports', 'staff-management', 'role-management', 'attendance', 'schedule',
    'menu-management', 'categories', 'qr-menus', 'order-management', 'delivery-management',
    'table-management', 'kitchen-display', 'customer-display', 'pos-settings',
    'printer-management', 'digital-receipts', 'customer-management', 'loyalty-program',
    'marketing', 'ai-menu-optimization', 'ai-customer-loyalty', 'ai-insights',
    'inventory', 'suppliers', 'purchase-orders', 'wastage-management',
    'expenses', 'income', 'accounting', 'work-periods',
    'settings', 'branches', 'notifications', 'room-management', 'booking-management', 'cms',
  ],
  manager: [
    'dashboard', 'reports', 'staff-management', 'attendance', 'schedule',
    'menu-management', 'categories', 'qr-menus', 'order-management', 'delivery-management',
    'table-management', 'kitchen-display', 'customer-display',
    'customer-management', 'loyalty-program', 'marketing',
    'ai-menu-optimization', 'ai-insights',
    'inventory', 'suppliers', 'wastage-management',
    'expenses', 'income', 'work-periods',
    'notifications', 'room-management', 'booking-management', 'cms',
  ],
  chef: [
    'dashboard', 'menu-management', 'categories', 'kitchen-display',
    'inventory', 'purchase-orders', 'wastage-management', 'notifications',
  ],
  cook: [
    'dashboard', 'kitchen-display', 'inventory',
    'wastage-management', 'notifications',
  ],
  waiter: [
    'dashboard', 'order-management', 'delivery-management',
    'table-management', 'customer-display', 'customer-management',
    'loyalty-program', 'notifications',
  ],
  cashier: [
    'dashboard', 'order-management', 'customer-display',
    'digital-receipts', 'customer-management',
    'expenses', 'income', 'work-periods', 'notifications',
  ],
  super_admin: [],
};

const ROUTE_FEATURE_MAP: Record<string, string[]> = {
  '/dashboard': ['dashboard'],
  '/dashboard/pos': ['order-management'],
  '/dashboard/retail-pos': ['order-management'],
  '/dashboard/order-history': ['order-management'],
  '/dashboard/orders': ['order-management'],
  '/dashboard/tables': ['table-management'],
  '/dashboard/deliveries': ['delivery-management'],
  '/dashboard/customers': ['customer-management'],
  '/dashboard/customer-display': ['customer-display', 'order-management'],
  '/dashboard/kitchen': ['kitchen-display'],
  '/dashboard/menu-items': ['menu-management'],
  '/dashboard/menu': ['menu-management'],
  '/dashboard/categories': ['categories'],
  '/dashboard/qr-code-menus': ['qr-menus'],
  '/dashboard/pos-settings': ['pos-settings'],
  '/dashboard/printer-management': ['printer-management'],
  '/dashboard/digital-receipts': ['digital-receipts'],
  '/dashboard/staff': ['staff-management'],
  '/dashboard/attendance': ['attendance'],
  '/dashboard/schedule': ['schedule'],
  '/dashboard/reports': ['reports'],
  '/dashboard/pos-reports': ['reports'],
  '/dashboard/work-periods': ['work-periods'],
  '/dashboard/settings': ['settings'],
  '/dashboard/branches': ['branches'],
  '/dashboard/inventory': ['inventory'],
  '/dashboard/ingredients': ['inventory'],
  '/dashboard/stocks': ['inventory'],
  '/dashboard/suppliers': ['suppliers'],
  '/dashboard/purchase-orders': ['purchase-orders'],
  '/dashboard/wastage': ['wastage-management'],
  '/dashboard/expenses': ['expenses'],
  '/dashboard/incomes': ['income'],
  '/dashboard/accounting': ['accounting'],
  '/dashboard/role-access': ['role-management'],
  '/dashboard/company-subscriptions': ['settings'],
  '/dashboard/company-features': ['settings'],
  '/dashboard/subscription-features': ['settings'],
  '/dashboard/subscription-payment-methods': ['settings'],
  '/dashboard/subscriptions': ['settings'],
  '/dashboard/notifications': ['notifications'],
  '/dashboard/marketing': ['marketing'],
  '/dashboard/bookings': ['booking-management'],
  '/dashboard/rooms': ['room-management'],
  '/dashboard/hotel': ['room-management'],
  '/dashboard/cms': ['cms'],
  '/dashboard/ai-menu-optimization': ['ai-menu-optimization'],
  '/dashboard/customer-loyalty-ai': ['ai-customer-loyalty'],
  '/dashboard/ai': ['ai-insights'],
  '/dashboard/gallery': ['settings'],
  '/dashboard/contact-forms': ['settings'],
  '/dashboard/companies': ['settings'],
  '/dashboard/users': ['staff-management'],
  '/dashboard/super-admin': [],
  '/dashboard/backups': ['settings'],
  '/dashboard/system-settings': ['settings'],
};

const ALWAYS_ALLOWED = new Set(['/dashboard/profile']);

function getRoleDashboardPath(role: string): string {
  const mapping: Record<string, string> = {
    waiter: '/dashboard/pos',
    cashier: '/dashboard/pos',
    chef: '/dashboard/kitchen',
    cook: '/dashboard/kitchen',
    manager: '/dashboard',
    owner: '/dashboard',
    super_admin: '/dashboard/super-admin',
  };
  return mapping[role?.toLowerCase()] || '/dashboard';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ALWAYS_ALLOWED.has(pathname)) {
    return NextResponse.next();
  }

  // --- Custom Domain White-labeling Logic ---
  const hostname = request.headers.get('host') || '';
  const domainOnly = hostname.split(':')[0]; // Remove port if present

  // Check if it's the main platform domain (raha.bd, localhost, or IP addresses for testing)
  const isMainDomain = hostname.includes('raha.bd') || 
                       hostname.includes('localhost') || 
                       hostname.includes('127.0.0.1') || 
                       hostname.match(/^192\.168\./) ||
                       hostname.match(/^10\./) ||
                       hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
  
  if (!isMainDomain) {
    const isGlobalRoute = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/auth') || 
                          pathname.startsWith('/api') || 
                          pathname.startsWith('/_next') || 
                          pathname.includes('.');

    if (!isGlobalRoute) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/public/resolve-domain?domain=${domainOnly}`, {
          cache: 'no-store'
        });
        
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data?.companySlug) {
            const companySlug = result.data.companySlug;
            
            // If the URL in the browser already contains the company slug (e.g., raincyber.com/rahpos/dhaka)
            // we should redirect them to the clean URL (raincyber.com/dhaka) to enforce white-labeling
            // and prevent Next.js from receiving double-slugs (rahpos/rahpos/dhaka)
            if (pathname.startsWith(`/${companySlug}/`) || pathname === `/${companySlug}`) {
              const strippedPath = pathname.replace(new RegExp(`^/${companySlug}`), '') || '/';
              const redirectUrl = request.nextUrl.clone();
              redirectUrl.pathname = strippedPath;
              return NextResponse.redirect(redirectUrl);
            }

            // Rewrite URL internally: e.g., raincyber.com/dhaka -> raincyber.com/rahpos/dhaka internally
            const newUrl = request.nextUrl.clone();
            newUrl.pathname = `/${companySlug}${pathname === '/' ? '' : pathname}`;
            return NextResponse.rewrite(newUrl);
          } else {
            return new NextResponse(`Middleware Error: API resolved but returned invalid data: ${JSON.stringify(result)}`, { status: 500 });
          }
        } else {
          return new NextResponse(`Middleware Error: API returned status ${res.status}`, { status: 500 });
        }
      } catch (err: any) {
        return new NextResponse(`Middleware Fetch Error: ${err.message}`, { status: 500 });
      }
    }

    // If a user visits the root page of a CUSTOM domain and resolution didn't rewrite it,
    // redirect them straight to the login page to prevent showing the main SaaS marketing page.
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      return NextResponse.redirect(url);
    }
  }
  // ------------------------------------------

  const userInfoCookie = request.cookies.get('user_info');
  const isAuthRoute = pathname.startsWith('/auth/');
  const isHomeRoute = pathname === '/';
  const isDashboardRoute = pathname.startsWith('/dashboard');

  if (isAuthRoute || isHomeRoute) {
    if (userInfoCookie?.value) {
      try {
        const parsedInfo = JSON.parse(decodeURIComponent(userInfoCookie.value));
        const url = request.nextUrl.clone();
        url.pathname = getRoleDashboardPath(parsedInfo.role);
        return NextResponse.redirect(url);
      } catch {
        // Fall back to continuing if cookie is invalid
      }
    }
    return NextResponse.next();
  }

  if (!userInfoCookie?.value) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  let userInfo: { role: string; permissions: string[]; isSuperAdmin: boolean };
  try {
    userInfo = JSON.parse(decodeURIComponent(userInfoCookie.value));
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  const { role, permissions, isSuperAdmin } = userInfo;

  if (isSuperAdmin || role === 'super_admin') {
    return NextResponse.next();
  }

  let matchedRoute: string | null = null;

  const routeEntries = Object.entries(ROUTE_FEATURE_MAP);
  for (const [routePattern, _features] of routeEntries) {
    if (pathname === routePattern || pathname.startsWith(routePattern + '/')) {
      matchedRoute = routePattern;
      break;
    }
  }

  if (!matchedRoute) {
    return NextResponse.next();
  }

  const requiredFeatures = ROUTE_FEATURE_MAP[matchedRoute];
  if (requiredFeatures.length === 0) {
    return NextResponse.next();
  }

  const normalizedRole = role?.toLowerCase() || '';
  const roleFeatures = permissions?.length ? permissions : (DEFAULT_ROLE_FEATURES[normalizedRole] || []);
  const effectiveFeatures = normalizedRole === 'super_admin' ? [] : roleFeatures;

  const hasAccess = requiredFeatures.some((feature) => effectiveFeatures.includes(feature));

  if (!hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = getRoleDashboardPath(role);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - images, fonts, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
