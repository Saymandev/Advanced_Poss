/**
 * Feature IDs Constants
 * 
 * This file contains all valid feature IDs used throughout the application.
 * These IDs are used in:
 * - Role permissions
 * - Feature guards
 * - Frontend feature checks
 * 
 * When adding new features, update this file and ensure:
 * 1. Default permissions are updated in role-permissions.service.ts
 * 2. Frontend features list is updated in role-access/page.tsx
 * 3. Feature route mappings are updated if needed
 */

export const FEATURES = {
  // Overview & Dashboard
  DASHBOARD: 'dashboard',
  REPORTS: 'reports',

  // Staff Management
  STAFF_MANAGEMENT: 'staff-management',
  ROLE_MANAGEMENT: 'role-management',
  ATTENDANCE: 'attendance',

  // Menu & Products
  MENU_MANAGEMENT: 'menu-management',
  CATEGORIES: 'categories',
  QR_MENUS: 'qr-menus',

  // Orders & Tables
  ORDER_MANAGEMENT: 'order-management',
  DELIVERY_MANAGEMENT: 'delivery-management',
  TABLE_MANAGEMENT: 'table-management',
  KITCHEN_DISPLAY: 'kitchen-display',
  CUSTOMER_DISPLAY: 'customer-display',
  POS_SETTINGS: 'pos-settings',
  PRINTER_MANAGEMENT: 'printer-management',
  DIGITAL_RECEIPTS: 'digital-receipts',

  // Customer Management
  CUSTOMER_MANAGEMENT: 'customer-management',
  LOYALTY_PROGRAM: 'loyalty-program',
  MARKETING: 'marketing',

  // AI Features
  AI_MENU_OPTIMIZATION: 'ai-menu-optimization',
  AI_CUSTOMER_LOYALTY: 'ai-customer-loyalty',

  // Inventory & Suppliers
  INVENTORY: 'inventory',
  SUPPLIERS: 'suppliers',
  PURCHASE_ORDERS: 'purchase-orders',
  WASTAGE_MANAGEMENT: 'wastage-management',

  // Financial Management
  EXPENSES: 'expenses',
  ACCOUNTING: 'accounting',
  WORK_PERIODS: 'work-periods',

  // System & Settings
  SETTINGS: 'settings',
  BRANCHES: 'branches',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * Array of all valid feature IDs
 */
export const ALL_FEATURES = Object.values(FEATURES);

/**
 * Feature categories for organization
 */
export const FEATURE_CATEGORIES = {
  OVERVIEW: ['dashboard', 'reports'],
  STAFF: ['staff-management', 'role-management', 'attendance'],
  MENU: ['menu-management', 'categories', 'qr-menus'],
  ORDERS: [
    'order-management',
    'delivery-management',
    'table-management',
    'kitchen-display',
    'customer-display',
    'pos-settings',
    'printer-management',
    'digital-receipts',
  ],
  CUSTOMERS: ['customer-management', 'loyalty-program', 'marketing'],
  AI_FEATURES: ['ai-menu-optimization', 'ai-customer-loyalty'],
  INVENTORY: ['inventory', 'suppliers', 'purchase-orders', 'wastage-management'],
  FINANCIAL: ['expenses', 'accounting', 'work-periods'],
  SYSTEM: ['settings', 'branches', 'notifications'],
} as const;

/**
 * Default features for each role
 */
export const DEFAULT_ROLE_FEATURES: Record<string, string[]> = {
  owner: [
    FEATURES.DASHBOARD,
    FEATURES.REPORTS,
    FEATURES.STAFF_MANAGEMENT,
    FEATURES.ROLE_MANAGEMENT,
    FEATURES.ATTENDANCE,
    FEATURES.MENU_MANAGEMENT,
    FEATURES.CATEGORIES,
    FEATURES.QR_MENUS,
    FEATURES.ORDER_MANAGEMENT,
    FEATURES.DELIVERY_MANAGEMENT,
    FEATURES.TABLE_MANAGEMENT,
    FEATURES.KITCHEN_DISPLAY,
    FEATURES.CUSTOMER_DISPLAY,
    FEATURES.POS_SETTINGS,
    FEATURES.PRINTER_MANAGEMENT,
    FEATURES.DIGITAL_RECEIPTS,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.LOYALTY_PROGRAM,
    FEATURES.MARKETING,
    FEATURES.AI_MENU_OPTIMIZATION,
    FEATURES.AI_CUSTOMER_LOYALTY,
    FEATURES.INVENTORY,
    FEATURES.SUPPLIERS,
    FEATURES.PURCHASE_ORDERS,
    FEATURES.WASTAGE_MANAGEMENT,
    FEATURES.EXPENSES,
    FEATURES.ACCOUNTING,
    FEATURES.WORK_PERIODS,
    FEATURES.SETTINGS,
    FEATURES.BRANCHES,
    FEATURES.NOTIFICATIONS,
  ],
  manager: [
    FEATURES.DASHBOARD,
    FEATURES.REPORTS,
    FEATURES.STAFF_MANAGEMENT,
    FEATURES.ATTENDANCE,
    FEATURES.MENU_MANAGEMENT,
    FEATURES.CATEGORIES,
    FEATURES.QR_MENUS,
    FEATURES.ORDER_MANAGEMENT,
    FEATURES.DELIVERY_MANAGEMENT,
    FEATURES.TABLE_MANAGEMENT,
    FEATURES.KITCHEN_DISPLAY,
    FEATURES.CUSTOMER_DISPLAY,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.LOYALTY_PROGRAM,
    FEATURES.MARKETING,
    FEATURES.AI_MENU_OPTIMIZATION,
    FEATURES.INVENTORY,
    FEATURES.SUPPLIERS,
    FEATURES.WASTAGE_MANAGEMENT,
    FEATURES.EXPENSES,
    FEATURES.WORK_PERIODS,
    FEATURES.NOTIFICATIONS,
  ],
  chef: [
    FEATURES.DASHBOARD,
    FEATURES.MENU_MANAGEMENT,
    FEATURES.CATEGORIES,
    FEATURES.KITCHEN_DISPLAY,
    FEATURES.INVENTORY,
    FEATURES.PURCHASE_ORDERS,
    FEATURES.WASTAGE_MANAGEMENT,
    FEATURES.NOTIFICATIONS,
  ],
  waiter: [
    FEATURES.DASHBOARD,
    FEATURES.ORDER_MANAGEMENT,
    FEATURES.DELIVERY_MANAGEMENT,
    FEATURES.TABLE_MANAGEMENT,
    FEATURES.CUSTOMER_DISPLAY,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.NOTIFICATIONS,
  ],
  cashier: [
    FEATURES.DASHBOARD,
    FEATURES.ORDER_MANAGEMENT,
    FEATURES.CUSTOMER_DISPLAY,
    FEATURES.DIGITAL_RECEIPTS,
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.EXPENSES,
    FEATURES.WORK_PERIODS,
    FEATURES.NOTIFICATIONS,
  ],
};

