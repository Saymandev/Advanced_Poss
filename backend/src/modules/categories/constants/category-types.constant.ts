/**
 * Category Types Constants
 * 
 * This file contains all valid category types used throughout the application.
 * To add new category types, update this file and ensure:
 * 1. Backend schema enum is updated (category.schema.ts)
 * 2. Backend DTO validation is updated (create-category.dto.ts)
 * 3. Frontend uses this constant or fetches from API
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
 * Default category type
 */
export const DEFAULT_CATEGORY_TYPE = CategoryType.FOOD;

