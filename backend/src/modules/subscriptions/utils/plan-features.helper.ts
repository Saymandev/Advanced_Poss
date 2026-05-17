/**
 * Helper utilities for managing subscription plan features
 * Maps system features to plan feature keys
 */

import { FEATURES } from '../../../common/constants/features.constants';

/**
 * Map of legacy feature keys to new feature keys
 */
export const LEGACY_FEATURE_MAP: Record<string, string[]> = {
  pos: [
    FEATURES.ORDER_MANAGEMENT,
    FEATURES.TABLE_MANAGEMENT,
    FEATURES.KITCHEN_DISPLAY,
    FEATURES.CUSTOMER_DISPLAY,
    FEATURES.POS_SETTINGS,
    FEATURES.PRINTER_MANAGEMENT,
    FEATURES.DIGITAL_RECEIPTS,
  ],
  inventory: [
    FEATURES.INVENTORY,
    FEATURES.SUPPLIERS,
    FEATURES.PURCHASE_ORDERS,
  ],
  crm: [
    FEATURES.CUSTOMER_MANAGEMENT,
    FEATURES.LOYALTY_PROGRAM,
    FEATURES.MARKETING,
  ],
  accounting: [
    FEATURES.ACCOUNTING,
    FEATURES.REPORTS,
    FEATURES.EXPENSES,
    FEATURES.INCOME,
    FEATURES.WORK_PERIODS,
  ],
  aiInsights: [
    FEATURES.AI_MENU_OPTIMIZATION,
    FEATURES.AI_CUSTOMER_LOYALTY,
    FEATURES.AI_INSIGHTS,
  ],
  multiBranch: [
    FEATURES.BRANCHES,
  ],
  staff: [
    FEATURES.STAFF_MANAGEMENT,
    FEATURES.ROLE_MANAGEMENT,
    FEATURES.ATTENDANCE,
  ],
  hotel: [
    FEATURES.ROOM_MANAGEMENT,
    FEATURES.BOOKING_MANAGEMENT,
  ],
};

/**
 * Core features that should always be available (required)
 */
export const CORE_FEATURES = [
  FEATURES.DASHBOARD,
  FEATURES.SETTINGS,
  FEATURES.NOTIFICATIONS,
  FEATURES.CMS,
];

/**
 * All available feature keys from FEATURES constants
 */
export const ALL_FEATURE_KEYS = [...Object.values(FEATURES), 'multi-branch'];

/**
 * Convert legacy features object to enabledFeatureKeys array
 */
export function convertLegacyFeaturesToKeys(legacyFeatures: {
  pos?: boolean;
  inventory?: boolean;
  crm?: boolean;
  accounting?: boolean;
  aiInsights?: boolean;
  multiBranch?: boolean;
  staff?: boolean;
  hotel?: boolean;
}): string[] {
  const enabledKeys: string[] = [...CORE_FEATURES];

  if (legacyFeatures.pos) {
    enabledKeys.push(...LEGACY_FEATURE_MAP.pos);
  }
  if (legacyFeatures.inventory) {
    enabledKeys.push(...LEGACY_FEATURE_MAP.inventory);
  }
  if (legacyFeatures.crm) {
    enabledKeys.push(...LEGACY_FEATURE_MAP.crm);
  }
  if (legacyFeatures.accounting) {
    enabledKeys.push(...LEGACY_FEATURE_MAP.accounting);
  }
  if (legacyFeatures.aiInsights) {
    enabledKeys.push(...LEGACY_FEATURE_MAP.aiInsights);
  }
  if (legacyFeatures.multiBranch) {
    enabledKeys.push(...LEGACY_FEATURE_MAP.multiBranch);
  }
  if (legacyFeatures.staff) {
    enabledKeys.push(...LEGACY_FEATURE_MAP.staff);
  }
  if (legacyFeatures.hotel) {
    enabledKeys.push(...LEGACY_FEATURE_MAP.hotel);
  }

  // Remove duplicates
  return [...new Set(enabledKeys)];
}

/**
 * Check if a feature key is enabled in the plan
 */
export function isFeatureEnabledInPlan(
  plan: {
    enabledFeatureKeys?: string[];
    features?: {
      pos?: boolean;
      inventory?: boolean;
      crm?: boolean;
      accounting?: boolean;
      aiInsights?: boolean;
      multiBranch?: boolean;
      staff?: boolean;
      hotel?: boolean;
    };
  },
  featureKey: string,
): boolean {
  const allKeys: string[] = [...CORE_FEATURES];

  // 1. Add keys from granular array
  if (plan.enabledFeatureKeys && Array.isArray(plan.enabledFeatureKeys)) {
    allKeys.push(...plan.enabledFeatureKeys);
  }

  // 2. Add keys from legacy bundle object
  if (plan.features) {
    allKeys.push(...convertLegacyFeaturesToKeys(plan.features));
  }

  // Check if the specific key is in the merged set
  return [...new Set(allKeys)].includes(featureKey);
}

/**
 * Get all features grouped by category
 */
export function getFeaturesByCategory() {
  const categories: Record<string, { key: string; name: string }[]> = {
    'Sales & POS': [
      { key: FEATURES.ORDER_MANAGEMENT, name: 'Sales & Order Management' },
      { key: FEATURES.TABLE_MANAGEMENT, name: 'Table Management' },
      { key: FEATURES.KITCHEN_DISPLAY, name: 'Kitchen Display System' },
      { key: FEATURES.CUSTOMER_DISPLAY, name: 'Customer Display System' },
      { key: FEATURES.PRINTER_MANAGEMENT, name: 'Printer Management' },
      { key: FEATURES.POS_SETTINGS, name: 'Point of Sale Settings' },
      { key: FEATURES.DIGITAL_RECEIPTS, name: 'Digital Receipt System' },
      { key: FEATURES.DELIVERY_MANAGEMENT, name: 'Delivery Management' },
    ],
    Inventory: [
      { key: FEATURES.INVENTORY, name: 'Inventory Management' },
      { key: FEATURES.SUPPLIERS, name: 'Supplier Management' },
      { key: FEATURES.PURCHASE_ORDERS, name: 'Purchase Order Tracking' },
      { key: FEATURES.WASTAGE_MANAGEMENT, name: 'Wastage Management' },
    ],
    Financial: [
      { key: FEATURES.ACCOUNTING, name: 'Advanced Accounting' },
      { key: FEATURES.EXPENSES, name: 'Expense Management' },
      { key: FEATURES.INCOME, name: 'Income Management' },
      { key: FEATURES.REPORTS, name: 'Sales & Analytics Reports' },
      { key: FEATURES.WORK_PERIODS, name: 'Work Period Management' },
    ],
    'Customer & Marketing': [
      { key: FEATURES.CUSTOMER_MANAGEMENT, name: 'Customer CRM' },
      { key: FEATURES.LOYALTY_PROGRAM, name: 'Loyalty & Rewards' },
      { key: FEATURES.AI_CUSTOMER_LOYALTY, name: 'AI-Powered Customer Loyalty' },
      { key: FEATURES.MARKETING, name: 'Campaign Marketing' },
    ],
    'AI Features': [
      { key: FEATURES.AI_MENU_OPTIMIZATION, name: 'AI Menu Optimization' },
      { key: FEATURES.AI_INSIGHTS, name: 'Interactive Business AI' },
    ],
    'Kitchen & Menu': [
      { key: FEATURES.MENU_MANAGEMENT, name: 'Menu Engineering' },
      { key: FEATURES.CATEGORIES, name: 'Category Management' },
      { key: FEATURES.QR_MENUS, name: 'Dynamic QR Menu' },
    ],
    Staffing: [
      { key: FEATURES.STAFF_MANAGEMENT, name: 'Staff Management' },
      { key: FEATURES.ATTENDANCE, name: 'Employee Attendance' },
      { key: FEATURES.ROLE_MANAGEMENT, name: 'Advanced Role Access' },
    ],
    System: [
      { key: FEATURES.DASHBOARD, name: 'Live Dashboard' },
      { key: FEATURES.BRANCHES, name: 'Branch Management' },
      { key: 'multi-branch', name: 'Multi-Branch Support' },
      { key: FEATURES.SETTINGS, name: 'System Settings' },
      { key: FEATURES.NOTIFICATIONS, name: 'Instant Notifications' },
      { key: FEATURES.CMS, name: 'Website Content & Gallery' },
    ],
    Hospitality: [
      { key: FEATURES.ROOM_MANAGEMENT, name: 'Room Management' },
      { key: FEATURES.BOOKING_MANAGEMENT, name: 'Booking & Reservation' },
    ],
  };

  return categories;
}

/**
 * Get feature display name from key
 */
export function getFeatureDisplayName(key: string): string {
  const allCategories = getFeaturesByCategory();
  for (const category of Object.values(allCategories)) {
    const feature = category.find((f) => f.key === key);
    if (feature) {
      return feature.name;
    }
  }
  // Fallback: convert key to display name
  return key
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate feature keys - check if they are valid feature keys from FEATURES constants
 */
export function validateFeatureKeys(featureKeys: string[]): {
  valid: boolean;
  invalidKeys: string[];
} {
  const invalidKeys: string[] = [];
  const validKeysSet = new Set(ALL_FEATURE_KEYS);

  for (const key of featureKeys) {
    if (!validKeysSet.has(key as any)) {
      invalidKeys.push(key);
    }
  }

  return {
    valid: invalidKeys.length === 0,
    invalidKeys,
  };
}

/**
 * Ensure core features are always included
 */
export function ensureCoreFeatures(featureKeys: string[]): string[] {
  const result = [...new Set([...CORE_FEATURES, ...featureKeys])];
  return result;
}

/**
 * Normalize feature keys - remove duplicates, ensure core features, validate
 */
export function normalizeFeatureKeys(featureKeys: string[]): {
  normalized: string[];
  invalidKeys: string[];
} {
  // Remove duplicates
  const uniqueKeys = [...new Set(featureKeys)];

  // Validate
  const validation = validateFeatureKeys(uniqueKeys);

  // Ensure core features are included
  const normalized = ensureCoreFeatures(uniqueKeys);

  return {
    normalized,
    invalidKeys: validation.invalidKeys,
  };
}
