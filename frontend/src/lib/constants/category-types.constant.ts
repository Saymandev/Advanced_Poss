/**
 * Category Types Constants
 * 
 * This file contains all valid category types used in the frontend.
 * To add new category types, update:
 * 1. Backend constant: backend/src/modules/categories/constants/category-types.constant.ts
 * 2. This frontend constant file
 * 3. Backend schema enum (if needed)
 */

export enum CategoryType {
  FOOD = 'food',
  BEVERAGE = 'beverage',
  DESSERT = 'dessert',
  SPECIAL = 'special',
}

/**
 * Array of all valid category types
 */
export const CATEGORY_TYPES = Object.values(CategoryType) as string[];

/**
 * Category type labels for display
 */
export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  [CategoryType.FOOD]: 'Food',
  [CategoryType.BEVERAGE]: 'Beverage',
  [CategoryType.DESSERT]: 'Dessert',
  [CategoryType.SPECIAL]: 'Special',
};

/**
 * Category type options for Select components
 */
export const CATEGORY_TYPE_OPTIONS = CATEGORY_TYPES.map((type) => ({
  value: type,
  label: CATEGORY_TYPE_LABELS[type as CategoryType],
}));

/**
 * Default category type
 */
export const DEFAULT_CATEGORY_TYPE = CategoryType.FOOD;

