# Subscription & Feature Management System - Complete Overview

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Feature Enforcement](#feature-enforcement)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Usage Guide](#usage-guide)
8. [Admin Management](#admin-management)

---

## 🏗️ System Architecture

### Overview
The system provides **complete subscription management** with **dynamic feature control** and **plan-based access enforcement**. Features can be managed from the admin dashboard without code changes.

### Key Components
1. **Subscription Plans** - Configurable plans with features and pricing
2. **Feature Management** - Backend-managed feature lists and flags
3. **Access Control** - Guards and service-level enforcement
4. **Limit Enforcement** - Automatic limit checking (branches, users, etc.)
5. **Dynamic Display** - Frontend displays features based on plan data

---

## 🔧 Backend Implementation

### 1. Database Schema (`SubscriptionPlan`)

```typescript
{
  name: string;                    // 'basic', 'premium'
  displayName: string;             // 'MONTHLY', 'MONTHLY PREMIUM'
  description: string;
  price: number;                   // 1000, 2000 (BDT)
  currency: string;                // 'BDT'
  billingCycle: string;            // 'monthly', 'yearly'
  trialPeriod: number;             // Hours (e.g., 168 = 7 days)
  
  // Feature Flags (Boolean controls)
  features: {
    pos: boolean;                  // Core POS access
    inventory: boolean;            // Inventory management
    crm: boolean;                  // Customer management
    accounting: boolean;           // Reports & analytics
    aiInsights: boolean;           // AI features
    multiBranch: boolean;          // Multi-branch support
    maxUsers: number;              // User limit (-1 = unlimited)
    maxBranches: number;           // Branch limit (-1 = unlimited)
  },
  
  // Display Features (Admin-manageable descriptions)
  featureList: string[];           // [
    'Unlimited orders & access accounts',
    'Realtime restaurant sales status',
    'Stock, Inventory & Accounting',
    // ... more features
  ],
  
  stripePriceId: string;
  isActive: boolean;
  sortOrder: number;
}
```

### 2. API Endpoints

#### Subscription Plans
```
GET    /api/v1/subscription-plans              // Get all active plans
GET    /api/v1/subscription-plans/:id          // Get specific plan
POST   /api/v1/subscription-plans              // Create plan (Super Admin)
PATCH  /api/v1/subscription-plans/:id          // Update plan (Super Admin)
DELETE /api/v1/subscription-plans/:id          // Delete plan (Super Admin)
```

### 3. Feature Enforcement Guards

#### `SubscriptionFeatureGuard`
Protects routes based on subscription features:

```typescript
@RequiresFeature('aiInsights')
@Get('ai-analytics')
async getAIAnalytics() {
  // Only accessible if plan has aiInsights: true
}
```

#### `SubscriptionLockMiddleware`
- Checks if subscription is expired
- Blocks expired/trial-expired accounts
- Adds subscription info to request object

### 4. Service-Level Enforcement

#### Branch Creation (`BranchesService`)
```typescript
// Automatic checks:
✅ Multi-branch feature enabled?
✅ Max branches limit reached?
❌ Throws BadRequestException if limits exceeded
```

#### User Creation (`UsersService`)
```typescript
// Automatic checks:
✅ Max users limit reached?
❌ Throws BadRequestException if limit exceeded
```

---

## 💻 Frontend Implementation

### 1. Landing Page (`/`)
- **Dynamic Pricing Cards** - Fetches plans from API
- **Feature Display** - Shows `featureList` from backend
- **Plan Selection** - Links to registration with plan

### 2. Registration Page (`/auth/register`)
- **Plan Selection** - Dynamic plan cards with features
- **Feature Display** - Uses `featureList` or generates from `features`
- **Plan Info** - Shows price, trial period, features

### 3. Checkout Page (`/dashboard/subscriptions/checkout`)
- **Plan Details** - Full feature list from backend
- **Payment Integration** - Stripe checkout session
- **Trial Option** - Start trial without payment

### 4. Subscription Indicator (`SubscriptionIndicator`)
- **Trial Countdown** - Shows remaining trial time
- **Expiry Warnings** - 24h and 1h before expiry
- **Status Display** - Trial/Active/Expired states

---

## 🔒 Feature Enforcement

### How It Works

1. **Route-Level Protection**
   ```typescript
   @RequiresFeature('aiInsights')
   @Get('ai-insights')
   @UseGuards(JwtAuthGuard, SubscriptionFeatureGuard)
   async getInsights() { ... }
   ```

2. **Service-Level Checks**
   ```typescript
   // In BranchesService.create()
   if (!plan.features.multiBranch) {
     throw new BadRequestException('Multi-branch not available');
   }
   if (existingBranches >= plan.features.maxBranches) {
     throw new BadRequestException('Branch limit reached');
   }
   ```

3. **Frontend Feature Gating**
   ```typescript
   // Check features before showing UI
   const hasAI = company?.settings?.features?.aiInsights;
   {hasAI && <AIInsightsComponent />}
   ```

### Feature Flags Available

| Feature | Description | Controls |
|---------|-------------|----------|
| `pos` | Core POS system | POS access |
| `inventory` | Inventory management | Inventory features |
| `crm` | Customer management | CRM features |
| `accounting` | Reports & analytics | Advanced reports |
| `aiInsights` | AI-powered insights | AI features |
| `multiBranch` | Multi-branch support | Branch creation |
| `maxUsers` | User limit | User creation |
| `maxBranches` | Branch limit | Branch creation |

---

## 📊 Current Plans

### MONTHLY (Basic)
- **Price:** ৳1,000/month
- **Trial:** 7 days
- **Features:**
  - POS, Inventory, CRM, Accounting: ✅
  - AI Insights: ❌
  - Multi-Branch: ❌
  - Max Users: 5
  - Max Branches: 1

### MONTHLY PREMIUM
- **Price:** ৳2,000/month
- **Trial:** 7 days
- **Features:**
  - All Basic features: ✅
  - AI Insights: ✅
  - Multi-Branch: ✅ (Unlimited)
  - Max Users: Unlimited
  - Max Branches: Unlimited

---

## 🗄️ Database Schema

### Subscription Plans Collection
```javascript
{
  _id: ObjectId,
  name: "basic",
  displayName: "MONTHLY",
  price: 1000,
  currency: "BDT",
  billingCycle: "monthly",
  trialPeriod: 168,  // 7 days
  features: {
    pos: true,
    inventory: true,
    crm: true,
    accounting: true,
    aiInsights: false,
    multiBranch: false,
    maxUsers: 5,
    maxBranches: 1
  },
  featureList: [
    "Unlimited orders & access accounts",
    "Realtime restaurant sales status",
    // ... more
  ],
  isActive: true,
  sortOrder: 1,
  createdAt: Date,
  updatedAt: Date
}
```

### Company Collection (Subscription Info)
```javascript
{
  _id: ObjectId,
  subscriptionPlan: "basic",
  subscriptionStatus: "trial",  // trial, active, expired
  trialEndDate: Date,
  subscriptionEndDate: Date,
  settings: {
    features: { ... }  // Copied from plan
  }
}
```

---

## 📡 API Usage Examples

### 1. Fetch All Plans (Public)
```typescript
GET /api/v1/subscription-plans

Response:
{
  data: [
    {
      id: "...",
      name: "basic",
      displayName: "MONTHLY",
      price: 1000,
      features: { ... },
      featureList: [ ... ]
    }
  ],
  success: true
}
```

### 2. Update Plan Features (Admin)
```typescript
PATCH /api/v1/subscription-plans/:id
Headers: Authorization: Bearer <super_admin_token>

Body:
{
  "featureList": [
    "Custom feature 1",
    "Custom feature 2",
    "Updated feature description"
  ],
  "features": {
    "aiInsights": true,
    "maxUsers": 10
  }
}
```

---

## 👨‍💼 Admin Management

### How to Manage Features

#### Via API (Recommended)
```typescript
// Update feature list
PATCH /api/v1/subscription-plans/:id
{
  "featureList": [
    "Updated feature 1",
    "New feature added",
    "Removed old feature"
  ]
}
```

#### Via Database (Direct)
```javascript
// MongoDB update
db.subscriptionplans.updateOne(
  { name: "basic" },
  { $set: {
    "featureList": ["New feature list"],
    "features.aiInsights": true
  }}
)
```

#### Via Script
```bash
# Re-seed plans with updated features
cd backend
npx ts-node src/scripts/seed-subscription-plans.ts
```

### Benefits
✅ **No Code Changes** - Update features without deploying  
✅ **Instant Updates** - Changes reflect immediately  
✅ **Flexible** - Customize per plan  
✅ **Version Control** - Track changes via API logs  

---

## 🎯 Feature Enforcement Flow

```
User Action
    ↓
Route Guard (@RequiresFeature)
    ↓
Check Subscription Plan
    ↓
Verify Feature Enabled?
    ↓
    Yes → Allow Access
    ↓
Service-Level Check (if applicable)
    ↓
    ✓ Limit Check (branches, users)
    ✓ Feature Flag Check
    ↓
Execute Action
```

---

## 📱 Frontend Feature Checks

### Example: Conditional Feature Display
```typescript
// Get company subscription
const { data: company } = useGetCompanyByIdQuery(companyId);

// Check feature availability
const hasAI = company?.settings?.features?.aiInsights;
const hasMultiBranch = company?.settings?.features?.multiBranch;

// Conditional rendering
{hasAI && <AIInsightsWidget />}
{hasMultiBranch && <BranchManagement />}
```

### Example: Limit Warnings
```typescript
const { maxUsers, maxBranches } = company?.settings?.features || {};
const currentUsers = users.length;
const currentBranches = branches.length;

{currentUsers >= maxUsers && (
  <Alert>User limit reached. Upgrade to add more users.</Alert>
)}
```

---

## 🔐 Security Features

1. **Subscription Lock Middleware**
   - Blocks expired accounts
   - Blocks trial-expired accounts
   - Auto-locks expired subscriptions

2. **Feature Guard**
   - Validates plan before route access
   - Returns 403 if feature not available

3. **Service-Level Validation**
   - Prevents limit overruns
   - Validates feature flags

4. **Email Notifications**
   - 24h before trial expiry
   - 1h before trial expiry
   - Account expired notification

---

## 📈 Monitoring & Analytics

### Available Metrics
- Subscription status per company
- Feature usage per plan
- Limit tracking (users, branches)
- Trial conversion rates
- Upgrade/downgrade patterns

### Cron Jobs
- **Hourly**: Check expiring subscriptions (24h, 1h)
- **Every 5 minutes**: Lock expired accounts
- **Daily**: Send expiry reminders

---

## 🚀 Getting Started

### 1. Seed Plans
```bash
cd backend
npx ts-node src/scripts/seed-subscription-plans.ts
```

### 2. Register Company
```typescript
POST /api/v1/auth/register-company-owner
{
  "companyName": "My Restaurant",
  "subscriptionPackage": "basic"
}
```

### 3. Use Features
```typescript
// Protected route
@RequiresFeature('aiInsights')
@Get('analytics')
async getAnalytics() { ... }
```

### 4. Check Limits
```typescript
// Automatic in services
await branchesService.create(...);  // Checks branch limit
await usersService.create(...);     // Checks user limit
```

---

## ✨ Key Features Summary

✅ **Dynamic Plan Management** - Update plans without code changes  
✅ **Feature Gating** - Route and service-level enforcement  
✅ **Limit Enforcement** - Automatic branch/user limit checking  
✅ **Trial Management** - Automatic trial expiry and notifications  
✅ **Payment Integration** - Stripe checkout for paid plans  
✅ **Admin Control** - Manage features via API  
✅ **Real-time Display** - Frontend shows current plan features  
✅ **Email Notifications** - Automated expiry reminders  
✅ **Secure** - Multiple layers of access control  

---

## 🎓 Best Practices

1. **Always check features** before showing UI elements
2. **Use guards** for sensitive routes
3. **Check limits** before creating resources
4. **Update via API** instead of direct database changes
5. **Test with different plans** to ensure proper restrictions
6. **Monitor usage** to optimize plans

---

## 📞 Support

For questions or issues:
1. Check this documentation
2. Review API responses for error details
3. Check subscription status in company settings
4. Verify plan features match requirements

---

**Last Updated:** 2025-10-28  
**System Version:** 1.0.0  
**Status:** ✅ Production Ready

