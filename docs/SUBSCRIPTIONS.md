# Subscription & Billing Module

## Overview

The Subscription & Billing module provides complete SaaS subscription management with Stripe integration, including trial periods, plan upgrades/downgrades, usage tracking, automated billing, and webhook handling.

## Features

### 1. Subscription Plans
- **FREE**: Trial plan with limited features
- **BASIC**: For small restaurants ($49/month)
- **PROFESSIONAL**: For growing restaurants ($99/month)
- **ENTERPRISE**: For large chains ($299/month)

### 2. Billing Cycles
- Monthly
- Quarterly (10% discount)
- Yearly (20% discount)

### 3. Subscription Features
- ✅ Free trial periods (14-30 days)
- ✅ Automatic payment processing
- ✅ Stripe integration
- ✅ Usage limits enforcement
- ✅ Plan upgrades/downgrades
- ✅ Prorated billing
- ✅ Subscription pausing/resuming
- ✅ Cancellation management
- ✅ Failed payment handling
- ✅ Webhook event processing

### 4. Usage Tracking
- Current branches count
- Active users count
- Menu items count
- Monthly orders count
- Active tables count
- Customer records count

### 5. Billing History
- Invoice generation
- Payment tracking
- Receipt URLs
- PDF invoices
- Refund management
- Payment failure tracking

## API Endpoints

### Subscriptions

```
POST   /subscriptions                    - Create new subscription
GET    /subscriptions                    - Get all subscriptions (Super Admin)
GET    /subscriptions/:id                - Get subscription by ID
GET    /subscriptions/company/:companyId - Get subscription by company
PUT    /subscriptions/:id                - Update subscription
PATCH  /subscriptions/:id/upgrade        - Upgrade/downgrade plan
PATCH  /subscriptions/:id/cancel         - Cancel subscription
PATCH  /subscriptions/:id/reactivate     - Reactivate cancelled subscription
PATCH  /subscriptions/:id/pause          - Pause subscription
PATCH  /subscriptions/:id/resume         - Resume paused subscription
POST   /subscriptions/:id/payment        - Process payment manually
GET    /subscriptions/:companyId/limits/:limitType - Check usage limit
GET    /subscriptions/company/:companyId/billing-history - Get billing history
GET    /subscriptions/plans/list         - Get all available plans
```

### Webhooks

```
POST   /webhooks/stripe                  - Stripe webhook handler
```

## Subscription Plans Comparison

| Feature | FREE | BASIC | PROFESSIONAL | ENTERPRISE |
|---------|------|-------|--------------|-----------|
| **Price/Month** | $0 | $49 | $99 | $299 |
| **Branches** | 1 | 1 | 5 | Unlimited |
| **Users** | 5 | 10 | 50 | Unlimited |
| **Menu Items** | 50 | 200 | 1,000 | Unlimited |
| **Orders/Month** | 100 | 1,000 | 10,000 | Unlimited |
| **Tables** | 10 | 25 | 100 | Unlimited |
| **Customers** | 100 | 1,000 | 10,000 | Unlimited |
| **AI Insights** | ❌ | ❌ | ✅ | ✅ |
| **Advanced Reports** | ❌ | ✅ | ✅ | ✅ |
| **Multi-Location** | ❌ | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ✅ | ✅ |
| **White Label** | ❌ | ❌ | ❌ | ✅ |
| **Custom Domain** | ❌ | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ | ✅ |
| **Trial Days** | 14 | 14 | 14 | 30 |

## Usage Examples

### 1. Create Subscription

```typescript
POST /subscriptions
{
  "companyId": "60f7b0b3b9e6c40015f9c8a1",
  "plan": "professional",
  "billingCycle": "yearly",
  "email": "company@example.com",
  "companyName": "My Restaurant",
  "paymentMethodId": "pm_1234567890" // Optional
}
```

### 2. Upgrade Subscription

```typescript
PATCH /subscriptions/:id/upgrade
{
  "newPlan": "enterprise",
  "billingCycle": "yearly" // Optional
}
```

### 3. Cancel Subscription

```typescript
PATCH /subscriptions/:id/cancel
{
  "reason": "Too expensive",
  "cancelImmediately": false // Cancel at period end
}
```

### 4. Process Payment

```typescript
POST /subscriptions/:id/payment
{
  "paymentMethodId": "pm_1234567890"
}
```

### 5. Check Usage Limit

```typescript
GET /subscriptions/:companyId/limits/maxBranches

Response:
{
  "reached": false,
  "current": 3,
  "limit": 5
}
```

## Stripe Integration

### Setup

1. **Environment Variables**:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

2. **Webhook Configuration**:
   - URL: `https://your-domain.com/webhooks/stripe`
   - Events to listen:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `invoice.payment_action_required`
     - `customer.subscription.trial_will_end`
     - `charge.succeeded`
     - `charge.failed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

### Webhook Event Handling

The system automatically handles the following Stripe events:

1. **Subscription Events**:
   - Created: Logs subscription creation
   - Updated: Syncs subscription status and period dates
   - Deleted: Marks subscription as cancelled

2. **Invoice Events**:
   - Paid: Creates billing history, updates payment status
   - Payment Failed: Increments failed attempts, updates status
   - Action Required: Sends notification to customer

3. **Payment Events**:
   - Charge Succeeded: Updates billing record with receipt
   - Charge Failed: Marks payment as failed
   - Payment Intent: Tracks payment processing

## Automated Tasks

### 1. Trial Expiration Check
- **Schedule**: Daily at midnight
- **Action**: Checks for expired trials and attempts to charge customers

### 2. Recurring Payments
- **Schedule**: Daily at midnight
- **Action**: Processes due subscription payments

## Usage Limit Enforcement

The system enforces subscription limits through middleware and guards:

```typescript
// Example: Check if company can create a new branch
const limitCheck = await subscriptionsService.checkLimit(
  companyId,
  'maxBranches'
);

if (limitCheck.reached) {
  throw new ForbiddenException('Branch limit reached. Please upgrade your plan.');
}
```

## Subscription Status Flow

```
TRIAL → ACTIVE → (optional) PAST_DUE → EXPIRED/CANCELLED
         ↓
      PAUSED → ACTIVE
```

### Status Descriptions

- **TRIAL**: Customer is in free trial period
- **ACTIVE**: Subscription is active and paid
- **PAST_DUE**: Payment failed, grace period active
- **CANCELLED**: Subscription cancelled by customer
- **EXPIRED**: Trial or subscription expired without payment
- **PAUSED**: Temporarily paused by customer

## Payment Status Flow

```
PENDING → PROCESSING → SUCCEEDED
             ↓
          FAILED → RETRY → SUCCEEDED/REFUNDED
```

## Database Schema

### Subscription
```typescript
{
  companyId: ObjectId,
  plan: 'free' | 'basic' | 'professional' | 'enterprise',
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'paused',
  billingCycle: 'monthly' | 'quarterly' | 'yearly',
  price: Number,
  currency: String,
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  stripePriceId: String,
  stripePaymentMethodId: String,
  trialStartDate: Date,
  trialEndDate: Date,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  nextBillingDate: Date,
  limits: {
    maxBranches: Number,
    maxUsers: Number,
    maxMenuItems: Number,
    maxOrders: Number,
    maxTables: Number,
    maxCustomers: Number,
    aiInsightsEnabled: Boolean,
    advancedReportsEnabled: Boolean,
    multiLocationEnabled: Boolean,
    apiAccessEnabled: Boolean,
    whitelabelEnabled: Boolean,
    customDomainEnabled: Boolean,
    prioritySupportEnabled: Boolean
  },
  usage: {
    currentBranches: Number,
    currentUsers: Number,
    currentMenuItems: Number,
    currentOrders: Number,
    currentTables: Number,
    currentCustomers: Number,
    lastUpdated: Date
  },
  autoRenew: Boolean,
  failedPaymentAttempts: Number,
  lastPaymentDate: Date,
  discountCode: String,
  discountPercent: Number,
  addons: [String],
  metadata: Object
}
```

### Billing History
```typescript
{
  companyId: ObjectId,
  subscriptionId: ObjectId,
  invoiceNumber: String,
  stripeInvoiceId: String,
  stripePaymentIntentId: String,
  stripeChargeId: String,
  invoiceStatus: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible',
  paymentStatus: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded',
  amount: Number,
  tax: Number,
  discount: Number,
  total: Number,
  currency: String,
  billingDate: Date,
  dueDate: Date,
  paidAt: Date,
  paymentMethod: String,
  receiptUrl: String,
  invoicePdfUrl: String,
  failureReason: String,
  refundedAmount: Number,
  attemptCount: Number
}
```

## Testing

### Test Cards (Stripe)

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

### Test Scenarios

1. **Create subscription with trial**
2. **Successful payment after trial**
3. **Failed payment handling**
4. **Plan upgrade with proration**
5. **Subscription cancellation**
6. **Webhook event processing**

## Error Handling

Common errors and solutions:

1. **Payment Failed**: 
   - Check card validity
   - Verify sufficient funds
   - Update payment method

2. **Limit Reached**:
   - Upgrade to higher plan
   - Contact support for custom limits

3. **Webhook Signature Invalid**:
   - Verify webhook secret
   - Check payload integrity

## Best Practices

1. **Always handle webhook events**: Critical for subscription sync
2. **Monitor failed payments**: Set up alerts for payment failures
3. **Test in Stripe test mode**: Before going live
4. **Implement usage tracking**: Update usage metrics regularly
5. **Provide clear upgrade paths**: Help customers understand plan benefits
6. **Handle edge cases**: Trial conversions, failed payments, cancellations

## Security Considerations

1. **Webhook signature verification**: Always verify Stripe signatures
2. **API key protection**: Never expose Stripe keys
3. **Usage limit enforcement**: Prevent abuse through proper checks
4. **Payment method security**: Use Stripe Elements for card input
5. **PCI compliance**: Let Stripe handle card data

## Future Enhancements

- [ ] Add-ons marketplace
- [ ] Volume-based pricing
- [ ] Custom plan creation
- [ ] Multi-currency support
- [ ] Invoice customization
- [ ] Dunning management
- [ ] Revenue analytics dashboard
- [ ] Churn prediction
- [ ] Customer lifetime value tracking
- [ ] Self-service plan changes

