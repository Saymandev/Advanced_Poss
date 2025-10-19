# 🚀 Quick Setup Guide

## Advanced Restaurant POS & Management System

Welcome! This guide will help you get the system up and running in minutes.

---

## ⚡ **Quick Start (5 Minutes)**

### **Step 1: Install Dependencies**

```bash
# Navigate to frontend directory
cd frontend

# Install all dependencies
npm install

# This installs all required packages (~2 minutes)
```

### **Step 2: Set Up Environment Variables**

```bash
# Copy the example environment file
cp env.example.txt .env.local

# Edit the file with your preferred editor
# Minimum required: NEXT_PUBLIC_API_URL and NEXT_PUBLIC_APP_URL
```

**Minimum .env.local content:**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Step 3: Start Development Server**

```bash
# Still in the frontend directory
npm run dev

# Server will start on http://localhost:3000
```

### **Step 4: Open Your Browser**

Navigate to: `http://localhost:3000`

**That's it! You're ready to go!** 🎉

---

## 📋 **What You Can Do Right Now**

### **Without Backend (Frontend Only):**

✅ **Explore the UI**
- Browse all pages
- Test responsive design
- Try dark/light mode
- Navigate through modules

✅ **See All Components**
- POS interface
- Kitchen display
- Menu management
- Table management
- Inventory system
- Customer CRM
- Staff management

✅ **Test Form Validations**
- All forms have proper validation
- See error messages
- Test input fields

### **With Backend (Full Functionality):**

Once you set up the backend (optional), you get:
- ✅ Real data persistence
- ✅ User authentication
- ✅ Order processing
- ✅ Real-time updates
- ✅ Database operations
- ✅ API integration

---

## 🎯 **System Overview**

### **10 Complete Modules:**

1. **Dashboard** - `/dashboard`
   - Real-time statistics
   - Sales charts
   - Business insights

2. **POS System** - `/dashboard/pos`
   - Take orders
   - Shopping cart
   - Checkout

3. **Orders** - `/dashboard/orders`
   - View all orders
   - Update status
   - Search & filter

4. **Kitchen Display** - `/dashboard/kitchen`
   - Real-time order updates
   - Status tracking
   - Timer system

5. **Menu Management** - `/dashboard/menu`
   - Add/edit items
   - Categories
   - Pricing

6. **Table Management** - `/dashboard/tables`
   - QR codes
   - Reservations
   - Status tracking

7. **Inventory** - `/dashboard/inventory`
   - Stock tracking
   - Low stock alerts
   - Adjustments

8. **Customers (CRM)** - `/dashboard/customers`
   - Customer profiles
   - Loyalty program
   - Order history

9. **Staff Management** - `/dashboard/staff`
   - Employee profiles
   - Attendance
   - Roles

10. **Analytics** - Built into Dashboard
    - Charts
    - Reports
    - Insights

---

## 🔑 **Authentication (When Backend is Ready)**

### **Default Test Credentials:**

```
Email: admin@restaurant.com
Password: Admin123!
```

Or use PIN login:
```
Email: admin@restaurant.com
PIN: 1234
```

### **User Roles:**
- Super Admin
- Owner
- Manager
- Chef
- Waiter
- Cashier
- Cleaner

---

## 🎨 **UI Features**

### **Dark/Light Mode**
- Toggle in the header
- Persists across sessions
- All components adapt

### **Responsive Design**
- Mobile-friendly (< 640px)
- Tablet-optimized (640px - 1024px)
- Desktop-perfect (> 1024px)

### **Real-time Updates**
- Auto-refresh intervals
- Live data updates
- Socket.IO ready

---

## 📂 **Project Structure**

```
frontend/
├── src/
│   ├── app/                  # Pages (Next.js App Router)
│   │   ├── (auth)/          # Login, Register, Onboarding
│   │   └── (dashboard)/     # All dashboard pages
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn components
│   │   ├── dashboard/      # Dashboard specific
│   │   ├── pos/            # POS components
│   │   ├── kitchen/        # Kitchen components
│   │   ├── orders/         # Order components
│   │   ├── menu/           # Menu components
│   │   ├── tables/         # Table components
│   │   ├── inventory/      # Inventory components
│   │   ├── customers/      # CRM components
│   │   └── staff/          # Staff components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilities
│   └── types/              # TypeScript types
└── public/                 # Static assets
```

---

## 🛠️ **Available Scripts**

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type checking
npm run type-check
```

---

## 🔧 **Configuration Files**

### **Frontend:**
- `env.example.txt` - Environment variables template
- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `components.json` - Shadcn/UI configuration

### **Backend (Ready):**
- `env.example.txt` - Environment variables template
- All NestJS modules configured
- Database schemas defined
- API endpoints planned

---

## 📚 **Documentation**

### **Complete Guides:**
- `README.md` - Project overview
- `docs/ENVIRONMENT_SETUP.md` - Detailed environment setup
- `docs/FINAL_CHECKLIST.md` - Complete feature checklist
- `docs/AUTHENTICATION_FRONTEND.md` - Auth system
- `docs/POS_FRONTEND_COMPLETE.md` - POS documentation
- `docs/KITCHEN_DISPLAY_COMPLETE.md` - Kitchen system
- `docs/MENU_MANAGEMENT_COMPLETE.md` - Menu system
- `docs/TABLE_MANAGEMENT_COMPLETE.md` - Table system
- `docs/INVENTORY_MANAGEMENT_COMPLETE.md` - Inventory
- `docs/CUSTOMER_MANAGEMENT_COMPLETE.md` - CRM
- `docs/STAFF_MANAGEMENT_COMPLETE.md` - Staff system

---

## 🚀 **Deployment**

### **Frontend (Vercel - Recommended)**

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy!

```bash
# Or use Vercel CLI
npm install -g vercel
vercel
```

### **Frontend (Netlify)**

```bash
npm run build
# Drag 'out' folder to Netlify
```

---

## 🐛 **Troubleshooting**

### **Port 3000 already in use:**
```bash
# Kill the process
npx kill-port 3000

# Or use a different port
npm run dev -- -p 3001
```

### **Module not found errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### **TypeScript errors:**
```bash
# Check for type errors
npm run type-check
```

### **Environment variables not loading:**
- Make sure file is named `.env.local` (not `.env.local.txt`)
- Restart development server after changes
- Check for typos in variable names

---

## 🎯 **Next Steps**

### **1. Explore the System**
- Click through all pages
- Test all features
- Try different screen sizes

### **2. Customize**
- Update branding
- Modify colors
- Add your logo

### **3. Set Up Backend (Optional)**
- Follow backend setup guide
- Connect to database
- Enable API endpoints

### **4. Deploy**
- Push to production
- Set up domain
- Configure SSL

---

## 💡 **Tips & Tricks**

### **Keyboard Shortcuts:**
- `Ctrl/Cmd + K` - Quick search (when implemented)
- `Ctrl/Cmd + /` - Toggle sidebar
- `Escape` - Close dialogs

### **Developer Tools:**
- React DevTools - Inspect components
- Redux DevTools - View state (if using Redux)
- Network tab - Monitor API calls

### **Performance:**
- Use Lighthouse for audits
- Check bundle size
- Optimize images

---

## 🆘 **Getting Help**

### **Documentation:**
- Read the `/docs` folder
- Check individual module docs
- Review TypeScript types

### **Common Issues:**
- Check console for errors
- Verify environment variables
- Ensure all dependencies installed

### **Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/UI](https://ui.shadcn.com)
- [TypeScript](https://www.typescriptlang.org/docs)

---

## ✅ **Verification Checklist**

After setup, verify:

- [ ] `npm install` completed successfully
- [ ] `.env.local` file created
- [ ] Development server starts without errors
- [ ] Can navigate to `http://localhost:3000`
- [ ] Can browse different pages
- [ ] No console errors
- [ ] Dark/light mode works
- [ ] Responsive design works

---

## 🎉 **You're All Set!**

Your Restaurant POS system is ready to use!

### **What You Have:**
✨ Complete POS system  
✨ Kitchen display  
✨ Inventory management  
✨ Customer CRM  
✨ Staff management  
✨ And much more!  

### **Start Building:**
1. Explore the codebase
2. Customize to your needs
3. Add your data
4. Deploy to production

**Welcome to your new Restaurant Management System!** 🍽️✨

---

**Happy coding!** 🚀

For detailed setup, see `docs/ENVIRONMENT_SETUP.md`  
For feature list, see `docs/FINAL_CHECKLIST.md`  
For project overview, see `README.md`

