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
  '/dashboard/company-subscriptions': ['subscriptions'],
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ALWAYS_ALLOWED.has(pathname)) {
    return NextResponse.next();
  }

  const userInfoCookie = request.cookies.get('user_info');

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
  const roleFeatures = DEFAULT_ROLE_FEATURES[normalizedRole] || permissions || [];
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
  matcher: '/dashboard/:path*',
};
