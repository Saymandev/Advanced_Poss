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
    FEATURES.WORK_PERIODS,
  ],
  aiInsights: [
    FEATURES.AI_MENU_OPTIMIZATION,
    FEATURES.AI_CUSTOMER_LOYALTY,
  ],
  multiBranch: [
    FEATURES.BRANCHES,
  ],
};

/**
 * Core features that should always be available (required)
 */
export const CORE_FEATURES = [
  FEATURES.DASHBOARD,
  FEATURES.SETTINGS,
  FEATURES.NOTIFICATIONS,
];

/**
 * All available feature keys from FEATURES constants
 */
export const ALL_FEATURE_KEYS = Object.values(FEATURES);

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
    };
  },
  featureKey: string,
): boolean {
  // Check new enabledFeatureKeys array first
  if (plan.enabledFeatureKeys && plan.enabledFeatureKeys.length > 0) {
    return plan.enabledFeatureKeys.includes(featureKey);
  }

  // Fallback to legacy features object
  if (plan.features) {
    const legacyKeys = convertLegacyFeaturesToKeys(plan.features);
    return legacyKeys.includes(featureKey);
  }

  return false;
}

/**
 * Get all features grouped by category
 */
export function getFeaturesByCategory() {
  const categories: Record<string, { key: string; name: string }[]> = {
    Overview: [
      { key: FEATURES.DASHBOARD, name: 'Dashboard' },
      { key: FEATURES.REPORTS, name: 'Reports' },
    ],
    Staff: [
      { key: FEATURES.STAFF_MANAGEMENT, name: 'Staff Management' },
      { key: FEATURES.ROLE_MANAGEMENT, name: 'Role Management' },
      { key: FEATURES.ATTENDANCE, name: 'Attendance' },
    ],
    Menu: [
      { key: FEATURES.MENU_MANAGEMENT, name: 'Menu Management' },
      { key: FEATURES.CATEGORIES, name: 'Categories' },
      { key: FEATURES.QR_MENUS, name: 'QR Menus' },
    ],
    Orders: [
      { key: FEATURES.ORDER_MANAGEMENT, name: 'Order Management' },
      { key: FEATURES.DELIVERY_MANAGEMENT, name: 'Delivery Management' },
      { key: FEATURES.TABLE_MANAGEMENT, name: 'Table Management' },
      { key: FEATURES.KITCHEN_DISPLAY, name: 'Kitchen Display' },
      { key: FEATURES.CUSTOMER_DISPLAY, name: 'Customer Display' },
      { key: FEATURES.POS_SETTINGS, name: 'POS Settings' },
      { key: FEATURES.PRINTER_MANAGEMENT, name: 'Printer Management' },
      { key: FEATURES.DIGITAL_RECEIPTS, name: 'Digital Receipts' },
    ],
    Customers: [
      { key: FEATURES.CUSTOMER_MANAGEMENT, name: 'Customer Management' },
      { key: FEATURES.LOYALTY_PROGRAM, name: 'Loyalty Program' },
      { key: FEATURES.MARKETING, name: 'Marketing' },
    ],
    'AI Features': [
      { key: FEATURES.AI_MENU_OPTIMIZATION, name: 'AI Menu Optimization' },
      { key: FEATURES.AI_CUSTOMER_LOYALTY, name: 'AI Customer Loyalty' },
    ],
    Inventory: [
      { key: FEATURES.INVENTORY, name: 'Inventory Management' },
      { key: FEATURES.SUPPLIERS, name: 'Suppliers' },
      { key: FEATURES.PURCHASE_ORDERS, name: 'Purchase Orders' },
    { key: FEATURES.WASTAGE_MANAGEMENT, name: 'Wastage Management' },
    ],
    Financial: [
      { key: FEATURES.EXPENSES, name: 'Expense Management' },
      { key: FEATURES.ACCOUNTING, name: 'Accounting' },
      { key: FEATURES.WORK_PERIODS, name: 'Work Periods' },
    ],
    System: [
      { key: FEATURES.SETTINGS, name: 'Settings' },
      { key: FEATURES.BRANCHES, name: 'Branches' },
      { key: FEATURES.NOTIFICATIONS, name: 'Notifications' },
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

