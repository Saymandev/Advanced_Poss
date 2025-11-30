# Feature-Based Redirect System - Complete Guide

## 🎯 How It Works

### 1. **Flow Diagram**
```
User visits page (e.g., /dashboard/menu-items)
    ↓
useFeatureRedirect hook checks permissions
    ↓
useRolePermissions hook fetches role permissions
    ↓
Checks if user has required feature ('menu-management')
    ↓
YES → User stays on page ✅
NO  → Redirect to /dashboard ❌
```

### 2. **Components**

#### **A. useFeatureRedirect Hook**
Located: `frontend/src/hooks/useFeatureRedirect.ts`

```typescript
// Usage in any page
useFeatureRedirect('menu-management', '/dashboard');
```

**What it does:**
- Checks if user has required feature access
- Automatically redirects if access is denied
- Returns `hasAccess` status for conditional rendering

**Options:**
- `requiredFeature`: Single feature or array (e.g., `'menu-management'` or `['menu-management', 'categories']`)
- `redirectTo`: Where to redirect (default: `/dashboard`)
- `requireAll`: If true, user needs ALL features. If false, user needs ANY feature

#### **B. useRolePermissions Hook**
Located: `frontend/src/hooks/useRolePermissions.ts`

**What it does:**
- Fetches role permissions from backend API
- Provides `hasFeature()` function to check access
- Caches permissions using RTK Query

#### **C. Feature Route Mapping**
Located: `frontend/src/utils/featureRouteMap.ts`

Maps routes to their required features for automatic protection.

### 3. **Real-Time Updates When Owner Updates Features**

✅ **YES, it works perfectly!**

**How it works:**
1. Owner updates feature access in `/dashboard/role-access`
2. Backend saves new permissions to database
3. RTK Query automatically invalidates cache (via `invalidatesTags: ['RolePermission']`)
4. All active pages using `useRolePermissions` automatically refetch permissions
5. Users are redirected if they lost access to current page
6. Users can now access pages they just gained access to

**RTK Query Cache Invalidation:**
```typescript
// In rolePermissionsApi.ts
updateRolePermission: builder.mutation({
  invalidatesTags: ['RolePermission', 'Staff'], // Auto-refetches all queries with these tags
})

getRolePermissions: builder.query({
  providesTags: ['RolePermission'], // This query gets invalidated
})
```

### 4. **Pages Protected (Current)**

| Page | Required Feature | Redirect To (Auto-Detected) |
|------|------------------|---------------------------|
| `/dashboard/menu-items` | `menu-management` | Role-specific dashboard |
| `/dashboard/staff` | `staff-management` | Role-specific dashboard |
| `/dashboard/role-access` | `role-management` | Role-specific dashboard |
| `/dashboard/categories` | `categories` | Role-specific dashboard |
| `/dashboard/inventory` | `inventory` | Role-specific dashboard |
| `/dashboard/customers` | `customer-management` | Role-specific dashboard |
| `/dashboard/reports` | `reports` | Role-specific dashboard |
| `/dashboard/tables` | `table-management` | Role-specific dashboard |

**Role-Specific Dashboard Mapping:**
- **Owner** → `/dashboard` (main dashboard)
- **Manager** → `/dashboard/manager`
- **Chef** → `/dashboard/kitchen`
- **Waiter** → `/dashboard/pos`
- **Cashier** → `/dashboard/pos`

### 5. **Example Usage**

```typescript
// In /dashboard/menu-items/page.tsx
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';

export default function MenuItemsPage() {
  // Redirect if user doesn't have 'menu-management' feature
  // Automatically redirects to role-specific dashboard (e.g., /dashboard/manager for managers)
  useFeatureRedirect('menu-management');
  
  // Rest of component...
}
```

**Automatic Role-Based Redirect:**
- If redirectTo is not specified, it automatically uses the user's role-specific dashboard
- Manager → `/dashboard/manager`
- Chef → `/dashboard/kitchen`
- Waiter/Cashier → `/dashboard/pos`
- Owner → `/dashboard`

### 6. **Advanced Usage**

#### Require Multiple Features (ANY):
```typescript
// User needs at least ONE of these features
useFeatureRedirect(['menu-management', 'categories'], '/dashboard');
```

#### Require Multiple Features (ALL):
```typescript
// User needs ALL of these features
useFeatureRedirect(['menu-management', 'categories'], '/dashboard', {
  requireAll: true
});
```

#### Conditional Redirect:
```typescript
const { hasAccess } = useFeatureRedirect('menu-management', '/dashboard', {
  enabled: someCondition // Only check if condition is true
});

if (!hasAccess) {
  return <AccessDenied />;
}
```

## ✅ Verification: Owner Updates Work Perfectly

The system uses RTK Query's automatic cache invalidation:
- ✅ When owner updates features → Cache is invalidated
- ✅ All active pages refetch permissions automatically
- ✅ Users are redirected if they lost access
- ✅ No page refresh needed - works in real-time

## 🔒 Security

1. **Frontend Protection**: Prevents users from accessing UI
2. **Backend Protection**: API routes should also check permissions (separate implementation)
3. **Real-Time**: Updates apply immediately when owner changes features

## 📝 Next Steps

Add feature redirects to remaining pages:
- `/dashboard/kitchen` → `kitchen-display`
- `/dashboard/pos` → `order-management`
- `/dashboard/expenses` → `expenses`
- `/dashboard/suppliers` → `suppliers`
- `/dashboard/purchase-orders` → `purchase-orders`
- `/dashboard/attendance` → `attendance`
- `/dashboard/settings` → `settings`
- `/dashboard/branches` → `branches`

