# Category Types Guide

## Overview
Category types define the classification of menu categories (e.g., Food, Beverage, Dessert, Special). This guide explains where types come from, how they work, and how to update them.

## Where Category Types Come From

### Backend Source
**File:** `backend/src/modules/categories/constants/category-types.constant.ts`

This is the **single source of truth** for category types. It contains:
- `CategoryType` enum with all valid types
- `CATEGORY_TYPES` array for validation
- `CATEGORY_TYPE_LABELS` for display names
- `DEFAULT_CATEGORY_TYPE` constant

### Frontend Source
**File:** `frontend/src/lib/constants/category-types.constant.ts`

This mirrors the backend constant for frontend use. It provides:
- Same enum and constants as backend
- `CATEGORY_TYPE_OPTIONS` array formatted for Select components

## How It's Used

### Backend Usage

1. **Schema Definition** (`category.schema.ts`)
   ```typescript
   @Prop({
     type: String,
     enum: CATEGORY_TYPES,  // Uses constant
     default: DEFAULT_CATEGORY_TYPE,
   })
   type: string;
   ```

2. **DTO Validation** (`create-category.dto.ts`)
   ```typescript
   @IsEnum(CATEGORY_TYPES)  // Validates against constant
   type: string;
   ```

3. **API Endpoint** (`categories.controller.ts`)
   ```typescript
   @Get('types')
   getCategoryTypes() {
     return {
       types: CATEGORY_TYPES.map((type) => ({
         value: type,
         label: CATEGORY_TYPE_LABELS[type],
       })),
     };
   }
   ```

### Frontend Usage

1. **Form Component** (`categories/page.tsx`)
   ```typescript
   import { CATEGORY_TYPE_OPTIONS, DEFAULT_CATEGORY_TYPE } from '@/lib/constants/category-types.constant';
   
   <Select
     value={formData.type || DEFAULT_CATEGORY_TYPE}
     options={CATEGORY_TYPE_OPTIONS}
   />
   ```

2. **Validation**
   ```typescript
   const validTypes = CATEGORY_TYPE_OPTIONS.map(opt => opt.value);
   if (!validTypes.includes(formData.type)) {
     errors.type = 'Category type is required';
   }
   ```

## How to Add/Update Category Types

### Step 1: Update Backend Constant
**File:** `backend/src/modules/categories/constants/category-types.constant.ts`

```typescript
export enum CategoryType {
  FOOD = 'food',
  BEVERAGE = 'beverage',
  DESSERT = 'dessert',
  SPECIAL = 'special',
  // Add new type here:
  APPETIZER = 'appetizer',  // Example
}

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  [CategoryType.FOOD]: 'Food',
  [CategoryType.BEVERAGE]: 'Beverage',
  [CategoryType.DESSERT]: 'Dessert',
  [CategoryType.SPECIAL]: 'Special',
  // Add label here:
  [CategoryType.APPETIZER]: 'Appetizer',  // Example
};
```

### Step 2: Update Frontend Constant
**File:** `frontend/src/lib/constants/category-types.constant.ts`

Add the same enum value and label to keep them in sync.

### Step 3: Database Migration (if needed)
If you're adding a new type and want existing categories to have a default:
- No migration needed - existing categories keep their current type
- New categories will use `DEFAULT_CATEGORY_TYPE` if not specified

### Step 4: Test
1. Create a new category with the new type
2. Update an existing category to the new type
3. Verify validation works correctly

## Current Types

| Value | Label | Description |
|-------|-------|-------------|
| `food` | Food | Main food items |
| `beverage` | Beverage | Drinks and beverages |
| `dessert` | Dessert | Sweet items |
| `special` | Special | Special/featured items |

## API Endpoint

**GET** `/api/v1/categories/types`

Returns available category types:
```json
{
  "types": [
    { "value": "food", "label": "Food" },
    { "value": "beverage", "label": "Beverage" },
    { "value": "dessert", "label": "Dessert" },
    { "value": "special", "label": "Special" }
  ]
}
```

## Benefits of This Approach

1. **Single Source of Truth**: Types defined in one place (backend constant)
2. **Type Safety**: TypeScript enums provide compile-time checking
3. **Easy Updates**: Change types in one file, affects entire system
4. **Validation**: Automatic validation against valid types
5. **Consistency**: Frontend and backend always in sync
6. **API Access**: Can fetch types dynamically if needed

## Notes

- Always update **both** backend and frontend constants when adding types
- The backend constant is the authoritative source
- Frontend constant should mirror backend for consistency
- Use the API endpoint `/categories/types` if you need dynamic type fetching

