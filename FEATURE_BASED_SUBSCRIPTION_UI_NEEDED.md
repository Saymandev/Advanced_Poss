# Feature-Based Subscription UI - Missing

## Current Status

### ✅ Backend - Ready
- `POST /subscriptions` supports `enabledFeatures` array
- `GET /subscription-features` lists all available features
- `POST /subscription-features/calculate-price` calculates price for selected features
- Backend fully supports feature-based subscriptions

### ❌ Frontend - Missing UI
- No toggle to switch between "Fixed Plans" and "Custom Features"
- No UI to browse and select individual features
- No price calculation display for selected features
- No way to create feature-based subscription from frontend

---

## Where It Should Be

**Location**: `/dashboard/subscriptions` page

**UI Flow**:
1. Add view mode toggle: "Fixed Plans" | "Custom Features"
2. When "Custom Features" selected:
   - Show feature catalog (grouped by category)
   - Allow selecting/deselecting features
   - Show real-time price calculation
   - Show billing cycle selector (monthly/yearly)
   - "Create Subscription" button with selected features

---

## Implementation Needed

### 1. Add View Mode Toggle
- Add state: `viewMode: 'plans' | 'features'`
- Toggle buttons above "Available Plans" section
- Show different content based on mode

### 2. Feature Selection UI
- Fetch features from `GET /subscription-features`
- Group by category
- Checkbox selection for each feature
- Real-time price calculation as features are selected

### 3. Create Feature-Based Subscription
- Use `enabledFeatures` in `CreateSubscriptionDto`
- Calculate price before creating
- Show confirmation modal with pricing breakdown

---

**Status**: Ready to implement!

