# 🍽️ Advanced Restaurant POS Backend API - Complete Overview

## 📋 **API Base Information**
- **Base URL**: `http://localhost:5000/api/v1`
- **Documentation**: `http://localhost:5000/api/docs` (Swagger UI)
- **Health Check**: `http://localhost:5000/health`
- **Authentication**: JWT Bearer Token
- **API Versioning**: URI-based (v1)

---

## 🔐 **Authentication Module** (`/auth`)

### **Public Endpoints** (No Authentication Required)
| Method | Endpoint | Purpose | Description |
|--------|----------|---------|-------------|
| `POST` | `/auth/register` | User Registration | Register new user account |
| `POST` | `/auth/login` | Email Login | Login with email and password |
| `POST` | `/auth/login/pin` | PIN Login | Login with PIN (for POS terminals) |
| `POST` | `/auth/find-company` | Find Company | Find company by email |
| `POST` | `/auth/refresh` | Refresh Token | Get new access token using refresh token |
| `GET` | `/auth/verify-email/:token` | Email Verification | Verify email with token |
| `POST` | `/auth/forgot-password` | Password Reset Request | Request password reset email |
| `POST` | `/auth/reset-password` | Password Reset | Reset password with token |

### **Protected Endpoints** (Authentication Required)
| Method | Endpoint | Purpose | Description |
|--------|----------|---------|-------------|
| `POST` | `/auth/logout` | User Logout | Logout and invalidate tokens |
| `POST` | `/auth/change-password` | Change Password | Change password (authenticated) |

---

## 👥 **User Management Module** (`/users`)

### **User Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/users` | List Users | SUPER_ADMIN, OWNER, MANAGER | Get paginated list of users |
| `GET` | `/users/:id` | Get User | SUPER_ADMIN, OWNER, MANAGER | Get user by ID |
| `POST` | `/users` | Create User | SUPER_ADMIN, OWNER, MANAGER | Create new user |
| `PUT` | `/users/:id` | Update User | SUPER_ADMIN, OWNER, MANAGER | Update user information |
| `DELETE` | `/users/:id` | Delete User | SUPER_ADMIN, OWNER | Delete user |
| `PATCH` | `/users/:id/status` | Toggle Status | SUPER_ADMIN, OWNER, MANAGER | Activate/deactivate user |
| `PATCH` | `/users/:id/role` | Change Role | SUPER_ADMIN, OWNER | Change user role |
| `GET` | `/users/profile` | Get Profile | All Roles | Get current user profile |
| `PUT` | `/users/profile` | Update Profile | All Roles | Update current user profile |

---

## 🏢 **Company Management Module** (`/companies`)

### **Company Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/companies` | List Companies | SUPER_ADMIN | Get all companies |
| `GET` | `/companies/:id` | Get Company | SUPER_ADMIN, OWNER, MANAGER | Get company by ID |
| `POST` | `/companies` | Create Company | SUPER_ADMIN | Create new company |
| `PUT` | `/companies/:id` | Update Company | SUPER_ADMIN, OWNER | Update company |
| `DELETE` | `/companies/:id` | Delete Company | SUPER_ADMIN | Delete company |

---

## 🏪 **Branch Management Module** (`/branches`)

### **Branch Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/branches` | List Branches | SUPER_ADMIN, OWNER, MANAGER | Get company branches |
| `GET` | `/branches/:id` | Get Branch | SUPER_ADMIN, OWNER, MANAGER | Get branch by ID |
| `POST` | `/branches` | Create Branch | SUPER_ADMIN, OWNER | Create new branch |
| `PUT` | `/branches/:id` | Update Branch | SUPER_ADMIN, OWNER, MANAGER | Update branch |
| `DELETE` | `/branches/:id` | Delete Branch | SUPER_ADMIN, OWNER | Delete branch |

---

## 🍽️ **Menu Management Module** (`/menu-items` & `/categories`)

### **Menu Items** (`/menu-items`)
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/menu-items` | List Items | All Roles | Get menu items with filters |
| `GET` | `/menu-items/:id` | Get Item | All Roles | Get menu item by ID |
| `POST` | `/menu-items` | Create Item | SUPER_ADMIN, OWNER, MANAGER | Create new menu item |
| `PUT` | `/menu-items/:id` | Update Item | SUPER_ADMIN, OWNER, MANAGER | Update menu item |
| `DELETE` | `/menu-items/:id` | Delete Item | SUPER_ADMIN, OWNER, MANAGER | Delete menu item |
| `PATCH` | `/menu-items/:id/status` | Toggle Status | SUPER_ADMIN, OWNER, MANAGER | Enable/disable item |

### **Categories** (`/categories`)
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/categories` | List Categories | All Roles | Get all categories |
| `GET` | `/categories/:id` | Get Category | All Roles | Get category by ID |
| `POST` | `/categories` | Create Category | SUPER_ADMIN, OWNER, MANAGER | Create new category |
| `PUT` | `/categories/:id` | Update Category | SUPER_ADMIN, OWNER, MANAGER | Update category |
| `DELETE` | `/categories/:id` | Delete Category | SUPER_ADMIN, OWNER, MANAGER | Delete category |

---

## 🛒 **Order Management Module** (`/orders`)

### **Order Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/orders` | List Orders | All Roles | Get orders with filters |
| `GET` | `/orders/:id` | Get Order | All Roles | Get order by ID |
| `POST` | `/orders` | Create Order | All Roles | Create new order |
| `PUT` | `/orders/:id` | Update Order | SUPER_ADMIN, OWNER, MANAGER, WAITER | Update order |
| `DELETE` | `/orders/:id` | Delete Order | SUPER_ADMIN, OWNER, MANAGER | Delete order |
| `PATCH` | `/orders/:id/status` | Update Status | SUPER_ADMIN, OWNER, MANAGER, WAITER, CHEF | Update order status |
| `POST` | `/orders/:id/payment` | Add Payment | SUPER_ADMIN, OWNER, MANAGER, WAITER | Add payment to order |

---

## 🪑 **Table Management Module** (`/tables`)

### **Table Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/tables` | List Tables | All Roles | Get all tables |
| `GET` | `/tables/:id` | Get Table | All Roles | Get table by ID |
| `POST` | `/tables` | Create Table | SUPER_ADMIN, OWNER, MANAGER | Create new table |
| `PUT` | `/tables/:id` | Update Table | SUPER_ADMIN, OWNER, MANAGER | Update table |
| `DELETE` | `/tables/:id` | Delete Table | SUPER_ADMIN, OWNER, MANAGER | Delete table |
| `POST` | `/tables/:id/reserve` | Reserve Table | All Roles | Reserve table |
| `PATCH` | `/tables/:id/status` | Update Status | All Roles | Update table status |

---

## 👨‍🍳 **Kitchen Management Module** (`/kitchen`)

### **Kitchen Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/kitchen/orders` | Kitchen Orders | CHEF, MANAGER | Get orders for kitchen |
| `GET` | `/kitchen/orders/:id` | Get Kitchen Order | CHEF, MANAGER | Get specific kitchen order |
| `PATCH` | `/kitchen/orders/:id/status` | Update Kitchen Status | CHEF, MANAGER | Update kitchen order status |
| `GET` | `/kitchen/queue` | Kitchen Queue | CHEF, MANAGER | Get kitchen queue |
| `PATCH` | `/kitchen/queue/reorder` | Reorder Queue | CHEF, MANAGER | Reorder kitchen queue |

---

## 👥 **Customer Management Module** (`/customers`)

### **Customer Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/customers` | List Customers | All Roles | Get customers with filters |
| `GET` | `/customers/:id` | Get Customer | All Roles | Get customer by ID |
| `POST` | `/customers` | Create Customer | All Roles | Create new customer |
| `PUT` | `/customers/:id` | Update Customer | All Roles | Update customer |
| `DELETE` | `/customers/:id` | Delete Customer | SUPER_ADMIN, OWNER, MANAGER | Delete customer |
| `GET` | `/customers/:id/orders` | Customer Orders | All Roles | Get customer order history |
| `GET` | `/customers/:id/loyalty` | Loyalty Points | All Roles | Get customer loyalty info |

---

## 📊 **Reports & Analytics Module** (`/reports`)

### **Dashboard & Analytics**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/reports/dashboard` | Dashboard Stats | SUPER_ADMIN, OWNER, MANAGER | Get dashboard statistics |
| `GET` | `/reports/dashboard-test` | Dashboard Stats (Test) | Public | Get dashboard stats (no auth) |
| `GET` | `/reports/sales-analytics` | Sales Analytics | SUPER_ADMIN, OWNER, MANAGER | Get sales analytics for charts |
| `GET` | `/reports/sales-analytics-test` | Sales Analytics (Test) | Public | Get sales analytics (no auth) |
| `GET` | `/reports/top-selling-items` | Top Items | SUPER_ADMIN, OWNER, MANAGER | Get top selling items |
| `GET` | `/reports/top-selling-items-test` | Top Items (Test) | Public | Get top selling items (no auth) |
| `GET` | `/reports/revenue-by-category` | Revenue by Category | SUPER_ADMIN, OWNER, MANAGER | Get revenue breakdown by category |
| `GET` | `/reports/revenue-by-category-test` | Revenue by Category (Test) | Public | Get revenue by category (no auth) |
| `GET` | `/reports/low-stock` | Low Stock Items | SUPER_ADMIN, OWNER, MANAGER | Get low stock items |
| `GET` | `/reports/low-stock-test` | Low Stock (Test) | Public | Get low stock items (no auth) |

### **Detailed Reports**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/reports/sales/summary/:branchId` | Sales Summary | SUPER_ADMIN, OWNER, MANAGER | Get sales summary report |
| `GET` | `/reports/sales/revenue/:branchId` | Revenue Breakdown | SUPER_ADMIN, OWNER, MANAGER | Get revenue breakdown |
| `GET` | `/reports/orders/analytics/:branchId` | Orders Analytics | SUPER_ADMIN, OWNER, MANAGER | Get orders analytics |
| `GET` | `/reports/categories/performance/:branchId` | Category Performance | SUPER_ADMIN, OWNER, MANAGER | Get category performance |
| `GET` | `/reports/customers/analytics/:companyId` | Customer Analytics | SUPER_ADMIN, OWNER, MANAGER | Get customer analytics |
| `GET` | `/reports/peak-hours/:branchId` | Peak Hours | SUPER_ADMIN, OWNER, MANAGER | Get peak hours analysis |
| `GET` | `/reports/inventory/:companyId` | Inventory Report | SUPER_ADMIN, OWNER, MANAGER | Get inventory report |
| `GET` | `/reports/comparison/:branchId` | Comparison Report | SUPER_ADMIN, OWNER, MANAGER | Get period comparison |

---

## 💳 **Subscription Management Module** (`/subscriptions`)

### **Subscription Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/subscriptions` | List Subscriptions | SUPER_ADMIN | Get all subscriptions |
| `GET` | `/subscriptions/:id` | Get Subscription | SUPER_ADMIN, OWNER, MANAGER | Get subscription by ID |
| `POST` | `/subscriptions` | Create Subscription | SUPER_ADMIN, OWNER | Create new subscription |
| `PUT` | `/subscriptions/:id` | Update Subscription | SUPER_ADMIN, OWNER | Update subscription |
| `PATCH` | `/subscriptions/:id/upgrade` | Upgrade Subscription | SUPER_ADMIN, OWNER | Upgrade/downgrade plan |
| `PATCH` | `/subscriptions/:id/cancel` | Cancel Subscription | SUPER_ADMIN, OWNER | Cancel subscription |
| `PATCH` | `/subscriptions/:id/reactivate` | Reactivate Subscription | SUPER_ADMIN, OWNER | Reactivate subscription |
| `PATCH` | `/subscriptions/:id/pause` | Pause Subscription | SUPER_ADMIN, OWNER | Pause subscription |
| `PATCH` | `/subscriptions/:id/resume` | Resume Subscription | SUPER_ADMIN, OWNER | Resume subscription |

### **Payment & Billing**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `POST` | `/subscriptions/:id/payment` | Process Payment | SUPER_ADMIN, OWNER | Process subscription payment |
| `GET` | `/subscriptions/company/:companyId/billing-history` | Billing History | SUPER_ADMIN, OWNER, MANAGER | Get billing history |
| `GET` | `/subscriptions/plans/list` | Available Plans | All Roles | Get all subscription plans |
| `GET` | `/subscriptions/:companyId/limits/:limitType` | Check Limits | SUPER_ADMIN, OWNER, MANAGER | Check usage limits |

---

## 🤖 **AI Module** (`/ai`)

### **AI Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `POST` | `/ai/analyze-sales` | Analyze Sales | SUPER_ADMIN, OWNER, MANAGER | Get AI sales analysis |
| `POST` | `/ai/predict-demand` | Predict Demand | SUPER_ADMIN, OWNER, MANAGER | Get demand predictions |
| `POST` | `/ai/optimize-menu` | Optimize Menu | SUPER_ADMIN, OWNER, MANAGER | Get menu optimization suggestions |
| `POST` | `/ai/customer-insights` | Customer Insights | SUPER_ADMIN, OWNER, MANAGER | Get customer behavior insights |
| `POST` | `/ai/inventory-alerts` | Inventory Alerts | SUPER_ADMIN, OWNER, MANAGER | Get AI inventory alerts |
| `POST` | `/ai/recommendations` | Get Recommendations | SUPER_ADMIN, OWNER, MANAGER | Get AI recommendations |

---

## 📦 **Inventory Management Module** (`/ingredients` & `/suppliers`)

### **Ingredients** (`/ingredients`)
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/ingredients` | List Ingredients | All Roles | Get ingredients with filters |
| `GET` | `/ingredients/:id` | Get Ingredient | All Roles | Get ingredient by ID |
| `POST` | `/ingredients` | Create Ingredient | SUPER_ADMIN, OWNER, MANAGER | Create new ingredient |
| `PUT` | `/ingredients/:id` | Update Ingredient | SUPER_ADMIN, OWNER, MANAGER | Update ingredient |
| `DELETE` | `/ingredients/:id` | Delete Ingredient | SUPER_ADMIN, OWNER, MANAGER | Delete ingredient |
| `PATCH` | `/ingredients/:id/stock` | Update Stock | SUPER_ADMIN, OWNER, MANAGER | Update ingredient stock |

### **Suppliers** (`/suppliers`)
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/suppliers` | List Suppliers | All Roles | Get suppliers with filters |
| `GET` | `/suppliers/:id` | Get Supplier | All Roles | Get supplier by ID |
| `POST` | `/suppliers` | Create Supplier | SUPER_ADMIN, OWNER, MANAGER | Create new supplier |
| `PUT` | `/suppliers/:id` | Update Supplier | SUPER_ADMIN, OWNER, MANAGER | Update supplier |
| `DELETE` | `/suppliers/:id` | Delete Supplier | SUPER_ADMIN, OWNER, MANAGER | Delete supplier |

---

## 💰 **Expense Management Module** (`/expenses`)

### **Expense Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/expenses` | List Expenses | All Roles | Get expenses with filters |
| `GET` | `/expenses/:id` | Get Expense | All Roles | Get expense by ID |
| `POST` | `/expenses` | Create Expense | All Roles | Create new expense |
| `PUT` | `/expenses/:id` | Update Expense | SUPER_ADMIN, OWNER, MANAGER | Update expense |
| `DELETE` | `/expenses/:id` | Delete Expense | SUPER_ADMIN, OWNER, MANAGER | Delete expense |
| `GET` | `/expenses/categories` | Expense Categories | All Roles | Get expense categories |
| `GET` | `/expenses/summary` | Expense Summary | SUPER_ADMIN, OWNER, MANAGER | Get expense summary |

---

## ⏰ **Work Period Management Module** (`/work-periods`)

### **Work Period Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/work-periods` | List Work Periods | All Roles | Get work periods with filters |
| `GET` | `/work-periods/:id` | Get Work Period | All Roles | Get work period by ID |
| `POST` | `/work-periods` | Create Work Period | SUPER_ADMIN, OWNER, MANAGER | Create new work period |
| `PUT` | `/work-periods/:id` | Update Work Period | SUPER_ADMIN, OWNER, MANAGER | Update work period |
| `DELETE` | `/work-periods/:id` | Delete Work Period | SUPER_ADMIN, OWNER, MANAGER | Delete work period |
| `PATCH` | `/work-periods/:id/end` | End Work Period | All Roles | End current work period |

---

## 🔧 **Backup Management Module** (`/backups`)

### **Backup Operations**
| Method | Endpoint | Purpose | Roles | Description |
|--------|----------|---------|-------|-------------|
| `GET` | `/backups` | List Backups | SUPER_ADMIN, OWNER | Get all backups |
| `POST` | `/backups` | Create Backup | SUPER_ADMIN, OWNER | Create new backup |
| `GET` | `/backups/:id` | Get Backup | SUPER_ADMIN, OWNER | Get backup by ID |
| `POST` | `/backups/:id/restore` | Restore Backup | SUPER_ADMIN, OWNER | Restore from backup |
| `DELETE` | `/backups/:id` | Delete Backup | SUPER_ADMIN, OWNER | Delete backup |

---

## 🎯 **Key Features Implemented**

### ✅ **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (RBAC)
- PIN-based login for POS terminals
- Password reset functionality
- Email verification

### ✅ **Core POS Features**
- Order management with real-time status updates
- Table management and reservations
- Kitchen display system
- Menu management with categories
- Customer management with loyalty points

### ✅ **Inventory Management**
- Ingredient tracking
- Supplier management
- Low stock alerts
- Stock level monitoring

### ✅ **Reporting & Analytics**
- Dashboard with key metrics
- Sales analytics and trends
- Customer analytics
- Inventory reports
- Peak hours analysis
- AI-powered insights

### ✅ **Subscription Management**
- Multiple subscription plans
- Payment processing
- Usage limits and monitoring
- Billing history

### ✅ **AI Integration**
- Sales analysis
- Demand prediction
- Menu optimization
- Customer insights
- Inventory alerts

---

## 🚀 **Getting Started**

1. **Start the Backend Server**:
   ```bash
   npm run dev
   ```

2. **Access API Documentation**:
   - Swagger UI: `http://localhost:5000/api/docs`
   - Health Check: `http://localhost:5000/health`

3. **Test Endpoints**:
   - Use the test endpoints (with `-test` suffix) for development
   - All test endpoints don't require authentication

---

## 📝 **Notes**

- All endpoints return JSON responses
- Pagination is supported for list endpoints
- Filtering and sorting are available on most endpoints
- Error responses follow a consistent format
- All timestamps are in ISO format
- The API supports CORS for frontend integration
