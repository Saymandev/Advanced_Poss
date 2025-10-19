# 🚀 Quick Start Guide

Get your Restaurant POS up and running in **3 simple steps**!

---

## Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Step 2: Start Servers

```bash
# From project root
npm run dev
```

This will open two windows:
- **Backend**: `http://localhost:4000`
- **Frontend**: `http://localhost:3000`

---

## Step 3: Seed Sample Data

```bash
# From project root (in a new terminal)
npm run seed
```

This populates your database with:
- ✅ 5 user accounts (different roles)
- ✅ 12 menu items
- ✅ 8 tables
- ✅ 10 inventory items
- ✅ 3 customers

---

## 🎉 You're Ready!

### Login Credentials:

| Role | Email | Password |
|------|-------|----------|
| **Owner** | owner@restaurant.com | Password123! |
| **Admin** | admin@restaurant.com | Password123! |
| **Manager** | manager@restaurant.com | Password123! |
| **Waiter** | waiter@restaurant.com | Password123! |
| **Chef** | chef@restaurant.com | Password123! |

### What to Explore:

1. **📊 Dashboard** - View sales analytics and insights
2. **🛒 POS** - Create new orders with menu items
3. **👨‍🍳 Kitchen** - Track orders in real-time (login as Chef)
4. **📋 Orders** - Manage order lifecycle
5. **🍕 Menu** - Add/edit menu items
6. **🪑 Tables** - View tables and generate QR codes
7. **📦 Inventory** - Track stock levels
8. **👥 Customers** - Manage customer relationships

---

## 📝 Important Notes

### Environment Setup

Make sure you have `.env` files configured:

**Backend** (`backend/.env`):
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/restaurant_pos
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### MongoDB

Ensure MongoDB is running locally or update `MONGODB_URI` with your connection string.

```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB (if not running)
mongod
```

---

## 🆘 Troubleshooting

### Tailwind CSS not working?
```bash
cd frontend
rm -rf .next
npm run dev
```

### Seed fails?
- Make sure MongoDB is running
- Check `.env` file in backend
- Clear database if re-seeding:
  ```js
  // In MongoDB shell
  use restaurant_pos
  db.dropDatabase()
  ```

### Port already in use?
- Kill existing Node processes
- Change ports in `.env` files

---

## 📚 More Information

- [SEED_DATA_GUIDE.md](SEED_DATA_GUIDE.md) - Detailed seeding instructions
- [README.md](README.md) - Full project documentation
- [docs/](docs/) - Module-specific documentation

---

**Happy Coding! 🎉**
