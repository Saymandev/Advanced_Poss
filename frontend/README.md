# 🍽️ Advanced Restaurant POS - Frontend

A modern, eye-catching Next.js frontend application for restaurant, bar, and cafe management systems.

## ✨ Features

### 🔐 Authentication
- **Three-Step Login Flow**: Find company → Select branch/role → PIN authentication
- **Super Admin Login**: Direct email/password login for system administrators
- **Company Owner Registration**: One-step business setup with company, branch, and owner info
- **JWT Token Management**: Automatic token refresh and secure storage

### 📊 Dashboard & Analytics
- **Real-time Dashboard**: Live metrics with sales, orders, and customer statistics
- **Interactive Charts**: Sales trends, top-selling items, revenue breakdown
- **Recent Orders**: Quick overview of latest transactions
- **Analytics Widgets**: Key performance indicators at a glance

### 🛒 POS System
- **Order Management**: Create orders with table selection (dine-in, takeaway, delivery)
- **Shopping Cart**: Real-time cart with quantity adjustments
- **Menu Item Selection**: Category-based filtering and search
- **Table Integration**: Visual table status and selection

### 👨‍🍳 Kitchen Display System
- **Real-time Order Queue**: Separate views for pending and in-progress orders
- **Order Status Updates**: Easy status changes (pending → preparing → ready)
- **Special Instructions**: Highlighted notes and special requirements
- **Time Tracking**: Order timestamps for better kitchen management

### 🍽️ Menu Management
- **Item Creation & Editing**: Full CRUD operations for menu items
- **Category Organization**: Organize items by categories
- **Availability Toggle**: Enable/disable items instantly
- **Price Management**: Easy pricing updates

### 🪑 Table Management
- **Visual Table Layout**: Grid view of all tables with status colors
- **Status Management**: Available, occupied, reserved states
- **Capacity Tracking**: Monitor table capacities
- **Quick Actions**: One-click status updates

### 👥 Customer Management
- **Customer Database**: Complete customer information tracking
- **Order History**: View customer purchase history
- **Loyalty Points**: Track and manage loyalty programs
- **Contact Information**: Email and phone management

### 📦 Inventory Management
- **Ingredient Tracking**: Monitor stock levels in real-time
- **Low Stock Alerts**: Automatic warnings for items below minimum
- **Restock Management**: Easy restocking workflows
- **Supplier Integration**: Track suppliers and purchase history

### 👨‍💼 Staff Management
- **Team Members**: Complete staff directory
- **Role Management**: Manager, chef, waiter, cashier roles
- **Schedule Tracking**: View staff schedules
- **Attendance**: Monitor staff presence and shifts

### 📈 Reports & Analytics
- **Sales Reports**: Detailed sales analysis with charts
- **Revenue Breakdown**: Category-wise revenue analysis
- **Peak Hours**: Identify busiest times
- **Performance Metrics**: Top-performing items and trends

### 💳 Subscription Management
- **Plan Comparison**: View all available subscription plans
- **Usage Tracking**: Monitor plan limits and usage
- **Billing History**: Access past invoices and payments
- **Upgrade/Downgrade**: Easy plan changes

### 🤖 AI Insights
- **Demand Prediction**: AI-powered demand forecasting
- **Menu Optimization**: Pricing and menu recommendations
- **Inventory Alerts**: Predictive stock warnings
- **Sales Analysis**: Automated insights and recommendations

### 🎨 Theme Support
- **Dark Mode**: Beautiful dark theme for low-light environments
- **Light Mode**: Clean, bright interface for daytime use
- **Auto Toggle**: Easy theme switching
- **Persistent Preference**: Theme choice saved across sessions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Backend API running on `http://localhost:5000`

### Installation

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create environment file:**
Create a `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

4. **Start the development server:**
```bash
npm run dev
```

5. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── auth/                 # Authentication pages
│   │   │   ├── login/            # Find company login
│   │   │   ├── pin-login/        # PIN authentication
│   │   │   ├── super-admin/      # Super admin login
│   │   │   └── register/         # Company registration
│   │   ├── dashboard/            # Main dashboard pages
│   │   │   ├── page.tsx          # Dashboard home
│   │   │   ├── orders/           # POS/Orders
│   │   │   ├── kitchen/          # Kitchen display
│   │   │   ├── menu/             # Menu management
│   │   │   ├── tables/           # Table management
│   │   │   ├── customers/        # Customer management
│   │   │   ├── inventory/        # Inventory
│   │   │   ├── staff/            # Staff management
│   │   │   ├── reports/          # Reports & analytics
│   │   │   ├── expenses/         # Expense tracking
│   │   │   ├── work-periods/     # Work periods
│   │   │   ├── subscriptions/    # Subscription management
│   │   │   ├── ai/               # AI insights
│   │   │   └── settings/         # Settings
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home redirect
│   │   └── globals.css           # Global styles
│   ├── components/               # React components
│   │   ├── layout/               # Layout components
│   │   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   │   └── Topbar.tsx        # Top navigation bar
│   │   ├── providers/            # Context providers
│   │   │   └── Providers.tsx     # Redux & Theme providers
│   │   └── ui/                   # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       └── ThemeToggle.tsx
│   └── lib/                      # Utilities and configuration
│       ├── api/                  # API integration
│       │   ├── apiSlice.ts       # RTK Query base
│       │   └── endpoints/        # API endpoints
│       │       ├── authApi.ts
│       │       ├── ordersApi.ts
│       │       ├── menuItemsApi.ts
│       │       ├── tablesApi.ts
│       │       └── reportsApi.ts
│       ├── slices/               # Redux slices
│       │   └── authSlice.ts      # Auth state management
│       ├── store.ts              # Redux store
│       └── utils.ts              # Utility functions
├── public/                       # Static assets
├── .env.local                    # Environment variables
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS config
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies
```

## 🔑 Default Login Credentials

### Super Admin
- Email: `admin@restaurantpos.com`
- Password: `Admin@123456`

### Company Owner (After Registration)
- Use your registered email
- Follow the three-step login flow
- Enter your 4-6 digit PIN

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Headless UI patterns
- **Charts**: Recharts
- **Icons**: Heroicons
- **Theme**: next-themes for dark/light mode
- **Notifications**: react-hot-toast
- **Animations**: Framer Motion

## 📱 Responsive Design

The application is fully responsive and works seamlessly across:
- 📱 Mobile devices (320px+)
- 📱 Tablets (768px+)
- 💻 Laptops (1024px+)
- 🖥️ Desktops (1280px+)

## 🔒 Security Features

- JWT token authentication
- Automatic token refresh
- Secure local storage
- Role-based access control (RBAC)
- Protected routes
- Auth guards
- XSS protection

## 🌐 API Integration

The frontend integrates with the backend API at `http://localhost:5000/api/v1` and supports all backend modules:
- Authentication & Authorization
- User Management
- Company & Branch Management
- Menu & Categories
- Orders & Tables
- Kitchen Operations
- Customer Management
- Inventory & Suppliers
- Expense Tracking
- Reports & Analytics
- Subscriptions
- AI Insights
- Work Periods
- And more...

## 🚀 Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🧪 Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 📝 Notes

- Make sure the backend API is running before starting the frontend
- The application uses localStorage for persisting auth tokens
- All API calls are made through RTK Query for caching and optimization
- Dark/light theme preference is saved in localStorage

## 🤝 Support

For issues or questions, please refer to the main project documentation or contact the development team.

## 📄 License

This project is part of the Advanced Restaurant POS system.

---

Built with ❤️ using Next.js and TypeScript

