# 🚀 Quick Reference Card

## Start the System

```bash
# Backend (Terminal 1)
cd backend
npm run start:dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

## Access URLs

| Application | URL |
|------------|-----|
| **Login** | http://localhost:3000 |
| **Dashboard** | http://localhost:3000/dashboard |
| **POS** | http://localhost:3000/dashboard/orders |
| **Kitchen** | http://localhost:3000/dashboard/kitchen |
| **Menu** | http://localhost:3000/dashboard/menu |
| **Customer Display** | http://localhost:3000/display/[tableId] |
| **Backend API** | http://localhost:5000 |
| **Swagger Docs** | http://localhost:5000/api/docs |

## Default Credentials

### Test User
After registering, you can create users with PINs.

### Super Admin (if seeded)
- Email: admin@example.com
- Password: (check your seed file)

## Key Features

### ✅ Completed
- Authentication (3-step PIN login)
- POS System
- Kitchen Display (auto-refresh 5s)
- **Customer Display** 🆕 (auto-refresh 3s)
- Menu Management
- Dark/Light Mode
- Real-time Updates
- 94 API Endpoints
- 50+ Components

### 🌟 Advanced Features
1. **Customer Display** - Public order tracking
2. **Real-time Kitchen** - Live order updates
3. **Dark Mode** - Theme switching
4. **Role-based Access** - 6 different roles
5. **Multi-branch** - Scale to any size

## API Modules

1. **authApi** - Authentication
2. **ordersApi** - Orders & POS
3. **menuItemsApi** - Menu management
4. **tablesApi** - Tables & reservations
5. **customersApi** - CRM & loyalty
6. **staffApi** - Staff & attendance
7. **inventoryApi** - Inventory control
8. **expensesApi** - Expense tracking
9. **reportsApi** - Analytics
10. **subscriptionsApi** - Billing
11. **workPeriodsApi** - Work periods
12. **aiApi** - AI insights

## User Roles

| Role | Access Level |
|------|-------------|
| `super_admin` | Everything |
| `owner` | Company-wide |
| `manager` | Branch-level |
| `chef` | Kitchen only |
| `waiter` | POS & tables |
| `cashier` | POS & payments |

## Troubleshooting

### Backend won't start
```bash
cd backend
npm install
npm run start:dev
```

### Frontend won't start
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### API connection errors
Check `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### Customer display not updating
1. Check WiFi
2. Verify table ID
3. Refresh browser
4. Check order exists

## Documentation

| Document | Purpose |
|----------|---------|
| **FRONTEND_COMPLETE_GUIDE.md** | Complete technical guide |
| **FRONTEND_IMPLEMENTATION_COMPLETE.md** | Implementation summary |
| **CUSTOMER_DISPLAY_GUIDE.md** | Customer display setup |
| **🎉_EVERYTHING_IS_COMPLETE.md** | Overall summary |
| **QUICK_REFERENCE.md** | This file |

## Customer Display Setup

1. Generate QR code for table
2. Print and place on table
3. Mount tablet at table
4. Navigate to: `/display/[tableId]`
5. Done! 🎉

## Emergency Commands

```bash
# Kill all Node processes
pkill -f node

# Clear all caches
rm -rf backend/node_modules backend/dist
rm -rf frontend/node_modules frontend/.next

# Fresh install
cd backend && npm install
cd ../frontend && npm install

# Start fresh
cd backend && npm run start:dev
cd ../frontend && npm run dev
```

## Performance Tips

- Use Chrome/Edge for best performance
- Enable hardware acceleration
- Clear browser cache regularly
- Keep WiFi strong for displays
- Monitor backend logs

## Support

1. Check documentation
2. Review console logs
3. Test API with Postman
4. Check network tab
5. Review code comments

## Deployment

### Quick Deploy
```bash
# Frontend to Vercel
vercel --prod

# Backend to Heroku
git push heroku main
```

### Environment Variables
```env
# Frontend
NEXT_PUBLIC_API_URL=https://your-api.com/api/v1

# Backend
DATABASE_URL=mongodb://...
JWT_SECRET=your-secret
```

## Success Metrics

- ✅ Backend running
- ✅ Frontend running
- ✅ Login working
- ✅ Orders creating
- ✅ Kitchen updating
- ✅ Customer display showing
- ✅ No console errors

## Next Steps

1. Test all features
2. Customize branding
3. Add company logo
4. Configure printers
5. Train staff
6. Deploy to production
7. Go live! 🚀

---

**Everything is ready. Time to launch! 🎉**
