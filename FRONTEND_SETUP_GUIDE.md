# 🎨 Frontend Setup Guide - Advanced Restaurant POS

This guide will help you set up and run the modern, eye-catching frontend for your restaurant management system.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm** v9.0.0 or higher (comes with Node.js)
- **Git** (for version control)
- **Backend API** running on `http://localhost:5000`

## 🚀 Quick Start (5 minutes)

### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- React 18
- Redux Toolkit
- Tailwind CSS
- TypeScript
- And all other dependencies

### Step 3: Configure Environment

Create a `.env.local` file in the `frontend` directory:

```bash
# Create the file
touch .env.local

# Add this content (you can edit the file with any text editor)
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

Or if you're on Windows:
```powershell
New-Item -Path . -Name ".env.local" -ItemType "file" -Force
# Then edit the file and add: NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### Step 4: Start the Development Server

```bash
npm run dev
```

### Step 5: Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

You should see the beautiful login page! 🎉

## 🔐 First Login

### Option 1: Register a New Business

1. Click "Register New Business" on the login page
2. Fill in the 3-step registration form:
   - **Step 1**: Company details (name, type, email, country)
   - **Step 2**: Branch information (address details)
   - **Step 3**: Owner information (name, phone, PIN)
3. Complete registration and you'll be logged in automatically!

### Option 2: Super Admin Login

1. Click "Super Admin Login"
2. Use these credentials:
   - Email: `admin@restaurantpos.com`
   - Password: `Admin@123456`
3. You'll have full access to all features

### Option 3: Existing User Login

1. Enter your email address
2. Select your branch and role
3. Enter your 4-6 digit PIN
4. Start using the system!

## 📱 Features Overview

Once logged in, you'll have access to:

### 🏠 Dashboard
- Real-time sales and order statistics
- Beautiful charts and graphs
- Recent orders overview
- Quick access to all features

### 🛒 POS System (`/dashboard/orders`)
- Create orders with an intuitive interface
- Select tables for dine-in orders
- Real-time cart management
- Support for dine-in, takeaway, and delivery

### 👨‍🍳 Kitchen Display (`/dashboard/kitchen`)
- Real-time order queue
- Separate views for pending and in-progress orders
- Easy status updates
- Special instruction highlights

### 🍽️ Menu Management (`/dashboard/menu`)
- Add, edit, and delete menu items
- Category organization
- Availability management
- Price updates

### 🪑 Table Management (`/dashboard/tables`)
- Visual table layout
- Status tracking (available, occupied, reserved)
- Quick status updates
- Capacity monitoring

### 👥 Customer Management (`/dashboard/customers`)
- Customer database
- Order history
- Loyalty points tracking
- Contact management

### 📦 Inventory (`/dashboard/inventory`)
- Ingredient tracking
- Low stock alerts
- Restock management
- Supplier integration

### 👨‍💼 Staff Management (`/dashboard/staff`)
- Team directory
- Role management
- Schedule tracking
- Attendance monitoring

### 📈 Reports & Analytics (`/dashboard/reports`)
- Sales trends
- Revenue breakdown
- Top-selling items
- Peak hours analysis

### 💳 Subscriptions (`/dashboard/subscriptions`)
- Plan comparison
- Usage tracking
- Billing history
- Easy upgrades

### 🤖 AI Insights (`/dashboard/ai`)
- Demand prediction
- Menu optimization
- Inventory alerts
- Sales recommendations

## 🎨 Theme Switching

Toggle between light and dark modes using the theme button in the top right corner!

- 🌞 Light Mode: Perfect for daytime use
- 🌙 Dark Mode: Easy on the eyes in low-light environments

## 🏗️ Project Structure Explained

```
frontend/
├── src/
│   ├── app/                    # Pages (Next.js App Router)
│   │   ├── auth/              # Login, register, PIN authentication
│   │   ├── dashboard/         # All dashboard pages
│   │   └── layout.tsx         # Root layout with providers
│   ├── components/            # Reusable components
│   │   ├── layout/           # Sidebar, Topbar
│   │   ├── ui/               # Button, Input, Card, etc.
│   │   └── providers/        # Redux & Theme providers
│   └── lib/                   # Business logic
│       ├── api/              # API integration (RTK Query)
│       ├── slices/           # Redux state management
│       ├── store.ts          # Redux store configuration
│       └── utils.ts          # Helper functions
├── public/                    # Static files
├── .env.local                # Environment variables (create this!)
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
└── package.json              # Dependencies
```

## 🔧 Development Tips

### Hot Reload
The development server supports hot reload. Any changes you make to the code will automatically refresh the browser!

### Type Safety
The project uses TypeScript for type safety. Your IDE will show helpful type hints and catch errors before runtime.

### API Integration
All API calls are managed through Redux RTK Query, which provides:
- Automatic caching
- Loading states
- Error handling
- Optimistic updates

### Styling
Tailwind CSS is used for styling. You can use utility classes or create custom components.

## 🐛 Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
# Option 1: Kill the process using port 3000
# On Mac/Linux:
lsof -ti:3000 | xargs kill -9
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Option 2: Run on a different port
npm run dev -- -p 3001
```

### Cannot Connect to Backend
Make sure:
1. Backend is running on `http://localhost:5000`
2. `.env.local` file is created with correct API URL
3. No CORS issues (backend should allow localhost:3000)

### Dependencies Issues
If you encounter dependency issues:
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Clean npm cache
npm cache clean --force

# Reinstall dependencies
npm install
```

### TypeScript Errors
If you see TypeScript errors:
```bash
# Delete TypeScript cache
rm -rf .next

# Restart the dev server
npm run dev
```

## 📦 Building for Production

When you're ready to deploy:

```bash
# Build the application
npm run build

# Test the production build locally
npm start

# The production app will run on http://localhost:3000
```

## 🌐 API Endpoints Used

The frontend integrates with these backend modules:

- `/auth/*` - Authentication & authorization
- `/users/*` - User management
- `/companies/*` - Company management
- `/branches/*` - Branch management
- `/menu-items/*` - Menu management
- `/categories/*` - Category management
- `/orders/*` - Order management
- `/tables/*` - Table management
- `/kitchen/*` - Kitchen operations
- `/customers/*` - Customer management
- `/ingredients/*` - Inventory management
- `/suppliers/*` - Supplier management
- `/expenses/*` - Expense tracking
- `/reports/*` - Reports & analytics
- `/subscriptions/*` - Subscription management
- `/work-periods/*` - Work period tracking
- `/ai/*` - AI insights

## 🎯 Next Steps

1. **Explore the Dashboard**: Navigate through all the features
2. **Create Test Data**: Add menu items, tables, and customers
3. **Test the POS**: Create some test orders
4. **Try Dark Mode**: Toggle the theme
5. **Check Reports**: View analytics and insights
6. **Customize**: Modify colors, add features, or adjust layouts

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 💡 Pro Tips

1. **Use Browser DevTools**: Chrome/Firefox DevTools are your best friend
2. **Install Redux DevTools**: Monitor state changes in real-time
3. **Check Network Tab**: See all API requests and responses
4. **Use React DevTools**: Inspect component tree and props
5. **Enable Auto-save in IDE**: Changes reflect instantly with hot reload

## 🎉 You're All Set!

Your frontend is now running! Enjoy managing your restaurant with this beautiful, modern interface.

If you encounter any issues, check the troubleshooting section or refer to the main README.

---

**Happy Coding! 🚀**

