# Code Index — Raha POS Solutions (Advanced Restaurant POS)

> Auto-generated codebase index for the Advanced Restaurant POS & Management System.
> Last updated: 2026-05-19

---

## 1. Project Overview

| Attribute | Value |
|---|---|
| **Project Name** | Raha POS Solutions (Advanced Restaurant POS) |
| **Type** | Multi-tenant restaurant POS & management system |
| **Backend** | NestJS 10 + TypeScript 5 + MongoDB (Mongoose) + Redis (Bull) |
| **Frontend** | Next.js 14 (App Router) + TypeScript + Redux Toolkit + Tailwind CSS |
| **Auth** | JWT (httpOnly cookies) + Passport (local/JWT) + 2FA (TOTP) |
| **Payments** | Stripe (subscriptions + POS payments) |
| **Deployment** | Docker Compose (dev) / Coolify (prod) / Vercel (frontend) |

**Key Metrics:**
- **47** backend feature modules
- **56** dashboard page routes
- **44** frontend API endpoint files
- **26** reusable UI components
- **52** RTK Query cache tag types
- **8** guard types + **7** decorators + **4** middleware + **3** interceptors

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | NestJS 10 (`@nestjs/core`) |
| **Backend Language** | TypeScript 5 |
| **Database** | MongoDB via Mongoose 8 |
| **Cache** | Redis via `cache-manager-redis-store` |
| **Queue** | Bull (Redis-backed) |
| **Auth** | JWT (access + refresh httpOnly cookies), Passport, Speakeasy (2FA) |
| **API Docs** | Swagger (`@nestjs/swagger`) at `/api/docs` |
| **Payments** | Stripe (`stripe`) |
| **Email** | Nodemailer |
| **SMS** | Twilio (`twilio`) |
| **AI** | OpenAI API + DeepSeek API |
| **PDF** | PDFKit + Puppeteer |
| **File Upload** | Multer + Cloudinary |
| **Real-time** | Socket.IO (`@nestjs/websockets`) |
| **Scheduling** | `@nestjs/schedule` (cron jobs) |
| **Logging** | Winston + `winston-daily-rotate-file` |
| **Security** | Helmet, express-rate-limit, compression, cookie-parser |
| **Frontend Framework** | Next.js 14 (App Router) |
| **Frontend Language** | TypeScript 5 |
| **State Management** | Redux Toolkit + RTK Query |
| **Styling** | Tailwind CSS 3 |
| **Icons** | Heroicons (`@heroicons/react`) |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod |
| **Notifications** | react-hot-toast |
| **QR Codes** | qrcode.react |
| **PWA** | `@ducanh2912/next-pwa` |
| **Theming** | next-themes |
| **Offline** | IndexedDB (`idb`) |
| **Encryption** | crypto-js (AES) |

---

## 3. Directory Structure

```
Advanced_Poss/
├── README.md
├── package.json                     # Root workspace scripts
├── docker-compose.yml               # Dev: MongoDB, Redis, Backend, Nginx
├── coolify-docker-compose.yml       # Prod: Backend + Frontend (Coolify)
├── .prettierrc
├── .gitignore
├── start-dev.bat                    # Windows quick-start script
│
├── backend/                         # ── NestJS Backend ──
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── Dockerfile
│   ├── .env
│   └── src/
│       ├── main.ts                  # 🔑 Entry: bootstrap() — configures app, swagger, health
│       ├── app.module.ts            # 🔑 Root module: imports all 47 modules + infra
│       ├── app.controller.ts
│       ├── app.service.ts
│       ├── config/
│       │   └── configuration.ts     # Centralized config (DB, Redis, JWT, Stripe, OpenAI, etc.)
│       ├── common/                  # Shared infrastructure
│       │   ├── constants/           # Feature flag constants
│       │   ├── decorators/          # 7 decorators (see §4.1)
│       │   ├── dto/                 # Shared DTOs
│       │   ├── enums/               # 3 enums (see §4.2)
│       │   ├── filters/             # HttpExceptionFilter
│       │   ├── guards/              # 8 guards (see §4.3)
│       │   ├── interceptors/        # 3 interceptors (see §4.4)
│       │   ├── logger/              # Winston logger
│       │   ├── middleware/          # 4 middleware (see §4.5)
│       │   ├── services/            # 5 external services (see §4.6)
│       │   └── utils/               # Utility helpers
│       ├── modules/                 # 47 feature modules (see §5)
│       └── scripts/                 # CLI seed scripts
│
├── frontend/                        # ── Next.js Frontend ──
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── Dockerfile
│   ├── .env.local
│   ├── public/                      # Static assets
│   └── src/
│       ├── app/                     # App Router pages (see §6)
│       ├── components/              # React components (see §7)
│       ├── contexts/                # CurrencyContext
│       ├── hooks/                   # 4 custom hooks (see §8)
│       └── lib/                     # State, API, utilities (see §9)
│
└── docs/                            # 24 documentation files (see §11)
```

---

## 4. Backend — Common Infrastructure

### 4.1 Decorators (`backend/src/common/decorators/`)

| File | Decorator | Purpose |
|---|---|---|
| `public.decorator.ts` | `@Public()` | Marks route as public (skips JWT guard) |
| `roles.decorator.ts` | `@Roles(...roles)` | Restricts access by user role |
| `requires-feature.decorator.ts` | `@RequiresFeature(featureId)` | Gates endpoint behind a subscription feature |
| `requires-role-feature.decorator.ts` | `@RequiresRoleFeature(featureId)` | Role + feature combined gate |
| `requires-limit.decorator.ts` | `@RequiresLimit(limitKey)` | Checks against subscription usage limits |
| `current-user.decorator.ts` | `@CurrentUser()` | Extracts current user from request |
| `throttle.decorator.ts` | `@Throttle(limit, ttl)` | Per-route rate limiting |

### 4.2 Enums (`backend/src/common/enums/`)

| File | Enum |
|---|---|
| `user-role.enum.ts` | `UserRole` — owner, manager, chef, waiter, cashier, customer, super_admin |
| `order-status.enum.ts` | `OrderStatus` — pending, confirmed, preparing, ready, served, cancelled, paid |
| `purchase-order-status.enum.ts` | `PurchaseOrderStatus` — draft, ordered, received, cancelled |

### 4.3 Guards (`backend/src/common/guards/`)

| File | Guard | Purpose |
|---|---|---|
| `jwt-auth.guard.ts` | `JwtAuthGuard` | Validates JWT tokens (set globally, use `@Public()` to skip) |
| `roles.guard.ts` | `RolesGuard` | Enforces `@Roles()` decorator |
| `permissions.guard.ts` | `PermissionsGuard` | Fine-grained permission checks |
| `role-feature.guard.ts` | `RoleFeatureGuard` | Checks role-specific feature access |
| `subscription-feature.guard.ts` | `SubscriptionFeatureGuard` | Enforces `@RequiresFeature()` |
| `subscription-limit.guard.ts` | `SubscriptionLimitGuard` | Enforces `@RequiresLimit()` |
| `throttle.guard.ts` | `ThrottleGuard` | Per-route rate limiting |
| `work-period-check.guard.ts` | `WorkPeriodCheckGuard` | Ensures work period is open for POS operations |

### 4.4 Interceptors (`backend/src/common/interceptors/`)

| File | Interceptor | Purpose |
|---|---|---|
| `encryption.interceptor.ts` | `EncryptionInterceptor` | AES-encrypts API responses (decrypted client-side in apiSlice) |
| `transform.interceptor.ts` | `TransformInterceptor` | Wraps responses in `{ success, data, message }` envelope |
| `logging.interceptor.ts` | `LoggingInterceptor` | Logs request method, URL, duration |

### 4.5 Middleware (`backend/src/common/middleware/`)

| File | Middleware | Purpose |
|---|---|---|
| `maintenance.middleware.ts` | `MaintenanceMiddleware` | Blocks requests when system is in maintenance mode |
| `subscription-lock.middleware.ts` | `SubscriptionLockMiddleware` | Locks all routes if company subscription is expired |
| `request-logger.middleware.ts` | `RequestLoggerMiddleware` | Logs incoming requests |
| `security.middleware.ts` | `SecurityMiddleware` | Security headers and protections |

### 4.6 Services (`backend/src/common/services/`)

| File | Service | Purpose |
|---|---|---|
| `cloudinary.service.ts` | `CloudinaryService` | Image upload, deletion, transformation via Cloudinary |
| `deepseek.service.ts` | `DeepSeekService` | AI chat completions via DeepSeek API |
| `email.service.ts` | `EmailService` | Email sending via Nodemailer (Gmail SMTP or custom) |
| `openai.service.ts` | `OpenAIService` | AI chat completions via OpenAI API |
| `sms.service.ts` | `SMSService` | SMS sending via Twilio |

---

## 5. Backend — Feature Modules (47 total)

Each module follows the NestJS pattern: `module.ts` → `controller.ts` → `service.ts` + `schemas/` + `dto/`

| # | Module | Path | Key Responsibilities |
|---|---|---|---|
| 1 | **auth** | `modules/auth/` | Login (email/PIN/super-admin), register, JWT refresh, 2FA (TOTP), email verify, password reset |
| 2 | **users** | `modules/users/` | User CRUD, profile management, role assignment |
| 3 | **companies** | `modules/companies/` | Multi-tenant company CRUD, slug management, trial activation |
| 4 | **company** | `modules/company/` | Company-specific operations (logo, branding, info) |
| 5 | **branches** | `modules/branches/` | Multi-branch management under a company |
| 6 | **menu-items** | `modules/menu-items/` | Menu item CRUD with variants, modifiers, pricing, images |
| 7 | **categories** | `modules/categories/` | Menu category CRUD |
| 8 | **tables** | `modules/tables/` | Table management, QR code linking, status tracking |
| 9 | **rooms** | `modules/rooms/` | Hotel room management, pricing, availability |
| 10 | **bookings** | `modules/bookings/` | Table & room reservation/booking system |
| 11 | **orders** | `modules/orders/` | Order lifecycle, status management, search/filter |
| 12 | **pos** | `modules/pos/` | POS operations: cart, checkout, payments, receipt printing, waiter management |
| 13 | **payments** | `modules/payments/` | Payment processing, transaction records |
| 14 | **kitchen** | `modules/kitchen/` | Kitchen Display System (KDS) — order status workflow |
| 15 | **customers** | `modules/customers/` | CRM: customer profiles, loyalty points, 4-tier loyalty (Bronze→Platinum) |
| 16 | **ingredients** | `modules/ingredients/` | Ingredient/inventory tracking, stock levels, expiry |
| 17 | **suppliers** | `modules/suppliers/` | Supplier management |
| 18 | **purchase-orders** | `modules/purchase-orders/` | Purchase order workflow (draft→ordered→received) |
| 19 | **expenses** | `modules/expenses/` | Expense tracking and reporting |
| 20 | **incomes** | `modules/incomes/` | Income tracking |
| 21 | **transactions** | `modules/transactions/` | Financial transaction ledger |
| 22 | **attendance** | `modules/attendance/` | Staff clock-in/out, attendance reports |
| 23 | **schedule** | `modules/schedule/` | Staff shift scheduling |
| 24 | **work-periods** | `modules/work-periods/` | Open/close period tracking for daily accounting |
| 25 | **subscriptions** | `modules/subscriptions/` | Subscription plan management, Stripe integration, webhooks |
| 26 | **subscription-plans** | `modules/subscriptions/` | Subscription plan definitions (Basic/Premium) |
| 27 | **subscription-payments** | `modules/subscription-payments/` | Payment method management for subscriptions |
| 28 | **reports** | `modules/reports/` | Sales reports, revenue analysis, top items, peak hours |
| 29 | **marketing** | `modules/marketing/` | SMS/email marketing campaigns |
| 30 | **ai** | `modules/ai/` | AI-powered insights (OpenAI + DeepSeek) |
| 31 | **reviews** | `modules/reviews/` | Customer review management |
| 32 | **qr-codes** | `modules/qr-codes/` | QR code generation for menus and tables |
| 33 | **digital-receipts** | `modules/digital-receipts/` | Digital receipt generation (PDF) |
| 34 | **delivery-zones** | `modules/delivery-zones/` | Delivery zone configuration |
| 35 | **payment-methods** | `modules/payment-methods/` | POS payment method configuration |
| 36 | **gallery** | `modules/gallery/` | Image/media gallery management |
| 37 | **cms** | `modules/cms/` | Content management: pages, blogs, landing sections, testimonials |
| 38 | **settings** | `modules/settings/` | System & company settings |
| 39 | **role-permissions** | `modules/role-permissions/` | Fine-grained role/feature permission mapping |
| 40 | **notifications** | `modules/notifications/` | Push/email notification dispatch |
| 41 | **super-admin-notifications** | `modules/super-admin-notifications/` | Notifications for super admin panel |
| 42 | **wastage** | `modules/wastage/` | Wastage/food waste tracking |
| 43 | **backups** | `modules/backups/` | Database backup management |
| 44 | **contact-forms** | `modules/contact-forms/` | Contact form submissions |
| 45 | **login-activity** | `modules/login-activity/` | Login activity logging and audit |
| 46 | **system-feedback** | `modules/system-feedback/` | User feedback collection |
| 47 | **public** | `modules/public/` | Public-facing API endpoints (company info, menus, etc.) |

### 5.1 Backend — WebSocket Module

| File | Purpose |
|---|---|
| `modules/websockets/websocket.gateway.ts` | Socket.IO gateway for real-time: order updates, kitchen notifications |

---

## 6. Frontend — App Router Pages

### 6.1 Public Pages (`src/app/`)

| Route | Page | Description |
|---|---|---|
| `/` | `page.tsx` | Marketing landing page (hero, features, pricing, testimonials) |
| `/about` | `about/page.tsx` | About page |
| `/contact` | `contact/page.tsx` | Contact page |
| `/blog` | `blog/page.tsx` | Blog listing |
| `/careers` | `careers/page.tsx` | Careers page |
| `/eula` | `eula/page.tsx` | End-User License Agreement |
| `/privacy` | `privacy/page.tsx` | Privacy policy |
| `/refund` | `refund/page.tsx` | Refund policy |
| `/security` | `security/page.tsx` | Security information |
| `/terms` | `terms/page.tsx` | Terms & conditions |
| `/help-center` | `help-center/page.tsx` | Help center |
| `/display` | `display/page.tsx` | Customer-facing display view |

### 6.2 Auth Pages (`src/app/auth/`)

| Route | Page | Description |
|---|---|---|
| `/auth/login` | `auth/login/page.tsx` | Multi-step login: 1) Find company 2) Select branch/role 3) Enter PIN |
| `/auth/pin-login` | `auth/pin-login/page.tsx` | Direct PIN login |
| `/auth/register` | `auth/register/page.tsx` | Company registration |
| `/auth/super-admin` | `auth/super-admin/page.tsx` | Super admin login |
| `/auth/verify-email` | `auth/verify-email/page.tsx` | Email verification |

### 6.3 Company Public Pages (`src/app/[companySlug]/`)

| Route | Description |
|---|---|
| `/[companySlug]` | Company landing page |
| `/[companySlug]/about` | Company about page |
| `/[companySlug]/contact` | Company contact page |
| `/[companySlug]/gallery` | Company gallery |
| `/[companySlug]/[branchSlug]` | Branch landing |
| `/[companySlug]/[branchSlug]/shop` | Online ordering menu |
| `/[companySlug]/[branchSlug]/cart` | Shopping cart |
| `/[companySlug]/[branchSlug]/checkout` | Checkout |
| `/[companySlug]/[branchSlug]/order-confirmation` | Order confirmation |
| `/[companySlug]/[branchSlug]/booking` | Table/room booking |
| `/[companySlug]/[branchSlug]/track` | Order tracking |
| `/[companySlug]/[branchSlug]/rooms` | Room listing |
| `/[companySlug]/[branchSlug]/book` | Room booking |

### 6.4 Dashboard Pages (`src/app/dashboard/`) — 56 routes

| Route | Page | Category |
|---|---|---|
| `/dashboard` | `page.tsx` | Dashboard overview with real-time metrics |
| `/dashboard/pos` | `pos/` | POS Terminal |
| `/dashboard/pos-settings` | `pos-settings/` | POS Settings |
| `/dashboard/printer-management` | `printer-management/` | Printer Management |
| `/dashboard/kitchen` | `kitchen/` | Kitchen Display System (KDS) |
| `/dashboard/orders` | `orders/` | Order Management |
| `/dashboard/order-history` | `order-history/` | Order History |
| `/dashboard/deliveries` | `deliveries/` | Delivery Management |
| `/dashboard/menu-items` | `menu-items/` | Menu Items |
| `/dashboard/menu` | `menu/` | Menu Management |
| `/dashboard/categories` | `categories/` | Categories |
| `/dashboard/tables` | `tables/` | Table Management |
| `/dashboard/rooms` | `rooms/` | Room Management |
| `/dashboard/hotel` | `hotel/` | Hotel Management Dashboard |
| `/dashboard/bookings` | `bookings/` | Booking Management |
| `/dashboard/customers` | `customers/` | Customer CRM |
| `/dashboard/staff` | `staff/` | Staff Management |
| `/dashboard/attendance` | `attendance/` | Attendance Tracking |
| `/dashboard/schedule` | `schedule/` | Staff Scheduling |
| `/dashboard/ingredients` | `ingredients/` | Ingredient Inventory |
| `/dashboard/stocks` | `stocks/` | Stock Management |
| `/dashboard/inventory` | `inventory/` | Inventory Management |
| `/dashboard/suppliers` | `suppliers/` | Supplier Management |
| `/dashboard/purchase-orders` | `purchase-orders/` | Purchase Orders |
| `/dashboard/wastage` | `wastage/` | Wastage Management |
| `/dashboard/expenses` | `expenses/` | Expense Tracking |
| `/dashboard/incomes` | `incomes/` | Income Tracking |
| `/dashboard/accounting` | `accounting/` | Ledger & Accounting |
| `/dashboard/work-periods` | `work-periods/` | Work Period Management |
| `/dashboard/reports` | `reports/` | Reports & Analytics |
| `/dashboard/pos-reports` | `pos-reports/` | POS Reports |
| `/dashboard/marketing` | `marketing/` | Marketing Campaigns |
| `/dashboard/digital-receipts` | `digital-receipts/` | Digital Receipts |
| `/dashboard/qr-code-menus` | `qr-code-menus/` | QR Code Menus |
| `/dashboard/ai-menu-optimization` | `ai-menu-optimization/` | AI Menu Optimization |
| `/dashboard/customer-loyalty-ai` | `customer-loyalty-ai/` | AI Customer Loyalty |
| `/dashboard/ai` | `ai/` | AI Insights Dashboard |
| `/dashboard/customer-display` | `customer-display/` | Customer Display |
| `/dashboard/subscriptions` | `subscriptions/` | Subscription Management |
| `/dashboard/subscription-features` | `subscription-features/` | Feature Catalog (super admin) |
| `/dashboard/subscription-payment-methods` | `subscription-payment-methods/` | Payment Methods (super admin) |
| `/dashboard/company-subscriptions` | `company-subscriptions/` | Company Subscriptions |
| `/dashboard/company-features` | `company-features/` | Company Feature Assignment |
| `/dashboard/settings` | `settings/` | General Settings |
| `/dashboard/system-settings` | `system-settings/` | System Settings (super admin) |
| `/dashboard/branches` | `branches/` | Branch Management |
| `/dashboard/role-access` | `role-access/` | Role & Permissions |
| `/dashboard/companies` | `companies/` | Company Management (super admin) |
| `/dashboard/users` | `users/` | User Management |
| `/dashboard/profile` | `profile/` | User Profile |
| `/dashboard/super-admin` | `super-admin/` | Super Admin Dashboard |
| `/dashboard/cms` | `cms/` | Content Management System |
| `/dashboard/gallery` | `gallery/` | Media Gallery |
| `/dashboard/contact-forms` | `contact-forms/` | Contact Form Submissions |
| `/dashboard/backups` | `backups/` | Database Backups |

### 6.5 Dashboard Layout (`src/app/dashboard/layout.tsx`)

- Authenticated wrapper: checks `isAuthenticated`, redirects to `/auth/login` if not
- Renders: `<Sidebar />` + `<Topbar />` + `<SubscriptionIndicator />` + `<OrderNotificationManager />` + `<FeedbackTrigger />`
- Shows `<DashboardSkeleton />` while loading
- Listens to `sidebar-toggle` custom event for collapse/expand

---

## 7. Frontend — Components

### 7.1 UI Components (`src/components/ui/`) — 26 components

| Component | File | Description |
|---|---|---|
| `Badge` | `Badge.tsx` | Status/tag badge with variants |
| `Button` | `Button.tsx` | Button with variants (primary, secondary, ghost, danger, outline) |
| `Calculator` | `Calculator.tsx` | On-screen calculator for POS |
| `Card` | `Card.tsx` | Card container with header, body, footer |
| `Checkbox` | `Checkbox.tsx` | Form checkbox |
| `Combobox` | `Combobox.tsx` | Autocomplete combobox input |
| `DashboardSkeleton` | `DashboardSkeleton.tsx` | Loading skeleton for dashboard |
| `DataTable` | `DataTable.tsx` | Reusable data table with sorting, filtering, pagination |
| `DateRangePicker` | `DateRangePicker.tsx` | Date range picker |
| `ExportButton` | `ExportButton.tsx` | CSV/Excel export button |
| `Footer` | `Footer.tsx` | Public site footer |
| `ImportButton` | `ImportButton.tsx` | CSV/Excel import button |
| `Input` | `Input.tsx` | Form input with variants |
| `Label` | `Label.tsx` | Form label |
| `Modal` | `Modal.tsx` | Modal dialog |
| `Navbar` | `Navbar.tsx` | Public site navigation bar |
| `NotificationBell` | `NotificationBell.tsx` | Notification bell with unread count |
| `OfflineBanner` | `OfflineBanner.tsx` | Offline status banner |
| `Pagination` | `Pagination.tsx` | Table pagination |
| `RadioGroup` | `RadioGroup.tsx` | Radio button group |
| `SearchBar` | `SearchBar.tsx` | Search input with debounce |
| `Select` | `Select.tsx` | Dropdown select |
| `Skeleton` | `Skeleton.tsx` | Loading skeleton placeholder |
| `SubscriptionIndicator` | `SubscriptionIndicator.tsx` | Trial/subscription status bar |
| `ThemeToggle` | `ThemeToggle.tsx` | Light/dark mode toggle |
| `Toast` | `Toast.tsx` | Toast notification wrapper (react-hot-toast) |

### 7.2 Layout Components (`src/components/layout/`)

| Component | File | Description |
|---|---|---|
| `Sidebar` | `Sidebar.tsx` | Main navigation sidebar (desktop + mobile drawer). Collapsible. Feature-gated menu items. Super admin vs regular user menus. |
| `Topbar` | `Topbar.tsx` | Top header bar with user menu, notifications, theme toggle |

### 7.3 Providers (`src/components/providers/`)

| Component | File | Description |
|---|---|---|
| `Providers` | `Providers.tsx` | Root provider wrapper: Redux `<Provider>`, `ThemeProvider`, `SocketProvider`, `CurrencyProvider`, `<Toaster>` |
| `SocketProvider` | `SocketProvider.tsx` | Socket.IO client connection and context provider |

### 7.4 Feature Components

| Directory | Contents |
|---|---|
| `components/dashboard/` | Dashboard-specific components (metrics cards, charts, etc.) |
| `components/kitchen/` | Kitchen Display System components (order cards, status columns) |
| `components/orders/` | Order management components (`OrderNotificationManager`, etc.) |
| `components/auth/` | Authentication components (login forms, PIN input) |
| `components/subscriptions/` | Subscription plan and payment components |
| `components/feedback/` | User feedback modal (`FeedbackTrigger`) |

---

## 8. Frontend — State Management

### 8.1 Redux Store (`src/lib/store.ts`)

```
store/
├── auth: authSlice (user, tokens, companyContext, isAuthenticated)
└── api:  apiSlice (RTK Query — all server state)
```

### 8.2 RTK Query Tags (52 tags)

Used for automatic cache invalidation — any mutation tagged with one of these re-fetches all queries with the same tag.

```
Auth, User, Marketing, Company, Branch, MenuItem, Category, Order, Table,
Room, Booking, Customer, Kitchen, Ingredient, Supplier, Expense, Income,
Report, Wastage, Subscription, WorkPeriod, Attendance, Staff, Reservation,
AI, Payment, Backup, LoginActivity, Schedule, POS, Printer, PrintJob,
Settings, QRCode, DigitalReceipt, DeliveryIntegration, PurchaseOrder,
Review, RolePermission, MyPermissions, Gallery, SuperAdminNotifications,
ContentPages, SystemFeedback, ContactForm, Transactions, PaymentMethods
```

### 8.3 API Endpoint Files (`src/lib/api/endpoints/`) — 44 files

Each file exports RTK Query `injectEndpoints` hooks (e.g., `useGetMenuItemsQuery`, `useCreateOrderMutation`).

| File | Module | File | Module |
|---|---|---|---|
| `authApi.ts` | Authentication | `marketingApi.ts` | Marketing |
| `usersApi.ts` | Users | `reportsApi.ts` | Reports |
| `companiesApi.ts` | Companies | `aiApi.ts` | AI |
| `companyApi.ts` | Company | `reviewsApi.ts` | Reviews |
| `branchesApi.ts` | Branches | `settingsApi.ts` | Settings |
| `menuItemsApi.ts` | Menu Items | `rolePermissionsApi.ts` | Role Permissions |
| `categoriesApi.ts` | Categories | `subscriptionsApi.ts` | Subscriptions |
| `tablesApi.ts` | Tables | `subscriptionPaymentsApi.ts` | Subscription Payments |
| `roomsApi.ts` | Rooms | `backupsApi.ts` | Backups |
| `bookingsApi.ts` | Bookings | `cmsApi.ts` | CMS |
| `ordersApi.ts` | Orders | `galleryApi.ts` | Gallery |
| `posApi.ts` | POS | `contactFormsApi.ts` | Contact Forms |
| `paymentsApi.ts` | Payments | `notificationsApi.ts` | Notifications |
| `kitchenApi.ts` | Kitchen | `superAdminNotificationsApi.ts` | Super Admin Notifications |
| `customersApi.ts` | Customers | `systemFeedbackApi.ts` | System Feedback |
| `inventoryApi.ts` | Inventory | `publicApi.ts` | Public |
| `ingredientsApi.ts` | Ingredients | `loginActivityApi.ts` | Login Activity |
| `suppliersApi.ts` | Suppliers | `paymentMethodsApi.ts` | Payment Methods |
| `purchaseOrdersApi.ts` | Purchase Orders | `transactionsApi.ts` | Transactions |
| `expensesApi.ts` | Expenses | `deliveryZonesApi.ts` | Delivery Zones |
| `incomesApi.ts` | Incomes | `scheduleApi.ts` | Schedule |
| `wastageApi.ts` | Wastage | `workPeriodsApi.ts` | Work Periods |

### 8.4 API Slice — Offline Architecture (`src/lib/api/apiSlice.ts`)

The `apiSlice.ts` is the **central API layer** containing:

- **`baseQueryWithReauth`**: Custom RTK Query base query with:
  - **Offline-first support**: GET requests served from IndexedDB snapshots, POST orders/payments queued for later sync
  - **Token refresh**: Automatic JWT refresh via httpOnly cookie when 401 is detected, with deduplication to prevent race conditions
  - **AES decryption**: Transparent response decryption via `decryptIfNeeded()`
  - **Subscription expiry handling**: Redirects to upgrade page on `SUBSCRIPTION_EXPIRED` / `TRIAL_EXPIRED` error codes
  - **Auth endpoint passthrough**: Skips refresh/redirect for login, register, PIN login endpoints

- **`OFFLINE_SNAPSHOT_MAP`**: Maps API URLs to IndexedDB snapshot keys for offline data serving

---

## 9. Frontend — Utilities and Helpers

### 9.1 Core Utilities (`src/lib/`)

| File | Usage |
|---|---|
| `utils.ts` | `cn()` (classname merging), `formatCurrency()`, `formatDate()`, general helpers |
| `store.ts` | Redux store configuration + typed hooks (`useAppDispatch`, `useAppSelector`) |

### 9.2 Encryption (`src/lib/utils/`)

| File | Purpose |
|---|---|
| `crypto.ts` | AES encryption/decryption for API request/response data |
| `storage-encryption.ts` | Encrypted localStorage helpers |

### 9.3 Data Import/Export (`src/lib/utils/`)

| File | Purpose |
|---|---|
| `export.ts` | CSV/Excel export utilities |
| `import.ts` | CSV/Excel import utilities |

### 9.4 Offline Support (`src/lib/offline/`)

| File | Purpose |
|---|---|
| `db.ts` | IndexedDB database setup, offline order/payment queue, snapshot storage |
| `posPrefetcher.ts` | Pre-fetches and caches POS data (menu, categories, payment methods, tables, etc.) for offline use |

### 9.5 Constants (`src/lib/constants/`)

| File | Purpose |
|---|---|
| `category-types.constant.ts` | Menu category type definitions |
| `countries.ts` | Country list for forms |

### 9.6 Enums (`src/lib/enums/`)

| File | Purpose |
|---|---|
| `user-role.enum.ts` | User role enum (mirrors backend) |

### 9.7 Slices (`src/lib/slices/`)

| File | Purpose |
|---|---|
| `authSlice.ts` | Auth state: user object, tokens, companyContext, isAuthenticated, login/logout actions |

---

## 10. Frontend — Hooks and Contexts

### 10.1 Custom Hooks (`src/hooks/`)

| Hook | File | Purpose |
|---|---|---|
| `usePermissions` | `usePermissions.ts` | Checks if user has specific permission(s) |
| `useRolePermissions` | `useRolePermissions.ts` | Role-based + feature-based permission checks (used by Sidebar) |
| `useFormatCurrency` | `useFormatCurrency.ts` | Formats amounts using the company's currency settings |
| `useFeatureRedirect` | `useFeatureRedirect.ts` | Redirects if user lacks a required feature |

### 10.2 Contexts (`src/contexts/`)

| Context | File | Purpose |
|---|---|---|
| `CurrencyContext` | `CurrencyContext.tsx` | Provides company currency settings throughout the app |

---

## 11. DevOps & Configuration

### 11.1 Docker

| File | Purpose |
|---|---|
| `docker-compose.yml` | Local dev: MongoDB 7, Redis 7, NestJS backend, Nginx reverse proxy |
| `coolify-docker-compose.yml` | Production: Backend + Frontend with healthchecks (Coolify deployment) |
| `backend/Dockerfile` | Backend production image |
| `frontend/Dockerfile` | Frontend production image |

### 11.2 Configuration Files

| File | Purpose |
|---|---|
| `backend/.env` | Backend environment variables (DB URI, JWT secrets, Stripe keys, AI keys) |
| `frontend/.env.local` | Frontend environment variables (`NEXT_PUBLIC_API_URL`) |
| `backend/src/config/configuration.ts` | Centralized config object (see §11.3) |
| `.prettierrc` | Code formatting config |

### 11.3 Backend Config Keys (`configuration.ts`)

```
port, nodeEnv, apiVersion
database.uri, database.testUri
redis.host, redis.port, redis.password, redis.ttl
jwt.secret, jwt.expiresIn, jwt.refreshSecret, jwt.refreshExpiresIn
bcrypt.rounds
rateLimit.ttl, rateLimit.max
email.service, email.host, email.port, email.user, email.password, email.from
cloudinary.cloudName, cloudinary.apiKey, cloudinary.apiSecret
stripe.secretKey, stripe.webhookSecret, stripe.priceIdBasic, stripe.priceIdPremium
openai.apiKey, openai.model
deepseek.apiKey, deepseek.model, deepseek.baseUrl
frontend.url
backup.dir, backup.retentionDays
superAdmin.email, superAdmin.password, superAdmin.firstName, superAdmin.lastName
```

---

## 12. Documentation (`docs/`) — 24 files

| File | Content |
|---|---|
| `API.md` | API endpoint documentation |
| `SCHEMAS.md` | Database schema definitions |
| `SECURITY.md` | Security architecture and practices |
| `DEPLOYMENT.md` | Deployment guide (Docker, Coolify, Vercel) |
| `SUBSCRIPTIONS.md` | Subscription system documentation |
| `AUTHENTICATION_FRONTEND.md` | Auth flow in the frontend |
| `AUTH_TESTING.md` | Auth testing procedures |
| `POS_FRONTEND_COMPLETE.md` | POS system documentation |
| `KITCHEN_DISPLAY_COMPLETE.md` | Kitchen Display System docs |
| `MENU_MANAGEMENT_COMPLETE.md` | Menu management docs |
| `TABLE_MANAGEMENT_COMPLETE.md` | Table management docs |
| `INVENTORY_MANAGEMENT_COMPLETE.md` | Inventory management docs |
| `CUSTOMER_MANAGEMENT_COMPLETE.md` | Customer CRM docs |
| `STAFF_MANAGEMENT_COMPLETE.md` | Staff management docs |
| `CATEGORY_TYPES_GUIDE.md` | Category types guide |
| `ENVIRONMENT_SETUP.md` | Environment setup guide |
| `ERROR_FIXES.md` | Known errors and fixes |
| `FINAL_CHECKLIST.md` | Pre-launch checklist |
| `FRONTEND_COMPLETED.md` | Frontend completion status |
| `FRONTEND_SETUP.md` | Frontend setup guide |
| `IMPLEMENTATION_GUIDE.md` | Implementation guide |
| `IMPORT_EXPORT_GUIDE.md` | Import/export feature guide |
| `NEW_FEATURES_ADDED.md` | Recently added features |
| `PROJECT_SUMMARY.md` | High-level project summary |

---

## 13. Key File Quick Reference

### Entry Points

| File | Description |
|---|---|
| `backend/src/main.ts:17` | NestJS `bootstrap()` — app startup, middleware, swagger, health checks |
| `backend/src/app.module.ts:71` | Root `@Module` — imports all 47 feature modules + MongoDB + Redis + Bull + Throttle |
| `frontend/src/app/layout.tsx` | Root layout — wraps everything in `<Providers>` |
| `frontend/src/app/page.tsx` | Landing page |
| `frontend/src/app/dashboard/layout.tsx` | Authenticated dashboard layout |

### State Management

| File | Description |
|---|---|
| `frontend/src/lib/store.ts` | Redux store config |
| `frontend/src/lib/api/apiSlice.ts` | RTK Query base + offline + token refresh + encryption |
| `frontend/src/lib/slices/authSlice.ts` | Auth Redux slice |

### Security

| File | Description |
|---|---|
| `backend/src/common/guards/jwt-auth.guard.ts` | Global JWT authentication guard |
| `backend/src/common/guards/subscription-feature.guard.ts` | Feature-gating guard |
| `backend/src/common/interceptors/encryption.interceptor.ts` | AES response encryption |
| `backend/src/common/middleware/subscription-lock.middleware.ts` | Global subscription expiry check |

### Sidebar Navigation

| File | Description |
|---|---|
| `frontend/src/components/layout/Sidebar.tsx:53` | Regular user navigation items (feature-gated) |
| `frontend/src/components/layout/Sidebar.tsx:353` | Super admin navigation items |

### Config

| File | Description |
|---|---|
| `backend/src/config/configuration.ts` | All config keys (DB, Redis, JWT, Stripe, OpenAI, DeepSeek, etc.) |
| `backend/.env` | Environment variable values |
| `frontend/.env.local` | Frontend environment variables |
