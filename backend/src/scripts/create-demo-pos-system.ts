import { NestFactory } from '@nestjs/core';
import { Types } from 'mongoose';
import { AppModule } from '../app.module';
import { UserRole } from '../common/enums/user-role.enum';
import { BranchesService } from '../modules/branches/branches.service';
import { CategoriesService } from '../modules/categories/categories.service';
import { CompaniesService } from '../modules/companies/companies.service';
import { CustomersService } from '../modules/customers/customers.service';
import { MenuItemsService } from '../modules/menu-items/menu-items.service';
import { OrdersService } from '../modules/orders/orders.service';
import { TablesService } from '../modules/tables/tables.service';
import { UsersService } from '../modules/users/users.service';

async function createDemoPOSSystem() {
  console.log('🎯 Creating complete demo POS system...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const companiesService = app.get(CompaniesService);
  const branchesService = app.get(BranchesService);
  const usersService = app.get(UsersService);
  const categoriesService = app.get(CategoriesService);
  const menuItemsService = app.get(MenuItemsService);
  const tablesService = app.get(TablesService);
  const customersService = app.get(CustomersService);
  const ordersService = app.get(OrdersService);

  try {
    // 1. Create or get Company
    console.log('📊 Checking company...');
    let company = await companiesService.findByEmail('demo@restaurant.com');
    
    if (!company) {
      console.log('   Creating new company...');
      company = await companiesService.create({
        name: 'Demo Restaurant',
        email: 'demo@restaurant.com',
        phone: '+1234567890',
        address: {
          street: '123 Main Street',
          city: 'Demo City',
          state: 'DC',
          country: 'USA',
          zipCode: '12345',
        },
        website: 'https://demo-restaurant.com',
        ownerId: new Types.ObjectId().toString(),
        subscriptionPlan: 'premium',
      });
      console.log(`✅ Company created: ${company.name}`);
    } else {
      console.log(`✅ Using existing company: ${company.name}`);
    }
    
    const companyId = (company as any)._id.toString();
    console.log(`   ID: ${companyId}\n`);

    // 2. Create Branch (Automatic)
    console.log('🏢 Creating branch...');
    const branch = await branchesService.create({
      companyId: companyId,
      name: 'Main Branch',
      address: {
        street: '123 Main Street',
        city: 'Demo City',
        state: 'DC',
        country: 'USA',
        zipCode: '12345',
      },
      phone: '+1234567890',
      email: 'main@restaurant.com',
    });

    const branchId = (branch as any)._id.toString();
    console.log(`✅ Branch created: ${branch.name} (${branchId})\n`);

    // 3. Create or get Users (different roles)
    console.log('👥 Checking users...');
    const usersData = [
      {
        firstName: 'John',
        lastName: 'Owner',
        email: 'owner@demo.com',
        password: 'password123',
        role: UserRole.OWNER,
        pin: '1234',
        isActive: true,
      },
      {
        firstName: 'Jane',
        lastName: 'Manager',
        email: 'manager@demo.com',
        password: 'password123',
        role: UserRole.MANAGER,
        pin: '2345',
        isActive: true,
      },
      {
        firstName: 'Mike',
        lastName: 'Chef',
        email: 'chef@demo.com',
        password: 'password123',
        role: UserRole.CHEF,
        pin: '3456',
        isActive: true,
      },
      {
        firstName: 'Sarah',
        lastName: 'Waiter',
        email: 'waiter@demo.com',
        password: 'password123',
        role: UserRole.WAITER,
        pin: '4567',
        isActive: true,
      },
      {
        firstName: 'Tom',
        lastName: 'Cashier',
        email: 'cashier@demo.com',
        password: 'password123',
        role: UserRole.CASHIER,
        pin: '5678',
        isActive: true,
      },
    ];

    for (const userData of usersData) {
      let user: any = await usersService.findByEmail(userData.email);
      
      if (!user) {
        user = await usersService.create({
          ...userData,
          companyId,
          branchId,
        });
        console.log(`   ✅ Created: ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
      } else {
        // Update existing user with companyId and branchId
        const userObjId = (user as any)._id.toString();
        try {
          // Convert string IDs to ObjectIds
          const updateData: any = {
            companyId: new Types.ObjectId(companyId),
            branchId: new Types.ObjectId(branchId),
          };
          user = await usersService.update(userObjId, updateData);
          console.log(`   ✅ Updated: ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
        } catch (error: any) {
          console.log(`   ⚠️  Exists (update failed): ${user.firstName} ${user.lastName} - ${error.message}`);
        }
      }
    }
    console.log('');

    // 4. Create Categories
    console.log('📂 Creating categories...');
    const categoriesData = [
      { name: 'Appetizers', description: 'Start your meal right', type: 'food' },
      { name: 'Main Course', description: 'Delicious main dishes', type: 'food' },
      { name: 'Desserts', description: 'Sweet endings', type: 'dessert' },
      { name: 'Drinks', description: 'Refreshing beverages', type: 'beverage' },
    ];

    const categories = [];
    for (const catData of categoriesData) {
      const category = await categoriesService.create({
        ...catData,
        companyId: companyId,
        branchId: branchId,
      });
      categories.push(category);
      console.log(`   ✅ ${category.name}`);
    }
    console.log('');

    // 5. Create Menu Items
    console.log('🍽️  Creating menu items...');
    const menuItemsData = [
      { name: 'Caesar Salad', description: 'Fresh romaine lettuce with Caesar dressing', price: 8.99, categoryId: categories[0]._id.toString() },
      { name: 'Chicken Wings', description: 'Spicy buffalo wings', price: 12.99, categoryId: categories[0]._id.toString() },
      { name: 'Grilled Salmon', description: 'Fresh salmon with vegetables', price: 24.99, categoryId: categories[1]._id.toString() },
      { name: 'Beef Steak', description: 'Prime beef steak', price: 29.99, categoryId: categories[1]._id.toString() },
      { name: 'Chocolate Cake', description: 'Rich chocolate cake', price: 6.99, categoryId: categories[2]._id.toString() },
      { name: 'Ice Cream', description: 'Vanilla ice cream', price: 4.99, categoryId: categories[2]._id.toString() },
      { name: 'Coca Cola', description: 'Cold soft drink', price: 2.99, categoryId: categories[3]._id.toString() },
      { name: 'Coffee', description: 'Hot brewed coffee', price: 3.99, categoryId: categories[3]._id.toString() },
    ];

    const menuItems = [];
    for (const itemData of menuItemsData) {
      const item = await menuItemsService.create({
        ...itemData,
        companyId,
        branchId,
        isAvailable: true,
      });
      menuItems.push(item);
      console.log(`   ✅ ${item.name} - $${item.price}`);
    }
    console.log('');

    // 6. Create Tables
    console.log('🪑 Creating tables...');
    for (let i = 1; i <= 10; i++) {
      await tablesService.create({
        tableNumber: `T-${i.toString().padStart(2, '0')}`,
        capacity: i <= 3 ? 2 : i <= 6 ? 4 : 6,
        branchId,
        location: i <= 5 ? 'Indoor' : 'Outdoor',
      });
      console.log(`   ✅ Table ${i}`);
    }
    console.log('');

    // 7. Create Customers (skip if duplicate)
    console.log('👤 Creating customers...');
    const customersData = [
      { firstName: 'Alice', lastName: 'Johnson', phone: '+1111111111', email: 'alice@email.com' },
      { firstName: 'Bob', lastName: 'Smith', phone: '+2222222222', email: 'bob@email.com' },
      { firstName: 'Charlie', lastName: 'Brown', phone: '+3333333333', email: 'charlie@email.com' },
    ];

    const customers: any[] = [];
    for (const customerData of customersData) {
      try {
        const customer = await customersService.create({
          ...customerData,
          companyId,
        });
        customers.push(customer);
        console.log(`   ✅ ${customer.firstName} ${customer.lastName}`);
      } catch (error: any) {
        if (error.code === 11000) {
          console.log(`   ✅ ${customerData.firstName} ${customerData.lastName} (exists)`);
          // Use dummy customer data for orders
          customers.push({ ...customerData, _id: new Types.ObjectId() });
        } else {
          console.log(`   ⚠️  ${customerData.firstName} ${customerData.lastName} - ${error.message}`);
        }
      }
    }
    console.log('');

    // 8. Create Sample Orders
    console.log('📦 Creating sample orders...');
    const allTables = await tablesService.findAll({ branchId });
    const firstTableId = (allTables[0] as any)._id.toString();
    const secondTableId = (allTables[1] as any)._id.toString();
    
    const orders = [
      {
        tableId: firstTableId,
        type: 'dine-in',
        items: [
          { menuItemId: menuItems[0]._id.toString(), quantity: 2, price: menuItems[0].price },
          { menuItemId: menuItems[2]._id.toString(), quantity: 1, price: menuItems[2].price },
        ],
        status: 'completed',
        paymentStatus: 'paid',
      },
      {
        tableId: secondTableId,
        type: 'dine-in',
        items: [
          { menuItemId: menuItems[3]._id.toString(), quantity: 1, price: menuItems[3].price },
          { menuItemId: menuItems[7]._id.toString(), quantity: 2, price: menuItems[7].price },
        ],
        status: 'completed',
        paymentStatus: 'paid',
      },
      {
        customerInfo: {
          name: `${customers[0].firstName} ${customers[0].lastName}`,
          phone: customers[0].phone,
          email: customers[0].email,
        },
        type: 'delivery',
        items: [
          { menuItemId: menuItems[1]._id.toString(), quantity: 1, price: menuItems[1].price },
        ],
        status: 'pending',
        paymentStatus: 'pending',
        deliveryFee: 5.00,
      },
    ];

    // Get the waiter user ID
    const waiter = await usersService.findByEmail('waiter@demo.com');
    
    for (let i = 0; i < orders.length; i++) {
      const orderData: any = {
        ...orders[i],
        branchId,
        companyId,
        waiterId: (waiter as any)._id.toString(),
      };

      if (orders[i].items) {
        orderData.items = orders[i].items.map(item => ({
          menuItemId: item.menuItemId,
          name: menuItems.find(m => m._id.toString() === item.menuItemId)?.name || 'Item',
          quantity: item.quantity,
          price: item.price,
        }));
      }

      try {
        const order = await ordersService.create(orderData);
        console.log(`   ✅ Order #${(order as any).orderNumber} - $${(order as any).total} - ${(order as any).status}`);
      } catch (error: any) {
        if (error.code === 11000) {
          console.log(`   ⚠️  Order already exists, skipping...`);
        } else {
          console.log(`   ❌ Error creating order: ${error.message}`);
        }
      }
    }
    console.log('');

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ DEMO SYSTEM CREATED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log(`\n📊 Company: ${company.name}`);
    console.log(`   Email: ${company.email}`);
    console.log(`   ID: ${companyId}`);
    console.log(`\n🏢 Branch: ${branch.name}`);
    console.log(`   ID: ${branchId}`);
    console.log(`\n👥 Users Created:`);
    console.log(`   - Owner: owner@demo.com (password123)`);
    console.log(`   - Manager: manager@demo.com (password123)`);
    console.log(`   - Chef: chef@demo.com (password123)`);
    console.log(`   - Waiter: waiter@demo.com (password123)`);
    console.log(`   - Cashier: cashier@demo.com (password123)`);
    console.log(`\n📂 Categories: ${categories.length}`);
    console.log(`🍽️  Menu Items: ${menuItems.length}`);
    console.log(`🪑 Tables: 10`);
    console.log(`👤 Customers: ${customers.length}`);
    console.log(`📦 Orders: 3`);
    console.log(`\n🎯 Login Credentials:`);
    console.log(`   Email: owner@demo.com`);
    console.log(`   Password: password123`);
    console.log(`   PIN: 1234`);
    console.log(`\n✅ System is ready for testing!`);

  } catch (error) {
    console.error('❌ Error creating demo system:', error);
  } finally {
    await app.close();
  }
}

createDemoPOSSystem()
  .then(() => {
    console.log('\n✅ Demo system creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

