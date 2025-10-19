# 🌱 Seed Data Guide

This guide will help you populate your database with sample data to explore the Restaurant POS application.

## What's Included

The seed script creates:

### 👤 **5 User Accounts** (with different roles)
- **Owner**: `owner@restaurant.com` / `Password123!`
- **Admin**: `admin@restaurant.com` / `Password123!`
- **Manager**: `manager@restaurant.com` / `Password123!`
- **Waiter**: `waiter@restaurant.com` / `Password123!`
- **Chef**: `chef@restaurant.com` / `Password123!`

### 🍽️ **12 Menu Items** across 4 categories
- **Appetizers**: Caesar Salad, Chicken Wings, Bruschetta
- **Main Courses**: Grilled Salmon, Beef Burger, Margherita Pizza, Chicken Pasta Alfredo
- **Desserts**: Chocolate Lava Cake, Tiramisu
- **Beverages**: Fresh Orange Juice, Iced Coffee

### 🪑 **8 Tables**
- Window seating (2 tables)
- Main Hall (3 tables)
- Patio (2 tables)
- Private Room (1 table)

### 📦 **10 Inventory Items**
- Chicken Breast, Salmon, Beef, Cheese, Tomatoes, Lettuce, Pasta, Pizza Dough, Olive Oil, Coffee Beans

### 👥 **3 Sample Customers**
- With loyalty points, order history, and preferences

### 👨‍🍳 **3 Staff Members**
- Linked to user accounts with employment details

---

## How to Run

### Prerequisites
1. Make sure **MongoDB is running**
2. Make sure your **backend `.env` file is configured**
3. Backend dependencies should be installed (`npm install` in backend folder)

### Option 1: From Backend Directory

```bash
cd backend
npm run seed
```

### Option 2: From Root Directory

```bash
npm run seed
```

---

## What Happens

When you run the seed script, it will:

1. ✅ Connect to your MongoDB database
2. ✅ Create 5 users with different roles
3. ✅ Create 4 menu categories
4. ✅ Create 12 menu items with images, prices, and details
5. ✅ Create 8 tables with different capacities
6. ✅ Create 10 inventory ingredients with stock levels
7. ✅ Create 3 sample customers
8. ✅ Create 3 staff member profiles
9. ✅ Display all login credentials

---

## After Seeding

### 🚀 Start Exploring!

1. **Login as Admin** to access all features
2. **Browse the POS** - View menu items and create orders
3. **Check Tables** - See table status and reservations
4. **View Inventory** - Check stock levels (some items near reorder point!)
5. **Manage Customers** - View loyalty points and history
6. **Review Staff** - See employee details and schedules

### 🎨 Features to Try

- **Dashboard**: View analytics and insights
- **POS System**: Create sample orders with the menu items
- **Kitchen Display**: See orders in real-time (login as Chef)
- **Orders Management**: Track order status and history
- **Table Management**: Assign orders to tables, view QR codes
- **Inventory**: Adjust stock levels, set reorder alerts
- **Customer Management**: Add notes, track loyalty points
- **Staff Management**: View schedules, manage permissions

---

## Important Notes

⚠️ **Warning**: This will add data to your database. If you want to start fresh:

1. Clear your database first:
   ```bash
   # In MongoDB shell or Compass
   use restaurant_pos
   db.dropDatabase()
   ```

2. Then run the seed script

🔄 **Re-seeding**: You can run the seed script multiple times, but it will create duplicate data. It's recommended to clear the database first.

---

## Troubleshooting

### "Connection failed"
- Make sure MongoDB is running
- Check your `.env` file has correct `MONGODB_URI`

### "Module not found"
- Run `npm install` in the backend directory

### "Validation error"
- Your database might already have conflicting data
- Try clearing the database first

---

## Sample Login Credentials (Summary)

| Role    | Email                      | Password      |
|---------|----------------------------|---------------|
| Owner   | owner@restaurant.com       | Password123!  |
| Admin   | admin@restaurant.com       | Password123!  |
| Manager | manager@restaurant.com     | Password123!  |
| Waiter  | waiter@restaurant.com      | Password123!  |
| Chef    | chef@restaurant.com        | Password123!  |

---

## Next Steps

After seeding, you can:

1. ✨ **Customize the data** - Edit `backend/src/scripts/seed.ts`
2. 🏗️ **Add more items** - Create additional menu items through the UI
3. 📊 **Generate orders** - Use the POS to create sample orders
4. 🧪 **Test features** - Explore all modules with realistic data

Enjoy exploring your Restaurant POS system! 🎉

