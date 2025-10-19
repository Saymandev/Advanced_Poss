# 🌐 API Documentation

REST API endpoints for the Restaurant POS System.

**Base URL:** `http://localhost:5000/api/v1`

**Authentication:** Bearer Token (JWT)

---

## 📍 Authentication Endpoints

### Register Company (Multi-step)
```http
POST /auth/register/company
Content-Type: application/json

{
  "companyName": "Delicious Bites Inc.",
  "legalName": "Delicious Bites Corporation",
  "email": "owner@deliciousbites.com",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zipCode": "10001"
  }
}

Response: 201 Created
{
  "success": true,
  "data": {
    "companyId": "6789...",
    "tempToken": "temp_xyz..."
  },
  "message": "Company registered. Proceed to branch setup."
}
```

### Register Branch
```http
POST /auth/register/branch
Authorization: Bearer {tempToken}

{
  "companyId": "6789...",
  "branchName": "Downtown Branch",
  "phone": "+1234567891",
  "address": {
    "street": "456 Park Ave",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zipCode": "10002"
  },
  "totalTables": 20,
  "totalSeats": 80
}

Response: 201 Created
{
  "success": true,
  "data": {
    "branchId": "6789...",
    "tempToken": "temp_abc..."
  }
}
```

### Register Owner
```http
POST /auth/register/owner
Authorization: Bearer {tempToken}

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@deliciousbites.com",
  "password": "SecurePass123!",
  "pin": "123456",
  "phone": "+1234567892"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "john@deliciousbites.com",
      "role": "owner"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

### Login (Email + Password)
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@deliciousbites.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "john@deliciousbites.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "owner",
      "companyId": "comp123",
      "branchId": "branch123"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

### Login (PIN)
```http
POST /auth/login/pin
Content-Type: application/json

{
  "pin": "123456",
  "branchId": "branch123"
}

Response: 200 OK
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response: 200 OK
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@deliciousbites.com"
}

Response: 200 OK
{
  "success": true,
  "message": "Password reset link sent to email"
}
```

### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_xyz",
  "newPassword": "NewSecurePass123!"
}

Response: 200 OK
```

### Verify Email
```http
GET /auth/verify-email/:token

Response: 200 OK
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

## 📍 User Management

### Get Current User
```http
GET /users/me
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "user123",
    "email": "john@deliciousbites.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "owner",
    "permissions": ["all"]
  }
}
```

### Update Profile
```http
PATCH /users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "John",
  "phone": "+1234567890",
  "avatar": "https://cloudinary.com/..."
}

Response: 200 OK
```

### Get All Users (Admin/Owner)
```http
GET /users?role=waiter&branchId=branch123
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "user456",
      "firstName": "Jane",
      "role": "waiter",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

### Create User (Admin/Owner)
```http
POST /users
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "waiter1@example.com",
  "password": "SecurePass123!",
  "pin": "456789",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "waiter",
  "branchId": "branch123",
  "salary": 3000,
  "shift": "morning"
}

Response: 201 Created
```

### Update User
```http
PATCH /users/:userId
Authorization: Bearer {token}

Response: 200 OK
```

### Deactivate User
```http
DELETE /users/:userId
Authorization: Bearer {token}

Response: 200 OK
```

---

## 📍 Menu Management

### Get Categories
```http
GET /categories?branchId=branch123
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "cat123",
      "name": "Main Courses",
      "type": "food",
      "itemCount": 15
    }
  ]
}
```

### Create Category
```http
POST /categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Desserts",
  "description": "Sweet treats",
  "type": "dessert",
  "image": "https://cloudinary.com/...",
  "color": "#FF6B6B"
}

Response: 201 Created
```

### Get Menu Items
```http
GET /menu-items?categoryId=cat123&isAvailable=true
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "item123",
      "name": "Grilled Salmon",
      "description": "Fresh Atlantic salmon",
      "price": 25.99,
      "category": "Main Courses",
      "images": ["url1", "url2"],
      "isAvailable": true,
      "preparationTime": 20,
      "tags": ["popular", "healthy"]
    }
  ]
}
```

### Create Menu Item
```http
POST /menu-items
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Grilled Salmon",
  "description": "Fresh Atlantic salmon grilled to perfection",
  "categoryId": "cat123",
  "price": 25.99,
  "cost": 12.00,
  "images": ["url1", "url2"],
  "variants": [
    {
      "name": "Size",
      "options": [
        { "name": "Regular", "priceModifier": 0 },
        { "name": "Large", "priceModifier": 5.00 }
      ]
    }
  ],
  "addons": [
    { "name": "Extra Sauce", "price": 2.00 }
  ],
  "preparationTime": 20,
  "tags": ["popular", "healthy"],
  "trackInventory": true,
  "ingredients": [
    {
      "ingredientId": "ing123",
      "quantity": 0.25,
      "unit": "kg"
    }
  ]
}

Response: 201 Created
```

### Update Menu Item
```http
PATCH /menu-items/:itemId
Authorization: Bearer {token}

Response: 200 OK
```

### Toggle Availability
```http
PATCH /menu-items/:itemId/availability
Authorization: Bearer {token}
Content-Type: application/json

{
  "isAvailable": false
}

Response: 200 OK
```

### Delete Menu Item
```http
DELETE /menu-items/:itemId
Authorization: Bearer {token}

Response: 200 OK
```

---

## 📍 Order Management (POS)

### Get Orders
```http
GET /orders?branchId=branch123&status=pending&date=2024-01-15
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "order123",
      "orderNumber": "ORD-2024-001",
      "orderType": "dine_in",
      "table": "Table 5",
      "items": [...],
      "subtotal": 45.50,
      "total": 50.00,
      "status": "pending",
      "paymentStatus": "pending",
      "createdAt": "2024-01-15T12:30:00Z"
    }
  ]
}
```

### Create Order
```http
POST /orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderType": "dine_in",
  "branchId": "branch123",
  "tableId": "table123",
  "customerId": "cust123",
  "items": [
    {
      "menuItemId": "item123",
      "name": "Grilled Salmon",
      "quantity": 2,
      "price": 25.99,
      "variant": {
        "name": "Size",
        "option": "Large",
        "priceModifier": 5.00
      },
      "addons": [
        { "name": "Extra Sauce", "price": 2.00 }
      ],
      "specialInstructions": "No onions",
      "subtotal": 65.98
    }
  ],
  "subtotal": 65.98,
  "taxRate": 10,
  "taxAmount": 6.60,
  "discountType": "percentage",
  "discountValue": 10,
  "discountAmount": 6.60,
  "tipAmount": 5.00,
  "total": 70.98,
  "notes": "Customer allergic to nuts"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "orderId": "order123",
    "orderNumber": "ORD-2024-001",
    "total": 70.98,
    "estimatedTime": 25
  }
}
```

### Update Order Status
```http
PATCH /orders/:orderId/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "preparing"
}

Response: 200 OK
```

### Process Payment
```http
POST /orders/:orderId/payment
Authorization: Bearer {token}
Content-Type: application/json

{
  "paymentMethod": "card",
  "amount": 70.98,
  "transactionId": "txn_xyz123"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "orderId": "order123",
    "paymentStatus": "paid",
    "receiptUrl": "https://..."
  }
}
```

### Split Bill
```http
POST /orders/:orderId/split
Authorization: Bearer {token}
Content-Type: application/json

{
  "splits": [
    {
      "amount": 35.49,
      "paymentMethod": "cash",
      "paidBy": "Person 1"
    },
    {
      "amount": 35.49,
      "paymentMethod": "card",
      "paidBy": "Person 2"
    }
  ]
}

Response: 200 OK
```

### Cancel Order
```http
POST /orders/:orderId/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Customer changed mind"
}

Response: 200 OK
```

### Get Order Receipt
```http
GET /orders/:orderId/receipt
Authorization: Bearer {token}

Response: 200 OK (PDF file)
```

---

## 📍 Table Management

### Get Tables
```http
GET /tables?branchId=branch123&status=available
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "table123",
      "tableNumber": "T-05",
      "capacity": 4,
      "status": "available",
      "location": "Indoor",
      "qrCode": "https://..."
    }
  ]
}
```

### Update Table Status
```http
PATCH /tables/:tableId/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "occupied",
  "orderId": "order123"
}

Response: 200 OK
```

### Reserve Table
```http
POST /tables/:tableId/reserve
Authorization: Bearer {token}
Content-Type: application/json

{
  "reservedFor": "2024-01-15T19:00:00Z",
  "reservedBy": {
    "name": "John Doe",
    "phone": "+1234567890",
    "partySize": 4
  }
}

Response: 200 OK
```

---

## 📍 Kitchen Display

### Get Kitchen Orders
```http
GET /kitchen/orders?branchId=branch123&status=pending
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "orderId": "order123",
      "orderNumber": "ORD-2024-001",
      "orderType": "dine_in",
      "table": "T-05",
      "items": [
        {
          "id": "item1",
          "name": "Grilled Salmon",
          "quantity": 2,
          "status": "pending",
          "specialInstructions": "No onions",
          "preparationTime": 20
        }
      ],
      "priority": "normal",
      "createdAt": "2024-01-15T12:30:00Z",
      "waitTime": 5
    }
  ]
}
```

### Update Item Status
```http
PATCH /kitchen/orders/:orderId/items/:itemId
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "preparing"
}

Response: 200 OK
```

### Mark Order Ready
```http
POST /kitchen/orders/:orderId/ready
Authorization: Bearer {token}

Response: 200 OK
```

---

## 📍 Inventory Management

### Get Ingredients
```http
GET /inventory/ingredients?branchId=branch123&lowStock=true
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "ing123",
      "name": "Salmon Fillet",
      "sku": "SKU-001",
      "currentStock": 5,
      "minimumStock": 10,
      "unit": "kg",
      "costPerUnit": 15.00,
      "isLowStock": true
    }
  ]
}
```

### Add Stock
```http
POST /inventory/ingredients/:ingredientId/stock
Authorization: Bearer {token}
Content-Type: application/json

{
  "quantity": 20,
  "costPerUnit": 15.00,
  "supplierId": "sup123",
  "batchNumber": "BATCH-2024-001",
  "expiryDate": "2024-12-31"
}

Response: 200 OK
```

### Get Suppliers
```http
GET /inventory/suppliers
Authorization: Bearer {token}

Response: 200 OK
```

### Create Purchase Order
```http
POST /inventory/purchase-orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "supplierId": "sup123",
  "branchId": "branch123",
  "items": [
    {
      "ingredientId": "ing123",
      "quantity": 50,
      "unit": "kg",
      "unitPrice": 15.00
    }
  ],
  "expectedDeliveryDate": "2024-01-20",
  "notes": "Urgent order"
}

Response: 201 Created
```

---

## 📍 Customer Management (CRM)

### Get Customers
```http
GET /customers?search=john&loyaltyTier=gold
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "cust123",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "email": "john@example.com",
      "loyaltyPoints": 1250,
      "loyaltyTier": "gold",
      "totalOrders": 45,
      "totalSpent": 2500.00,
      "lastOrderDate": "2024-01-10T15:30:00Z"
    }
  ]
}
```

### Create Customer
```http
POST /customers
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "addresses": [
    {
      "label": "Home",
      "street": "123 Main St",
      "city": "New York",
      "zipCode": "10001",
      "isDefault": true
    }
  ]
}

Response: 201 Created
```

### Update Loyalty Points
```http
POST /customers/:customerId/loyalty
Authorization: Bearer {token}
Content-Type: application/json

{
  "points": 50,
  "type": "earn",
  "orderId": "order123"
}

Response: 200 OK
```

### Create Campaign
```http
POST /crm/campaigns
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Weekend Special Promo",
  "type": "email",
  "targetAudience": {
    "segmentType": "tier",
    "tiers": ["gold", "platinum"]
  },
  "subject": "Exclusive Weekend Offer!",
  "message": "Get 20% off on all orders this weekend!",
  "scheduledFor": "2024-01-20T09:00:00Z"
}

Response: 201 Created
```

---

## 📍 Staff Management

### Get Attendance
```http
GET /staff/attendance?userId=user123&month=1&year=2024
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "checkIn": "09:00:00",
      "checkOut": "17:00:00",
      "hoursWorked": 8,
      "status": "present"
    }
  ],
  "summary": {
    "totalPresent": 22,
    "totalAbsent": 2,
    "totalLeaves": 1,
    "totalHours": 176
  }
}
```

### Check In/Out
```http
POST /staff/attendance/check-in
Authorization: Bearer {token}
Content-Type: application/json

{
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  }
}

Response: 200 OK
```

### Apply Leave
```http
POST /staff/leaves
Authorization: Bearer {token}
Content-Type: application/json

{
  "leaveType": "sick",
  "startDate": "2024-01-20",
  "endDate": "2024-01-21",
  "reason": "Medical checkup"
}

Response: 201 Created
```

### Approve/Reject Leave
```http
PATCH /staff/leaves/:leaveId
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "approved"
}

Response: 200 OK
```

---

## 📍 Accounting & Reports

### Get Dashboard Stats
```http
GET /reports/dashboard?branchId=branch123&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "totalRevenue": 45000.00,
    "totalOrders": 1250,
    "averageOrderValue": 36.00,
    "topSellingItems": [...],
    "revenueByDay": [...],
    "ordersByType": {
      "dine_in": 750,
      "takeaway": 300,
      "delivery": 200
    }
  }
}
```

### Get Sales Report
```http
GET /reports/sales?startDate=2024-01-01&endDate=2024-01-31&groupBy=day
Authorization: Bearer {token}

Response: 200 OK
```

### Get Profit/Loss Report
```http
GET /reports/profit-loss?month=1&year=2024
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "totalRevenue": 45000.00,
    "totalExpenses": 25000.00,
    "grossProfit": 20000.00,
    "netProfit": 18000.00,
    "profitMargin": 40.00,
    "expenses": {
      "purchases": 15000.00,
      "salaries": 8000.00,
      "rent": 2000.00
    }
  }
}
```

### Export Report
```http
POST /reports/export
Authorization: Bearer {token}
Content-Type: application/json

{
  "reportType": "sales",
  "format": "pdf",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "filters": {
    "branchId": "branch123"
  }
}

Response: 200 OK
{
  "success": true,
  "data": {
    "downloadUrl": "https://..."
  }
}
```

---

## 📍 Subscription & Billing

### Get Subscription Plans
```http
GET /subscriptions/plans

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "plan_basic",
      "name": "Basic",
      "price": 49.99,
      "billingCycle": "monthly",
      "features": {
        "maxBranches": 1,
        "maxUsers": 10,
        "aiInsights": false
      }
    }
  ]
}
```

### Subscribe
```http
POST /subscriptions/subscribe
Authorization: Bearer {token}
Content-Type: application/json

{
  "planId": "plan_premium",
  "billingCycle": "yearly",
  "paymentMethodId": "pm_card_xyz"
}

Response: 201 Created
```

### Get Invoices
```http
GET /subscriptions/invoices
Authorization: Bearer {token}

Response: 200 OK
```

---

## 📍 AI Insights

### Get Predictions
```http
GET /ai/predictions?type=sales&period=next_week
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "predictedSales": 52000.00,
    "confidence": 85,
    "topItems": [...]
  }
}
```

### Get Recommendations
```http
GET /ai/recommendations?branchId=branch123
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "inventory": [
      "Consider ordering more Salmon - low stock predicted"
    ],
    "menu": [
      "Pasta dishes performing 30% below average - consider promotions"
    ],
    "staffing": [
      "Peak hours detected: 6-8 PM - recommend 2 more waiters"
    ]
  }
}
```

---

## 📍 WebSocket Events

Connect to: `ws://localhost:5000`

### Client → Server Events
```javascript
// Join branch room
socket.emit('join:branch', { branchId: 'branch123' });

// Join kitchen
socket.emit('join:kitchen', { branchId: 'branch123' });

// Update order status
socket.emit('order:update', { orderId: 'order123', status: 'preparing' });
```

### Server → Client Events
```javascript
// New order notification
socket.on('order:new', (data) => {
  console.log('New order:', data);
});

// Order status updated
socket.on('order:updated', (data) => {
  console.log('Order updated:', data);
});

// Table status changed
socket.on('table:updated', (data) => {
  console.log('Table status:', data);
});

// Low stock alert
socket.on('inventory:low-stock', (data) => {
  console.log('Low stock alert:', data);
});
```

---

## 🔐 Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_SERVER_ERROR` (500)

---

## 📊 Rate Limiting

- **Anonymous:** 20 requests/minute
- **Authenticated:** 100 requests/minute
- **Premium:** 500 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## 🔄 Pagination

All list endpoints support pagination:

Query parameters:
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `sortBy` (field name)
- `sortOrder` (asc/desc)

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

