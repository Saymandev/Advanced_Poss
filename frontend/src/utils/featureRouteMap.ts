/**
 * Maps dashboard routes to their required features
 * Used for feature-based access control and redirects
 */
export const FEATURE_ROUTE_MAP: Record<string, string | string[]> = {
  // Main dashboard - requires dashboard feature
  '/dashboard': 'dashboard',
  
  // Staff & Management
  '/dashboard/staff': 'staff-management',
  '/dashboard/role-access': 'role-management',
  '/dashboard/attendance': 'attendance',
  
  // Menu & Products
  '/dashboard/menu-items': 'menu-management',
  '/dashboard/menu': 'menu-management',
  '/dashboard/categories': 'categories',
  
  // Orders & Tables
  '/dashboard/orders': 'order-management',
  '/dashboard/order-history': 'order-management',
  '/dashboard/pos': 'order-management',
  '/dashboard/tables': 'table-management',
  '/dashboard/kitchen': 'kitchen-display',
  
  // Customers
  '/dashboard/customers': 'customer-management',
  '/dashboard/customer-loyalty-ai': ['customer-management', 'loyalty-program'],
  
  // Inventory
  '/dashboard/inventory': 'inventory',
  '/dashboard/stocks': 'inventory',
  '/dashboard/ingredients': 'inventory',
  '/dashboard/suppliers': 'suppliers',
  '/dashboard/purchase-orders': 'purchase-orders',
  
  // Financial
  '/dashboard/expenses': 'expenses',
  '/dashboard/reports': 'reports',
  '/dashboard/pos-reports': 'reports',
  '/dashboard/work-periods': 'work-periods',
  
  // System & Settings
  '/dashboard/settings': 'settings',
  '/dashboard/branches': 'branches',
  
  // Marketing
  '/dashboard/marketing': 'customer-management',
  
  // AI Features
  '/dashboard/ai-menu-optimization': 'menu-management',
};

/**
 * Get required features for a given route
 * @param route - Route path to check
 * @returns Array of required feature IDs (empty array if no requirements)
 */
export function getRequiredFeaturesForRoute(route: string): string[] {
  const normalizedRoute = route.toLowerCase();
  
  // Check exact match first
  if (FEATURE_ROUTE_MAP[normalizedRoute]) {
    const features = FEATURE_ROUTE_MAP[normalizedRoute];
    return Array.isArray(features) ? features : [features];
  }
  
  // Check for partial matches (for nested routes)
  for (const [routePattern, features] of Object.entries(FEATURE_ROUTE_MAP)) {
    if (normalizedRoute.startsWith(routePattern)) {
      return Array.isArray(features) ? features : [features];
    }
  }
  
  return [];
}

/**
 * Check if a route requires feature access
 * @param route - Route path to check
 * @returns true if route requires feature access
 */
export function routeRequiresFeature(route: string): boolean {
  return getRequiredFeaturesForRoute(route).length > 0;
}

