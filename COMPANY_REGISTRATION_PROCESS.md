# Company Registration Process

## Overview
When a new company registers in the Advanced POS system, it follows a **one-step registration process** that automatically creates the company, first branch, and owner account all at once.

## Registration Flow

### Step 1: User Fills Registration Form
The user must provide the following information on the `/auth/register` page:

#### Company Information
- **Company Name**: Business name (2-100 characters)
- **Company Type**: Restaurant, Cafe, or Bar
- **Company Email**: Unique email address (used for company login)
- **Country**: Country where business is located

#### Branch Information
- **Branch Name**: Name of the first branch (2-100 characters)
- **Branch Address**: Full address of the branch (10-200 characters)

#### Owner Information
- **First Name**: Owner's first name (2-50 characters)
- **Last Name**: Owner's last name (2-50 characters)
- **Phone Number**: Valid phone number format
- **PIN**: 4-6 digit PIN for authentication

#### Subscription Package
- **Basic**: FREE (12-hour trial)
- **Premium**: ৳2,500/month (7-day trial)
- **Enterprise**: ৳5,000/month (7-day trial)

### Step 2: Backend Processing (`POST /api/v1/auth/register`)

The system performs the following operations **automatically**:

#### 2.1. Validation & Checks
```typescript
// Check if company email already exists
const existingCompany = await companiesService.findByEmail(companyEmail);
if (existingCompany) {
  throw new BadRequestException('Company with this email already exists');
}
```

#### 2.2. Create Company
```typescript
const company = await companiesService.create({
  name: companyName,
  email: companyEmail.toLowerCase(),
  phone: phoneNumber,
  subscriptionPlan: subscriptionPackage, // 'basic', 'premium', or 'enterprise'
  address: {
    street: branchAddress,
    city: 'Unknown', // Can be updated later
    state: 'Unknown',
    country: country,
    zipCode: '00000',
  },
});
```

**What happens:**
- Company record is created with unique email
- Subscription plan is assigned (basic/premium/enterprise)
- Trial period is calculated based on plan:
  - **Basic**: 12 hours from registration
  - **Premium/Enterprise**: 7 days from registration
- Subscription status is set to `'trial'`
- Default currency: BDT (Bangladesh Taka)
- Default language: English

#### 2.3. Create First Branch
```typescript
const branch = await branchesService.create({
  companyId: company._id,
  name: branchName,
  address: {
    street: branchAddress,
    city: 'Unknown',
    state: 'Unknown',
    country: country,
    zipCode: '00000',
  },
});
```

**What happens:**
- First branch is created and linked to the company
- Branch is automatically set as `isActive: true`
- Branch becomes the "Main Branch" for the company

#### 2.4. Create Owner User Account
```typescript
const hashedPin = await PasswordUtil.hash(pin);
const tempPassword = GeneratorUtil.generateToken(); // Random password

const user = await usersService.create({
  firstName: firstName,
  lastName: lastName,
  email: companyEmail, // Same as company email
  phone: phoneNumber,
  password: tempPassword, // User will change this later
  pin: hashedPin, // Hashed PIN for quick login
  role: UserRole.OWNER,
  companyId: company._id,
  branchId: branch._id,
});
```

**What happens:**
- Owner user is created with `role: 'owner'`
- User is linked to both company and branch
- PIN is hashed for security
- A temporary random password is generated (user can change it later)
- User email is same as company email

#### 2.5. Link Company to Owner
```typescript
await companiesService.update(company._id, { 
  ownerId: user._id 
});
```

**What happens:**
- Company record is updated with owner's user ID
- This creates the bidirectional relationship

#### 2.6. Generate Authentication Tokens
```typescript
const tokens = await generateTokens(user);
await usersService.updateRefreshToken(user._id, tokens.refreshToken);
```

**What happens:**
- JWT access token is generated (short-lived, ~15 minutes)
- JWT refresh token is generated (long-lived, ~7 days)
- Refresh token is stored in user's record

### Step 3: Response to Frontend

The API returns:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "contact@company.com",
      "firstName": "John",
      "lastName": "Smith",
      "role": "owner",
      "companyId": "...",
      "branchId": "..."
    },
    "company": {
      "id": "...",
      "name": "Company Name",
      "email": "contact@company.com"
    },
    "branch": {
      "id": "...",
      "name": "Main Branch",
      "address": {...}
    },
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "eyJhbGci..."
    },
    "requiresPayment": true, // false for Basic plan
    "subscriptionPlan": {
      "name": "premium",
      "displayName": "Premium Plan",
      "price": 2500,
      "currency": "BDT",
      "stripePriceId": "price_...",
      "trialPeriod": 168 // hours (7 days)
    }
  }
}
```

### Step 4: Frontend Actions

#### 4.1. Store Authentication
```typescript
dispatch(setCredentials({
  user: response.data.user,
  accessToken: response.data.accessToken,
  refreshToken: response.data.refreshToken,
}));
```

#### 4.2. Redirect Based on Payment

**Current Implementation:**
The frontend currently redirects directly to dashboard regardless of payment requirement. However, the system is designed to handle payment flow as follows:

**Basic Plan (`requiresPayment: false`):**
- Direct redirect to `/dashboard`
- Account active for 12 hours trial period
- Trial mode indicator shows countdown

**Premium/Enterprise Plans (`requiresPayment: true`):**
- ⚠️ **Currently missing**: Payment redirect logic needs to be implemented
- **Should redirect to**: `/payment?plan=premium` or `/payment?plan=enterprise`
- **After payment**: Redirect to dashboard with active subscription

#### 4.3. Save Company Context
The frontend stores company information in Redux state for easy access:
- Company ID
- Company Name
- Branch ID
- User role

## After Registration - Premium/Enterprise Plans

### What Happens When User Selects Premium or Enterprise

#### Step 1: Account Creation with Trial Status
- Company, branch, and owner are created
- Subscription status: `'trial'`
- Trial period: **7 days** (168 hours)
- `requiresPayment: true` is returned in response

#### Step 2: Payment Flow (To Be Implemented)

**Currently Missing Implementation:**

The frontend should check the `requiresPayment` flag and redirect accordingly:

```typescript
// In handleSubmit after registration
if (response.data.requiresPayment) {
  // Redirect to payment page
  router.push(`/payment?plan=${subscriptionPackage}&companyId=${companyId}`);
} else {
  // Redirect to dashboard (Basic plan)
  router.push('/dashboard');
}
```

#### Step 3: Stripe Checkout (When Implemented)

If payment redirect is implemented, the flow would be:

1. **User redirected to `/payment` page**
   - Shows plan details (Premium: ৳2,500/month or Enterprise: ৳5,000/month)
   - Displays trial period information (7 days)
   - Shows what they get during trial

2. **Payment Options:**
   - **Pay Now**: Complete payment immediately via Stripe
   - **Start Trial First**: Begin 7-day trial, pay later (current behavior)

3. **If Payment is Completed:**
   - Stripe webhook activates subscription
   - Subscription status changes from `'trial'` to `'active'`
   - Full features unlocked immediately
   - Monthly billing cycle starts

4. **If Payment is Deferred:**
   - Trial period begins (7 days)
   - Full features available during trial
   - Payment reminder before trial ends

#### Step 4: Dashboard Access

**During Trial Period:**
- Full access to all features
- Trial mode indicator shows countdown
- Subscription status: `'trial'`

**After Trial (If Not Paid):**
- Account may be locked depending on configuration
- Payment prompt shown
- Limited or no access until payment

### What the Owner Can Do During Trial

1. **Access Dashboard**: Owner is automatically logged in
2. **Use All Trial Features**: Full features available during 7-day trial
3. **Manage Menu**: Create categories and menu items
4. **Manage Tables**: Add and configure tables
5. **Manage Staff**: Add other users (manager, chef, waiter, cashier)
6. **Create Orders**: Start taking orders
7. **View Reports**: Access all reporting features
8. **Process Payments**: Use payment features
9. **Inventory Management**: Full inventory access
10. **Multi-branch Support**: (Premium: 5 branches, Enterprise: Unlimited)

### Trial Period Details

**Premium/Enterprise Plans:**
- **Duration**: 7 days (168 hours) from registration
- **Features**: Full access to all features during trial
- **Payment**: Can pay immediately or wait until trial ends
- **After Trial**: Account may be locked if not paid

**Basic Plan:**
- **Duration**: 12 hours from registration
- **Features**: Limited features (POS only)
- **Payment**: Free, no payment required
- **After Trial**: Account locked, requires upgrade to Premium/Enterprise

### Subscription Status

The company's subscription status is tracked:
- `'trial'`: During trial period
- `'active'`: After payment/activation
- `'expired'`: Trial/payment expired
- `'suspended'`: Manually suspended by admin

### Payment Integration Status

**Backend:** ✅ Complete
- Stripe payment service implemented
- Checkout session creation
- Webhook handling for subscription activation
- Payment confirmation logic

**Frontend:** ⚠️ Partially Implemented
- ✅ Registration form collects package selection
- ✅ API returns `requiresPayment` flag
- ❌ Missing: Payment redirect logic
- ❌ Missing: Payment page integration
- ❌ Missing: Success page handling

**What Needs to Be Done:**

1. **Update Registration Handler:**
```typescript
// In handleSubmit after successful registration
if (response.data.requiresPayment) {
  // Store subscription info temporarily
  localStorage.setItem('pendingPayment', JSON.stringify({
    companyId: response.data.company.id,
    plan: response.data.subscriptionPlan.name,
    price: response.data.subscriptionPlan.price,
    stripePriceId: response.data.subscriptionPlan.stripePriceId
  }));
  
  // Redirect to payment page
  router.push(`/payment?plan=${response.data.subscriptionPlan.name}`);
} else {
  // Basic plan - direct to dashboard
  router.push('/dashboard');
}
```

2. **Create Payment Page** (`/payment`):
   - Display plan details and pricing
   - Show trial information (7 days)
   - Integrate Stripe Elements for card input
   - Handle payment processing
   - Redirect to success page on completion

3. **Create Success Page** (`/payment/success`):
   - Confirm payment success
   - Show subscription activation
   - Redirect to dashboard

**Note:** Currently, users with Premium/Enterprise plans are redirected directly to dashboard and get 7 days trial access without payment redirect.

## Login After Registration

After registration, the owner can log in using:

1. **Company Email**: The email used during registration (e.g., `contact@company.com`)
2. **PIN**: The 4-6 digit PIN set during registration

**Login Flow:**
1. Go to `/auth/find-company`
2. Enter company email
3. Select branch (will show the main branch first)
4. Select role (`owner`)
5. Enter PIN
6. Access granted

## Important Notes

### Email Uniqueness
- **Company email must be unique** across the entire system
- If a company email already exists, registration fails
- One company = One email = One owner account (initially)

### Branch Creation
- **First branch is created automatically** during registration
- Additional branches can be created later by the owner
- Each branch can have different menu items, tables, and staff

### User Creation
- **Owner is automatically created** during registration
- Owner has full access to all features
- Owner can create additional users with different roles:
  - `manager`: Can manage staff and settings
  - `chef`: Access to kitchen display
  - `waiter`: Can create orders
  - `cashier`: Can process payments

### Password Management
- A **random temporary password** is generated during registration
- User should change password after first login (via `/dashboard/settings`)
- **PIN is used for quick login** (more convenient for POS operations)

## API Endpoint

```
POST /api/v1/auth/register
```

**Request Body:**
```json
{
  "companyName": "The Golden Fork Restaurant",
  "companyType": "restaurant",
  "companyEmail": "contact@goldenfork.com",
  "country": "United States",
  "branchName": "Downtown Branch",
  "branchAddress": "123 Main Street, New York, NY 10001",
  "package": "premium",
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+1234567890",
  "pin": "1234"
}
```

**Success Response:** `201 Created`

**Error Responses:**
- `400 Bad Request`: Company email already exists
- `400 Bad Request`: Validation errors (invalid email, phone, etc.)
- `500 Internal Server Error`: Server error during creation

## Summary

**The registration process is a single-step operation that:**
1. ✅ Creates the company
2. ✅ Creates the first branch
3. ✅ Creates the owner account
4. ✅ Links everything together
5. ✅ Sets up subscription/trial
6. ✅ Generates authentication tokens
7. ✅ Returns user to dashboard (logged in)

**No additional steps required!** The owner can immediately start using the system.

