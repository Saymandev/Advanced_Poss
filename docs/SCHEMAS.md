# 📊 Database Schemas

Complete MongoDB schema definitions for the Restaurant POS System.

## Core Collections

### 1. Users Collection

```typescript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  pin: String (6-digit, hashed, optional),
  firstName: String (required),
  lastName: String (required),
  phone: String,
  role: Enum ['super_admin', 'owner', 'manager', 'chef', 'waiter'],
  avatar: String (URL),
  isActive: Boolean (default: true),
  isEmailVerified: Boolean (default: false),
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  twoFactorEnabled: Boolean (default: false),
  twoFactorSecret: String,
  
  // Role-specific fields
  companyId: ObjectId (ref: 'Company'),
  branchId: ObjectId (ref: 'Branch'),
  permissions: [String], // Fine-grained permissions
  
  // Staff-specific
  employeeId: String,
  salary: Number,
  commissionRate: Number,
  shift: Enum ['morning', 'evening', 'night'],
  joinedDate: Date,
  
  // Metadata
  lastLogin: Date,
  lastLoginIP: String,
  loginAttempts: Number (default: 0),
  lockUntil: Date,
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- email (unique)
- companyId + branchId
- role
- isActive
```

### 2. Companies Collection

```typescript
{
  _id: ObjectId,
  name: String (required),
  legalName: String,
  registrationNumber: String,
  logo: String (URL),
  
  // Contact
  email: String (required),
  phone: String (required),
  website: String,
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Ownership
  ownerId: ObjectId (ref: 'User'),
  
  // Subscription
  subscriptionPlan: Enum ['free', 'basic', 'premium'],
  subscriptionStatus: Enum ['active', 'inactive', 'trial', 'expired'],
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  trialEndDate: Date,
  stripeCustomerId: String,
  
  // Settings
  settings: {
    currency: String (default: 'USD'),
    timezone: String,
    dateFormat: String,
    language: String (default: 'en'),
    taxRate: Number,
    taxName: String (e.g., 'VAT'),
    
    // Features enabled
    features: {
      pos: Boolean (default: true),
      inventory: Boolean,
      crm: Boolean,
      accounting: Boolean,
      aiInsights: Boolean
    }
  },
  
  isActive: Boolean (default: true),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- ownerId
- email (unique)
- subscriptionStatus
```

### 3. Branches Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  name: String (required),
  code: String (unique, auto-generated),
  
  // Contact
  phone: String,
  email: String,
  
  // Address
  address: {
    street: String (required),
    city: String (required),
    state: String,
    country: String (required),
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Manager
  managerId: ObjectId (ref: 'User'),
  
  // Operational
  isActive: Boolean (default: true),
  openingHours: [{
    day: Enum ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    open: String (HH:mm),
    close: String (HH:mm),
    isClosed: Boolean (default: false)
  }],
  
  // Capacity
  totalTables: Number,
  totalSeats: Number,
  
  // Settings
  settings: {
    autoAcceptOrders: Boolean (default: true),
    printReceipts: Boolean (default: true),
    allowTips: Boolean (default: true),
    defaultTipPercentage: Number
  },
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId
- code (unique)
- isActive
```

### 4. Categories Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  branchId: ObjectId (ref: 'Branch'), // null for company-wide
  
  name: String (required),
  description: String,
  image: String (URL),
  icon: String,
  color: String (hex),
  
  type: Enum ['food', 'beverage', 'dessert', 'special'],
  
  // Ordering
  sortOrder: Number (default: 0),
  
  isActive: Boolean (default: true),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId + branchId
- type
```

### 5. MenuItems Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  branchId: ObjectId (ref: 'Branch'), // null for company-wide
  categoryId: ObjectId (ref: 'Category', required),
  
  name: String (required),
  description: String,
  images: [String] (URLs),
  
  // Pricing
  price: Number (required),
  cost: Number, // Recipe cost
  margin: Number, // Calculated percentage
  
  // Variants & Modifiers
  variants: [{
    name: String, // e.g., "Size"
    options: [{
      name: String, // e.g., "Large"
      priceModifier: Number // +/- amount
    }]
  }],
  
  addons: [{
    name: String,
    price: Number,
    isAvailable: Boolean (default: true)
  }],
  
  // Inventory
  trackInventory: Boolean (default: false),
  ingredients: [{
    ingredientId: ObjectId (ref: 'Ingredient'),
    quantity: Number,
    unit: String
  }],
  
  // Availability
  isAvailable: Boolean (default: true),
  availableFrom: String (HH:mm),
  availableTo: String (HH:mm),
  availableDays: [String],
  
  // Nutrition (optional)
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    allergens: [String]
  },
  
  // Tags & Flags
  tags: [String], // ['spicy', 'vegan', 'popular']
  isPopular: Boolean (default: false),
  isFeatured: Boolean (default: false),
  isNew: Boolean (default: false),
  
  // Stats
  totalOrders: Number (default: 0),
  totalRevenue: Number (default: 0),
  averageRating: Number,
  
  // Preparation
  preparationTime: Number (minutes),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId + branchId
- categoryId
- isAvailable
- tags
```

### 6. Tables Collection

```typescript
{
  _id: ObjectId,
  branchId: ObjectId (ref: 'Branch', required),
  
  tableNumber: String (required),
  qrCode: String (unique, auto-generated),
  
  capacity: Number (required),
  location: String, // 'Indoor', 'Outdoor', 'VIP'
  
  status: Enum ['available', 'occupied', 'reserved', 'cleaning'],
  
  // Current session
  currentOrderId: ObjectId (ref: 'Order'),
  occupiedAt: Date,
  occupiedBy: ObjectId (ref: 'User'),
  
  // Reservation
  reservedFor: Date,
  reservedBy: {
    name: String,
    phone: String,
    partySize: Number
  },
  
  isActive: Boolean (default: true),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- branchId + tableNumber (unique)
- status
- reservedFor
```

### 7. Orders Collection

```typescript
{
  _id: ObjectId,
  orderNumber: String (unique, auto-generated),
  companyId: ObjectId (ref: 'Company', required),
  branchId: ObjectId (ref: 'Branch', required),
  
  // Type
  orderType: Enum ['dine_in', 'takeaway', 'delivery'],
  
  // Table (for dine-in)
  tableId: ObjectId (ref: 'Table'),
  
  // Customer
  customerId: ObjectId (ref: 'Customer'),
  customerName: String,
  customerPhone: String,
  
  // Delivery address (for delivery)
  deliveryAddress: {
    street: String,
    city: String,
    zipCode: String,
    coordinates: { lat: Number, lng: Number },
    instructions: String
  },
  
  // Items
  items: [{
    menuItemId: ObjectId (ref: 'MenuItem', required),
    name: String (required),
    quantity: Number (required),
    price: Number (required),
    
    // Customization
    variant: {
      name: String,
      option: String,
      priceModifier: Number
    },
    addons: [{
      name: String,
      price: Number
    }],
    
    specialInstructions: String,
    
    // Kitchen status
    status: Enum ['pending', 'preparing', 'ready', 'served'],
    preparedAt: Date,
    servedAt: Date,
    
    subtotal: Number
  }],
  
  // Pricing
  subtotal: Number (required),
  taxRate: Number,
  taxAmount: Number,
  discountType: Enum ['percentage', 'fixed'],
  discountValue: Number,
  discountAmount: Number,
  tipAmount: Number (default: 0),
  deliveryFee: Number (default: 0),
  total: Number (required),
  
  // Status
  status: Enum ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
  
  // Payment
  paymentStatus: Enum ['pending', 'paid', 'partially_paid', 'refunded'],
  paymentMethod: Enum ['cash', 'card', 'mobile', 'online'],
  paymentDetails: {
    transactionId: String,
    paidAmount: Number,
    changeAmount: Number,
    paidAt: Date
  },
  
  // Split billing
  splits: [{
    amount: Number,
    paymentMethod: String,
    paidBy: String
  }],
  
  // Staff
  createdBy: ObjectId (ref: 'User', required), // Waiter
  assignedChef: ObjectId (ref: 'User'),
  
  // Timing
  estimatedTime: Number (minutes),
  preparationStartedAt: Date,
  readyAt: Date,
  completedAt: Date,
  
  // Loyalty
  loyaltyPointsEarned: Number (default: 0),
  loyaltyPointsRedeemed: Number (default: 0),
  
  // Notes
  notes: String,
  cancellationReason: String,
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- orderNumber (unique)
- companyId + branchId
- customerId
- status + paymentStatus
- createdAt (for reports)
- tableId
```

### 8. Customers Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  
  firstName: String (required),
  lastName: String,
  email: String,
  phone: String (required, unique),
  
  // Address
  addresses: [{
    label: String, // 'Home', 'Work'
    street: String,
    city: String,
    zipCode: String,
    coordinates: { lat: Number, lng: Number },
    isDefault: Boolean (default: false)
  }],
  
  // Loyalty
  loyaltyPoints: Number (default: 0),
  loyaltyTier: Enum ['bronze', 'silver', 'gold', 'platinum'],
  
  // Stats
  totalOrders: Number (default: 0),
  totalSpent: Number (default: 0),
  averageOrderValue: Number (default: 0),
  lastOrderDate: Date,
  
  // Preferences
  preferences: {
    favoriteItems: [ObjectId] (ref: 'MenuItem'),
    dietaryRestrictions: [String],
    allergies: [String]
  },
  
  // Marketing
  marketingConsent: Boolean (default: false),
  smsConsent: Boolean (default: false),
  
  // Feedback
  averageRating: Number,
  totalReviews: Number (default: 0),
  
  // Tags
  tags: [String], // ['vip', 'regular', 'new']
  
  // Birthday
  birthdate: Date,
  
  notes: String,
  
  isActive: Boolean (default: true),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId
- phone (unique)
- email
- loyaltyPoints
```

### 9. Ingredients Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  branchId: ObjectId (ref: 'Branch'),
  
  name: String (required),
  description: String,
  sku: String (unique),
  
  category: String, // 'Dairy', 'Meat', 'Vegetables'
  
  // Stock
  currentStock: Number (required),
  minimumStock: Number (required),
  maximumStock: Number,
  unit: String (required), // 'kg', 'ltr', 'pcs'
  
  // Pricing
  costPerUnit: Number (required),
  
  // Supplier
  supplierId: ObjectId (ref: 'Supplier'),
  
  // Alerts
  lowStockAlert: Boolean (default: true),
  alertThreshold: Number,
  
  // Expiry
  expiryDate: Date,
  batchNumber: String,
  
  // Stats
  totalUsed: Number (default: 0),
  totalPurchased: Number (default: 0),
  
  isActive: Boolean (default: true),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId + branchId
- sku
- currentStock (for low stock alerts)
```

### 10. Suppliers Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  
  name: String (required),
  contactPerson: String,
  email: String,
  phone: String (required),
  
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Financial
  paymentTerms: String, // 'Net 30', 'COD'
  taxId: String,
  
  // Products
  suppliedCategories: [String],
  
  // Stats
  totalOrders: Number (default: 0),
  totalPurchaseAmount: Number (default: 0),
  
  // Rating
  rating: Number,
  
  notes: String,
  
  isActive: Boolean (default: true),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId
- phone
```

### 11. PurchaseOrders Collection

```typescript
{
  _id: ObjectId,
  orderNumber: String (unique, auto-generated),
  companyId: ObjectId (ref: 'Company', required),
  branchId: ObjectId (ref: 'Branch', required),
  supplierId: ObjectId (ref: 'Supplier', required),
  
  items: [{
    ingredientId: ObjectId (ref: 'Ingredient', required),
    name: String (required),
    quantity: Number (required),
    unit: String (required),
    unitPrice: Number (required),
    subtotal: Number (required)
  }],
  
  subtotal: Number (required),
  taxAmount: Number,
  shippingCost: Number (default: 0),
  total: Number (required),
  
  status: Enum ['draft', 'sent', 'confirmed', 'received', 'cancelled'],
  
  orderDate: Date (required),
  expectedDeliveryDate: Date,
  receivedDate: Date,
  
  createdBy: ObjectId (ref: 'User', required),
  approvedBy: ObjectId (ref: 'User'),
  receivedBy: ObjectId (ref: 'User'),
  
  notes: String,
  invoiceNumber: String,
  invoiceUrl: String,
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- orderNumber (unique)
- companyId + branchId
- supplierId
- status
```

### 12. Expenses Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  branchId: ObjectId (ref: 'Branch', required),
  
  category: Enum ['purchase', 'salary', 'rent', 'utilities', 'maintenance', 'marketing', 'other'],
  description: String (required),
  
  amount: Number (required),
  
  // Reference
  referenceType: String, // 'PurchaseOrder', 'Salary', etc.
  referenceId: ObjectId,
  
  paymentMethod: Enum ['cash', 'bank_transfer', 'card', 'check'],
  
  date: Date (required),
  
  // Receipt
  receiptUrl: String,
  invoiceNumber: String,
  
  // Supplier (if applicable)
  supplierId: ObjectId (ref: 'Supplier'),
  
  createdBy: ObjectId (ref: 'User', required),
  approvedBy: ObjectId (ref: 'User'),
  
  notes: String,
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId + branchId
- category
- date (for reports)
```

### 13. Attendance Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required),
  branchId: ObjectId (ref: 'Branch', required),
  
  date: Date (required),
  
  checkIn: Date,
  checkOut: Date,
  
  shift: Enum ['morning', 'evening', 'night'],
  
  status: Enum ['present', 'absent', 'late', 'half_day', 'leave'],
  
  // Working hours
  hoursWorked: Number,
  overtimeHours: Number,
  
  // Location (GPS)
  checkInLocation: {
    lat: Number,
    lng: Number
  },
  checkOutLocation: {
    lat: Number,
    lng: Number
  },
  
  notes: String,
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- userId + date (unique)
- branchId
- date
```

### 14. Leaves Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required),
  branchId: ObjectId (ref: 'Branch', required),
  
  leaveType: Enum ['sick', 'casual', 'annual', 'unpaid'],
  
  startDate: Date (required),
  endDate: Date (required),
  totalDays: Number (required),
  
  reason: String (required),
  
  status: Enum ['pending', 'approved', 'rejected'],
  
  approvedBy: ObjectId (ref: 'User'),
  approvalDate: Date,
  rejectionReason: String,
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- userId
- status
- startDate
```

### 15. Salaries Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required),
  branchId: ObjectId (ref: 'Branch', required),
  
  month: Number (1-12),
  year: Number,
  
  // Salary components
  baseSalary: Number (required),
  commission: Number (default: 0),
  bonus: Number (default: 0),
  overtime: Number (default: 0),
  deductions: Number (default: 0),
  
  totalAmount: Number (required),
  
  // Working days
  workingDays: Number,
  presentDays: Number,
  absentDays: Number,
  leaveDays: Number,
  
  status: Enum ['pending', 'paid', 'cancelled'],
  
  paymentDate: Date,
  paymentMethod: Enum ['cash', 'bank_transfer', 'check'],
  
  notes: String,
  
  createdBy: ObjectId (ref: 'User', required),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- userId + month + year (unique)
- status
```

### 16. Subscriptions Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  
  plan: Enum ['free', 'basic', 'premium'],
  status: Enum ['active', 'inactive', 'trial', 'expired', 'cancelled'],
  
  // Stripe
  stripeSubscriptionId: String,
  stripeCustomerId: String,
  stripePriceId: String,
  
  // Dates
  startDate: Date (required),
  endDate: Date (required),
  trialEndDate: Date,
  cancelledAt: Date,
  
  // Pricing
  amount: Number (required),
  currency: String (default: 'USD'),
  billingCycle: Enum ['monthly', 'yearly'],
  
  // Features
  features: {
    maxBranches: Number,
    maxUsers: Number,
    aiInsights: Boolean,
    advancedReports: Boolean,
    prioritySupport: Boolean
  },
  
  autoRenew: Boolean (default: true),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId
- status
- endDate
```

### 17. Invoices Collection (Subscription)

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  subscriptionId: ObjectId (ref: 'Subscription', required),
  
  invoiceNumber: String (unique, auto-generated),
  
  amount: Number (required),
  taxAmount: Number,
  total: Number (required),
  currency: String (default: 'USD'),
  
  status: Enum ['pending', 'paid', 'failed', 'refunded'],
  
  // Stripe
  stripeInvoiceId: String,
  
  // Dates
  invoiceDate: Date (required),
  dueDate: Date (required),
  paidDate: Date,
  
  // Payment
  paymentMethod: String,
  
  invoiceUrl: String,
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- invoiceNumber (unique)
- companyId
- status
```

### 18. Reviews Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  branchId: ObjectId (ref: 'Branch', required),
  orderId: ObjectId (ref: 'Order', required),
  customerId: ObjectId (ref: 'Customer', required),
  
  // Ratings
  foodRating: Number (1-5, required),
  serviceRating: Number (1-5, required),
  ambianceRating: Number (1-5),
  overallRating: Number (1-5, required),
  
  // Comments
  comment: String,
  
  // Item-specific reviews
  itemReviews: [{
    menuItemId: ObjectId (ref: 'MenuItem'),
    rating: Number (1-5),
    comment: String
  }],
  
  // Response
  response: String,
  respondedBy: ObjectId (ref: 'User'),
  respondedAt: Date,
  
  isPublished: Boolean (default: true),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId + branchId
- customerId
- orderId
- overallRating
```

### 19. Campaigns Collection (CRM)

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  
  name: String (required),
  description: String,
  type: Enum ['email', 'sms', 'push'],
  
  // Targeting
  targetAudience: {
    segmentType: Enum ['all', 'tier', 'tag', 'custom'],
    tiers: [String], // ['gold', 'platinum']
    tags: [String],
    customFilter: Object
  },
  
  // Content
  subject: String,
  message: String (required),
  
  // Scheduling
  status: Enum ['draft', 'scheduled', 'sent', 'cancelled'],
  scheduledFor: Date,
  sentAt: Date,
  
  // Stats
  totalRecipients: Number (default: 0),
  delivered: Number (default: 0),
  opened: Number (default: 0),
  clicked: Number (default: 0),
  
  createdBy: ObjectId (ref: 'User', required),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId
- status
- scheduledFor
```

### 20. ActivityLogs Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  branchId: ObjectId (ref: 'Branch'),
  userId: ObjectId (ref: 'User', required),
  
  action: String (required), // 'user.login', 'order.created', etc.
  entity: String, // 'Order', 'User', etc.
  entityId: ObjectId,
  
  description: String (required),
  
  // Request details
  method: String, // 'POST', 'PUT', etc.
  endpoint: String,
  ipAddress: String,
  userAgent: String,
  
  // Changes (for updates)
  changes: {
    before: Object,
    after: Object
  },
  
  severity: Enum ['info', 'warning', 'error', 'critical'],
  
  createdAt: Date
}

// Indexes
- companyId
- userId
- action
- createdAt (TTL: 90 days)
```

### 21. Notifications Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required),
  
  type: Enum ['order', 'payment', 'inventory', 'system', 'marketing'],
  
  title: String (required),
  message: String (required),
  
  // Data payload
  data: Object,
  
  // Status
  isRead: Boolean (default: false),
  readAt: Date,
  
  // Priority
  priority: Enum ['low', 'normal', 'high', 'urgent'],
  
  // Action
  actionUrl: String,
  actionLabel: String,
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- userId + isRead
- createdAt (TTL: 30 days)
```

### 22. Backups Collection

```typescript
{
  _id: ObjectId,
  companyId: ObjectId (ref: 'Company', required),
  
  type: Enum ['auto', 'manual'],
  
  fileName: String (required),
  fileSize: Number, // in bytes
  fileUrl: String,
  
  collections: [String], // Collections included
  
  status: Enum ['in_progress', 'completed', 'failed'],
  
  // Restore info
  restoredAt: Date,
  restoredBy: ObjectId (ref: 'User'),
  
  createdBy: ObjectId (ref: 'User'),
  
  expiresAt: Date, // Auto-delete after 30 days
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- companyId
- status
- createdAt
```

## Relationships Diagram

```
Company (1) ──→ (N) Branches
Company (1) ──→ (N) Users
Company (1) ──→ (1) Subscription
Branch (1) ──→ (N) Tables
Branch (1) ──→ (N) Orders
Branch (1) ──→ (N) Users
Category (1) ──→ (N) MenuItems
MenuItem (N) ──→ (N) Ingredients
Order (N) ──→ (1) Customer
Order (N) ──→ (1) Table
Order (1) ──→ (N) Items
Supplier (1) ──→ (N) PurchaseOrders
User (1) ──→ (N) Attendance
User (1) ──→ (N) Salaries
```

## Indexes Summary

For optimal performance, create these compound indexes:

```javascript
// Orders - Most queried collection
db.orders.createIndex({ "companyId": 1, "branchId": 1, "createdAt": -1 });
db.orders.createIndex({ "status": 1, "paymentStatus": 1 });
db.orders.createIndex({ "customerId": 1, "createdAt": -1 });

// Users - Authentication
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "companyId": 1, "role": 1 });

// MenuItems - POS performance
db.menuItems.createIndex({ "companyId": 1, "categoryId": 1, "isAvailable": 1 });

// Attendance - Reports
db.attendance.createIndex({ "userId": 1, "date": -1 });
db.attendance.createIndex({ "branchId": 1, "date": -1 });

// ActivityLogs - TTL index for auto-cleanup
db.activityLogs.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 7776000 }); // 90 days
```

---

This schema design supports:
- ✅ Multi-tenancy (company-based isolation)
- ✅ Real-time operations
- ✅ Complex reporting
- ✅ Scalability
- ✅ Data integrity
- ✅ Performance optimization

