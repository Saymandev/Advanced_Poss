# Multi-Tenant Public Pages Architecture

## URL Structure

Each company can have multiple branches, each with different products/locations:

```
/[company-slug]                                    → Company landing (shows all branches)
/[company-slug]/[branch-slug]                     → Branch landing
/[company-slug]/[branch-slug]/shop                → Menu/Products for this branch
/[company-slug]/[branch-slug]/product/[id]        → Product details
/[company-slug]/[branch-slug]/cart                → Shopping cart
/[company-slug]/[branch-slug]/checkout            → Checkout
/[company-slug]/[branch-slug]/order-confirmation  → Order success
/[company-slug]/[branch-slug]/track/[orderId]     → Track order
/[company-slug]/[branch-slug]/reserve             → Reservations (branch-specific)
/[company-slug]/about                             → About (company-level)
/[company-slug]/contact                           → Contact (company-level, branch selector)
/[company-slug]/gallery                           → Gallery (company-level)
```

## Architecture Decisions

### 1. Branch Selection Flow

**Company Landing Page (`/[company-slug]`)**:
- Shows company info
- Lists all branches with:
  - Branch name
  - Address/location
  - Opening hours
  - "View Menu" button → redirects to `/[company-slug]/[branch-slug]/shop`
- Map showing all branch locations

**Direct Branch Access**:
- User can directly visit `/[company-slug]/[branch-slug]/shop`
- If branch doesn't exist → 404
- All products shown are branch-specific

### 2. Data Model

```typescript
// Company Schema
{
  slug: string;        // "demo-restaurant" (unique)
  name: string;
  branches: Branch[];
}

// Branch Schema  
{
  slug: string;        // "main-branch" or "downtown-location" (unique per company)
  code: string;        // "MB001" (already exists)
  companyId: ObjectId;
  name: string;
  address: {...};
  menuItems: ObjectId[];  // Branch-specific menu items
}

// MenuItem Schema (already has branchId)
{
  branchId: ObjectId;  // ✅ Already exists!
  companyId: ObjectId;
  name: string;
  // ...
}
```

### 3. API Endpoints

**Public Endpoints (No Auth Required)**:

```typescript
// Get company by slug
GET /api/v1/public/companies/:companySlug

// Get all branches for a company
GET /api/v1/public/companies/:companySlug/branches

// Get branch by slug
GET /api/v1/public/companies/:companySlug/branches/:branchSlug

// Get menu items for a specific branch
GET /api/v1/public/companies/:companySlug/branches/:branchSlug/menu

// Get single product
GET /api/v1/public/companies/:companySlug/branches/:branchSlug/products/:productId

// Get branch reviews
GET /api/v1/public/companies/:companySlug/branches/:branchSlug/reviews

// Get company gallery
GET /api/v1/public/companies/:companySlug/gallery

// Create reservation (branch-specific)
POST /api/v1/public/companies/:companySlug/branches/:branchSlug/reservations

// Create order (branch-specific)
POST /api/v1/public/companies/:companySlug/branches/:branchSlug/orders
```

### 4. Frontend Implementation

**Folder Structure**:
```
frontend/src/app/
├── [companySlug]/
│   ├── page.tsx                    → Company landing (branch selector)
│   ├── about/
│   │   └── page.tsx                → About page
│   ├── contact/
│   │   └── page.tsx                → Contact page
│   ├── gallery/
│   │   └── page.tsx                → Gallery
│   └── [branchSlug]/
│       ├── page.tsx                → Branch landing
│       ├── shop/
│       │   ├── page.tsx            → Menu listing
│       │   └── [productId]/
│       │       └── page.tsx        → Product details
│       ├── cart/
│       │   └── page.tsx            → Shopping cart
│       ├── checkout/
│       │   └── page.tsx            → Checkout
│       ├── order-confirmation/
│       │   └── page.tsx            → Success page
│       ├── track/
│       │   └── [orderId]/
│       │       └── page.tsx        → Order tracking
│       └── reserve/
│           └── page.tsx            → Reservations
```

### 5. Cart & Checkout Logic

**Cart Storage**:
- Store in `localStorage` with key: `cart_[companySlug]_[branchSlug]`
- Cart is branch-specific
- If user switches branch → show warning, clear cart

**Checkout Flow**:
1. Verify branch is active
2. Verify all items are available in that branch
3. Create order with `branchId`
4. Update branch-specific inventory

### 6. Branch Switching

**User Flow**:
1. User on `/demo-restaurant/main-branch/shop`
2. Clicks "Switch Branch" → Shows branch selector
3. User selects "Downtown Location"
4. Redirects to `/demo-restaurant/downtown-location/shop`
5. Cart is cleared (if exists) with confirmation message
6. New branch menu loads

### 7. Implementation Checklist

- [ ] Add `slug` field to Company schema
- [ ] Add `slug` field to Branch schema (generate from name)
- [ ] Create public API endpoints (no auth)
- [ ] Generate slugs on company/branch creation
- [ ] Create company landing page with branch selector
- [ ] Create branch-specific shop pages
- [ ] Implement branch-aware cart system
- [ ] Add branch selector component in header
- [ ] Ensure all orders include `branchId`
- [ ] Test branch switching flow

## Benefits

✅ **Clear Separation**: Each branch has its own menu/products  
✅ **SEO Friendly**: Clean URLs like `/demo-restaurant/downtown/shop`  
✅ **Scalable**: Easy to add more branches  
✅ **User-Friendly**: Customers know exactly which location they're ordering from  
✅ **Inventory Accurate**: Orders tied to specific branch inventory

## Example URLs

```
https://yourapp.com/demo-restaurant
→ Shows all branches, company info

https://yourapp.com/demo-restaurant/main-branch
→ Main branch landing

https://yourapp.com/demo-restaurant/main-branch/shop
→ Main branch menu

https://yourapp.com/demo-restaurant/downtown-location/shop
→ Downtown branch menu (different products!)

https://yourapp.com/demo-restaurant/main-branch/product/salad-123
→ Product detail (only if available in main-branch)

https://yourapp.com/demo-restaurant/main-branch/cart
→ Cart with main-branch items only
```

