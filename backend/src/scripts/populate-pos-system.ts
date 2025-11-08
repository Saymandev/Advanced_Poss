import { NestFactory } from '@nestjs/core';
import { Types } from 'mongoose';
import { AppModule } from '../app.module';
import { UserRole } from '../common/enums/user-role.enum';
import { BranchesService } from '../modules/branches/branches.service';
import { CategoriesService } from '../modules/categories/categories.service';
import { CompaniesService } from '../modules/companies/companies.service';
import { MenuItemsService } from '../modules/menu-items/menu-items.service';
import { POSService } from '../modules/pos/pos.service';
import { TablesService } from '../modules/tables/tables.service';
import { UsersService } from '../modules/users/users.service';

async function populatePOSSystem() {
  console.log('🌱 Populating POS System with real data...');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const posService = app.get(POSService);
  const menuItemsService = app.get(MenuItemsService);
  const categoriesService = app.get(CategoriesService);
  const tablesService = app.get(TablesService);
  const usersService = app.get(UsersService);
  const companiesService = app.get(CompaniesService);
  const branchesService = app.get(BranchesService);

  try {
    // 1. Create or find company
    console.log('📊 Setting up company...');
    let company: any = await companiesService.findByEmail('pos@restaurant.com');
    
    if (!company) {
      company = await companiesService.create({
        name: 'Restaurant POS Demo',
        email: 'pos@restaurant.com',
        phone: '+1234567890',
        address: {
          street: '123 Restaurant Street',
          city: 'Demo City',
          state: 'DC',
          country: 'Demo Country',
          zipCode: '12345',
        },
        website: 'https://restaurant-pos.com',
        ownerId: new Types.ObjectId().toString(),
        subscriptionPlan: 'premium',
      });
    }

    if (company && company.toObject) {
      company = company.toObject();
    }

    // 2. Create or find branch
    console.log('🏢 Setting up branch...');
    let branches: any = await branchesService.findByCompany(company._id.toString());
    let branch: any = branches[0];
    
    if (!branch) {
      branch = await branchesService.create({
        companyId: company._id.toString(),
        name: 'Main Restaurant',
        address: {
          street: '123 Restaurant Street',
          city: 'Demo City',
          state: 'DC',
          country: 'Demo Country',
          zipCode: '12345',
        },
        phone: '+1234567890',
        email: 'main@restaurant.com',
      });
    }

    if (branch && branch.toObject) {
      branch = branch.toObject();
    }

    // 3. Create POS user
    console.log('👤 Setting up POS user...');
    let user: any = await usersService.findByEmail('pos@restaurant.com');
    
    if (!user) {
      user = await usersService.create({
        firstName: 'POS',
        lastName: 'User',
        email: 'pos@restaurant.com',
        password: 'password123',
        role: UserRole.CASHIER,
        companyId: company._id.toString(),
        branchId: branch._id.toString(),
        pin: '1234',
        phone: '+1234567890',
      });
    }

    if (user && user.toObject) {
      user = user.toObject();
    }

    // 4. Create categories
    console.log('📂 Creating menu categories...');
    const categories = [];
    const categoryData = [
      { name: 'Appetizers', description: 'Start your meal right', type: 'food' },
      { name: 'Main Courses', description: 'Hearty main dishes', type: 'food' },
      { name: 'Beverages', description: 'Refreshing drinks', type: 'beverage' },
      { name: 'Desserts', description: 'Sweet endings', type: 'dessert' },
      { name: 'Salads', description: 'Fresh and healthy', type: 'food' },
    ];

    for (const catData of categoryData) {
      let category: any = await categoriesService.create({
        name: catData.name,
        description: catData.description,
        companyId: company._id.toString(),
        branchId: branch._id.toString(),
        type: catData.type,
      });

      if (category && category.toObject) {
        category = category.toObject();
      }
      categories.push(category);
      console.log(`✅ Category "${catData.name}" created`);
    }

    // 5. Create menu items
    console.log('🍽️ Creating menu items...');
    const menuItems = [];
    const menuItemData = [
      // Appetizers
      { name: 'Buffalo Wings', description: 'Spicy chicken wings with ranch dip', price: 12.99, category: 'Appetizers' },
      { name: 'Mozzarella Sticks', description: 'Crispy breaded mozzarella with marinara', price: 8.99, category: 'Appetizers' },
      { name: 'Nachos Supreme', description: 'Loaded nachos with cheese, jalapeños, and sour cream', price: 10.99, category: 'Appetizers' },
      { name: 'Chicken Quesadilla', description: 'Grilled chicken with cheese in a crispy tortilla', price: 11.99, category: 'Appetizers' },
      
      // Main Courses
      { name: 'Grilled Salmon', description: 'Fresh Atlantic salmon with lemon herb butter', price: 24.99, category: 'Main Courses' },
      { name: 'Ribeye Steak', description: '12oz ribeye steak cooked to perfection', price: 32.99, category: 'Main Courses' },
      { name: 'Chicken Parmesan', description: 'Breaded chicken breast with marinara and mozzarella', price: 18.99, category: 'Main Courses' },
      { name: 'Fish and Chips', description: 'Beer-battered cod with crispy fries', price: 16.99, category: 'Main Courses' },
      { name: 'BBQ Ribs', description: 'Fall-off-the-bone pork ribs with BBQ sauce', price: 22.99, category: 'Main Courses' },
      { name: 'Pasta Carbonara', description: 'Creamy pasta with bacon and parmesan', price: 17.99, category: 'Main Courses' },
      
      // Beverages
      { name: 'Coca Cola', description: 'Classic cola drink', price: 2.99, category: 'Beverages' },
      { name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice', price: 4.99, category: 'Beverages' },
      { name: 'Coffee', description: 'Freshly brewed coffee', price: 3.99, category: 'Beverages' },
      { name: 'Iced Tea', description: 'Refreshing iced tea', price: 2.99, category: 'Beverages' },
      { name: 'Craft Beer', description: 'Local craft beer selection', price: 6.99, category: 'Beverages' },
      
      // Desserts
      { name: 'Chocolate Cake', description: 'Rich chocolate layer cake', price: 7.99, category: 'Desserts' },
      { name: 'Tiramisu', description: 'Classic Italian dessert', price: 8.99, category: 'Desserts' },
      { name: 'Ice Cream Sundae', description: 'Vanilla ice cream with toppings', price: 6.99, category: 'Desserts' },
      { name: 'Cheesecake', description: 'New York style cheesecake', price: 8.99, category: 'Desserts' },
      
      // Salads
      { name: 'Caesar Salad', description: 'Romaine lettuce with Caesar dressing and croutons', price: 11.99, category: 'Salads' },
      { name: 'Garden Salad', description: 'Mixed greens with vegetables and vinaigrette', price: 9.99, category: 'Salads' },
      { name: 'Cobb Salad', description: 'Mixed greens with chicken, bacon, and blue cheese', price: 13.99, category: 'Salads' },
    ];

    for (const itemData of menuItemData) {
      const category = categories.find((c: any) => c.name === itemData.category);
      if (category) {
        let menuItem: any = await menuItemsService.create({
          name: itemData.name,
          description: itemData.description,
          price: itemData.price,
          categoryId: category._id.toString(),
          companyId: company._id.toString(),
          branchId: branch._id.toString(),
          isAvailable: true,
          preparationTime: Math.floor(Math.random() * 20) + 5, // 5-25 minutes
          ingredients: [
            { ingredientId: new Types.ObjectId().toString(), quantity: 1, unit: 'piece' },
            { ingredientId: new Types.ObjectId().toString(), quantity: 2, unit: 'tbsp' },
          ],
        });

        if (menuItem && menuItem.toObject) {
          menuItem = menuItem.toObject();
        }
        menuItems.push(menuItem);
        console.log(`✅ Menu item "${itemData.name}" created - $${itemData.price}`);
      }
    }

    // 6. Create tables
    console.log('🪑 Creating tables...');
    const tables = [];
    for (let i = 1; i <= 12; i++) {
      let table: any = await tablesService.create({
        tableNumber: `T-${i.toString().padStart(2, '0')}`,
        capacity: Math.floor(Math.random() * 6) + 2, // 2-8 people
        branchId: branch._id.toString(),
        location: i <= 4 ? 'Main Dining' : i <= 8 ? 'Patio' : 'Private Room',
      });

      if (table && table.toObject) {
        table = table.toObject();
      }
      tables.push(table);
      console.log(`✅ Table T-${i.toString().padStart(2, '0')} created (${table.capacity} seats, ${table.location})`);
    }

    // 7. Create some sample POS orders with real data
    console.log('📋 Creating sample POS orders...');
    const orders = [];
    
    for (let i = 1; i <= 8; i++) {
      const randomTable = tables[Math.floor(Math.random() * tables.length)];
      const randomItems = [];
      const itemCount = Math.floor(Math.random() * 4) + 1; // 1-4 items per order
      
      for (let j = 0; j < itemCount; j++) {
        const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        randomItems.push({
          menuItemId: randomItem._id.toString(),
          quantity: quantity,
          price: randomItem.price,
        });
      }

      const subtotal = randomItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.085; // 8.5% tax
      const total = subtotal + tax;

      const orderData = {
        orderType: 'dine-in' as const,
        tableId: randomTable._id.toString(),
        items: randomItems,
        totalAmount: total,
        status: i <= 5 ? 'paid' : 'pending',
        customerInfo: {
          name: `Customer ${i}`,
          phone: `+1234567${String(i).padStart(3, '0')}`,
          email: `customer${i}@restaurant.com`,
        },
      };

      try {
        const order: any = await posService.createOrder(orderData, user._id.toString(), branch._id.toString());
        orders.push(order);
        console.log(`✅ Order ${i} created: ${order.orderNumber} - $${order.totalAmount.toFixed(2)} - ${order.status}`);
      } catch (error) {
        console.log(`❌ Order ${i} failed:`, error.message);
      }
    }

    console.log('\n🎉 POS System populated successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Company: ${company.name}`);
    console.log(`   - Branch: ${branch.name}`);
    console.log(`   - User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Menu Items: ${menuItems.length}`);
    console.log(`   - Tables: ${tables.length}`);
    console.log(`   - Orders: ${orders.length}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: pos@restaurant.com');
    console.log('   Password: password123');
    console.log('   PIN: 1234');
    
    console.log('\n📱 Your POS System is now ready to use!');
    console.log('   - Go to POS System page');
    console.log('   - Select a table');
    console.log('   - Browse menu items by category');
    console.log('   - Add items to cart and create orders');

  } catch (error) {
    console.error('❌ Error populating POS system:', error);
  } finally {
    await app.close();
  }
}

populatePOSSystem()
  .then(() => {
    console.log('✅ POS System population completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ POS System population failed:', error);
    process.exit(1);
  });
