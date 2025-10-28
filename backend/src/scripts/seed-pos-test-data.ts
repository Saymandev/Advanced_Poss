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

async function seedPOSTestData() {
  console.log('🌱 Starting POS test data seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const posService = app.get(POSService);
  const menuItemsService = app.get(MenuItemsService);
  const categoriesService = app.get(CategoriesService);
  const tablesService = app.get(TablesService);
  const usersService = app.get(UsersService);
  const companiesService = app.get(CompaniesService);
  const branchesService = app.get(BranchesService);

  try {
    // 1. Create or get test company
    console.log('📊 Creating test company...');
    let company;
    try {
      const existingCompanies = await companiesService.findAll({ name: 'Test Restaurant POS' });
      company = existingCompanies[0];
      if (!company) {
        // Try to find by email
        const existingByEmail = await companiesService.findByEmail('test@restaurant.com');
        if (existingByEmail) {
          company = existingByEmail;
        } else {
          company = await companiesService.create({
            name: 'Test Restaurant POS',
            email: 'test@restaurant.com',
            phone: '+1234567890',
            address: {
              street: '123 Test Street',
              city: 'Test City',
              state: 'TC',
              country: 'Test Country',
              zipCode: '12345',
            },
            website: 'https://testrestaurant.com',
            ownerId: new Types.ObjectId().toString(), // We'll update this after creating the owner
            subscriptionPlan: 'basic',
          });
        }
      }
    } catch (error) {
      console.log('Company creation error:', error.message);
      // Try to find existing company
      try {
        const existingCompanies = await companiesService.findAll({ name: 'Test Restaurant POS' });
        company = existingCompanies[0];
        if (!company) {
          const existingByEmail = await companiesService.findByEmail('test@restaurant.com');
          company = existingByEmail;
        }
      } catch (findError) {
        console.log('Could not find existing company:', findError.message);
        throw new Error('No company found and could not create one');
      }
    }

    if (!company) {
      throw new Error('Could not find or create test company');
    }

    console.log('✅ Company found/created:', company.name, 'ID:', company._id);
    
    // Convert to plain object if it's a Mongoose document
    if (company.toObject) {
      company = company.toObject();
    }

    // 2. Create or get test branch
    console.log('🏢 Creating test branch...');
    let branch;
    try {
      const branches = await branchesService.findByCompany(company._id.toString());
      branch = branches[0];
      if (!branch) {
        branch = await branchesService.create({
          companyId: company._id.toString(),
          name: 'Main Branch',
          address: {
            street: '123 Test Street',
            city: 'Test City',
            state: 'TC',
            country: 'Test Country',
            zipCode: '12345',
          },
          phone: '+1234567890',
          email: 'main@testrestaurant.com',
          // Don't set managerId initially
        });
      }
    } catch (error) {
      console.log('Branch creation error:', error.message);
      try {
        const branches = await branchesService.findByCompany(company._id.toString());
        branch = branches[0];
      } catch (findError) {
        console.log('Could not find existing branch:', findError.message);
        throw new Error('No branch found and could not create one');
      }
    }

    if (!branch) {
      throw new Error('Could not find or create test branch');
    }

    // Convert to plain object if it's a Mongoose document
    if (branch.toObject) {
      branch = branch.toObject();
    }

    console.log('✅ Branch found/created:', branch.name, 'ID:', branch._id);

    // 3. Create test users
    console.log('👥 Creating test users...');
    const users = [];
    
    // Owner
    try {
      const owner = await usersService.create({
        firstName: 'John',
        lastName: 'Owner',
        email: 'owner@testrestaurant.com',
        password: 'password123',
        role: UserRole.OWNER,
        companyId: company._id.toString(),
        branchId: branch._id.toString(),
        pin: '1234',
        phone: '+1234567890',
      });
      users.push(owner);
      console.log('✅ Owner created');
    } catch (error) {
      console.log('Owner creation error:', error.message);
      const existingOwner = await usersService.findByEmail('owner@testrestaurant.com');
      if (existingOwner) users.push(existingOwner);
    }

    // Manager
    try {
      const manager = await usersService.create({
        firstName: 'Jane',
        lastName: 'Manager',
        email: 'manager@testrestaurant.com',
        password: 'password123',
        role: UserRole.MANAGER,
        companyId: company._id.toString(),
        branchId: branch._id.toString(),
        pin: '5678',
        phone: '+1234567891',
      });
      users.push(manager);
      console.log('✅ Manager created');
    } catch (error) {
      console.log('Manager creation error:', error.message);
      const existingManager = await usersService.findByEmail('manager@testrestaurant.com');
      if (existingManager) users.push(existingManager);
    }

    // Cashier
    try {
      const cashier = await usersService.create({
        firstName: 'Bob',
        lastName: 'Cashier',
        email: 'cashier@testrestaurant.com',
        password: 'password123',
        role: UserRole.CASHIER,
        companyId: company._id.toString(),
        branchId: branch._id.toString(),
        pin: '9999',
        phone: '+1234567892',
      });
      users.push(cashier);
      console.log('✅ Cashier created');
    } catch (error) {
      console.log('Cashier creation error:', error.message);
      const existingCashier = await usersService.findByEmail('cashier@testrestaurant.com');
      if (existingCashier) users.push(existingCashier);
    }

    // 4. Create categories
    console.log('📂 Creating categories...');
    const categories = [];
    const categoryData = [
      { name: 'Appetizers', description: 'Start your meal right', type: 'food' },
      { name: 'Main Courses', description: 'Hearty main dishes', type: 'food' },
      { name: 'Beverages', description: 'Refreshing drinks', type: 'drink' },
      { name: 'Desserts', description: 'Sweet endings', type: 'food' },
      { name: 'Salads', description: 'Fresh and healthy', type: 'food' },
    ];

    for (const catData of categoryData) {
      try {
        const category = await categoriesService.create({
          name: catData.name,
          description: catData.description,
          companyId: company._id.toString(),
          branchId: branch._id.toString(),
          type: catData.type,
        });
        categories.push(category);
        console.log(`✅ Category "${catData.name}" created`);
      } catch (error) {
        console.log(`Category "${catData.name}" creation error:`, error.message);
        const existing = await categoriesService.findByBranch(branch._id.toString());
        const found = existing.find(c => c.name === catData.name);
        if (found) categories.push(found);
      }
    }

    // 5. Create menu items
    console.log('🍽️ Creating menu items...');
    const menuItems = [];
    const menuItemData = [
      // Appetizers
      { name: 'Buffalo Wings', description: 'Spicy chicken wings with ranch dip', price: 12.99, category: 'Appetizers', isAvailable: true },
      { name: 'Mozzarella Sticks', description: 'Crispy breaded mozzarella with marinara', price: 8.99, category: 'Appetizers', isAvailable: true },
      { name: 'Nachos Supreme', description: 'Loaded nachos with cheese, jalapeños, and sour cream', price: 10.99, category: 'Appetizers', isAvailable: true },
      
      // Main Courses
      { name: 'Grilled Salmon', description: 'Fresh Atlantic salmon with lemon herb butter', price: 24.99, category: 'Main Courses', isAvailable: true },
      { name: 'Ribeye Steak', description: '12oz ribeye steak cooked to perfection', price: 32.99, category: 'Main Courses', isAvailable: true },
      { name: 'Chicken Parmesan', description: 'Breaded chicken breast with marinara and mozzarella', price: 18.99, category: 'Main Courses', isAvailable: true },
      { name: 'Fish and Chips', description: 'Beer-battered cod with crispy fries', price: 16.99, category: 'Main Courses', isAvailable: true },
      { name: 'BBQ Ribs', description: 'Fall-off-the-bone pork ribs with BBQ sauce', price: 22.99, category: 'Main Courses', isAvailable: true },
      
      // Beverages
      { name: 'Coca Cola', description: 'Classic cola drink', price: 2.99, category: 'Beverages', isAvailable: true },
      { name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice', price: 4.99, category: 'Beverages', isAvailable: true },
      { name: 'Coffee', description: 'Freshly brewed coffee', price: 3.99, category: 'Beverages', isAvailable: true },
      { name: 'Iced Tea', description: 'Refreshing iced tea', price: 2.99, category: 'Beverages', isAvailable: true },
      
      // Desserts
      { name: 'Chocolate Cake', description: 'Rich chocolate layer cake', price: 7.99, category: 'Desserts', isAvailable: true },
      { name: 'Tiramisu', description: 'Classic Italian dessert', price: 8.99, category: 'Desserts', isAvailable: true },
      { name: 'Ice Cream Sundae', description: 'Vanilla ice cream with toppings', price: 6.99, category: 'Desserts', isAvailable: true },
      
      // Salads
      { name: 'Caesar Salad', description: 'Romaine lettuce with Caesar dressing and croutons', price: 11.99, category: 'Salads', isAvailable: true },
      { name: 'Garden Salad', description: 'Mixed greens with vegetables and vinaigrette', price: 9.99, category: 'Salads', isAvailable: true },
    ];

    for (const itemData of menuItemData) {
      try {
        const category = categories.find(c => c.name === itemData.category);
        if (category) {
          const menuItem = await menuItemsService.create({
            name: itemData.name,
            description: itemData.description,
            price: itemData.price,
            categoryId: category._id.toString(),
            companyId: company._id.toString(),
            branchId: branch._id.toString(),
            isAvailable: itemData.isAvailable,
            preparationTime: Math.floor(Math.random() * 20) + 5, // 5-25 minutes
            ingredients: [
              { ingredientId: new Types.ObjectId().toString(), quantity: 1, unit: 'cup' },
              { ingredientId: new Types.ObjectId().toString(), quantity: 2, unit: 'tbsp' },
              { ingredientId: new Types.ObjectId().toString(), quantity: 1, unit: 'tsp' },
            ],
            // allergens: ['Contains gluten', 'Contains dairy'], // Remove this field
          });
          menuItems.push(menuItem);
          console.log(`✅ Menu item "${itemData.name}" created`);
        }
      } catch (error) {
        console.log(`Menu item "${itemData.name}" creation error:`, error.message);
      }
    }

    // 6. Create tables
    console.log('🪑 Creating tables...');
    const tables = [];
    for (let i = 1; i <= 10; i++) {
      try {
        const table = await tablesService.create({
          tableNumber: i.toString(),
          capacity: Math.floor(Math.random() * 6) + 2, // 2-8 people
          branchId: branch._id.toString(),
          location: `Area ${Math.floor((i - 1) / 3) + 1}`,
        });
        tables.push(table);
        console.log(`✅ Table ${i} created`);
      } catch (error) {
        console.log(`Table ${i} creation error:`, error.message);
      }
    }

    // 7. Create sample POS orders
    console.log('📋 Creating sample POS orders...');
    const sampleOrders = [];
    const orderCount = 25; // Create 25 sample orders

    for (let i = 0; i < orderCount; i++) {
      try {
        // Random table
        const randomTable = tables[Math.floor(Math.random() * tables.length)];
        
        // Random items (1-5 items per order)
        const itemCount = Math.floor(Math.random() * 5) + 1;
        const orderItems = [];
        let totalAmount = 0;

        for (let j = 0; j < itemCount; j++) {
          const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const itemTotal = randomItem.price * quantity;
          totalAmount += itemTotal;

          orderItems.push({
            menuItemId: randomItem._id,
            name: randomItem.name,
            price: randomItem.price,
            quantity: quantity,
            total: itemTotal,
            notes: Math.random() > 0.8 ? 'Special instructions' : '',
          });
        }

        // Add tax
        const taxRate = 0.085;
        const taxAmount = totalAmount * taxRate;
        const finalTotal = totalAmount + taxAmount;

        // Random status
        const statuses = ['pending', 'paid', 'cancelled'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        const order = await posService.createOrder({
          tableId: randomTable._id.toString(),
          items: orderItems,
          totalAmount: finalTotal,
          status: 'pending',
          notes: Math.random() > 0.7 ? 'Customer special request' : '',
          customerInfo: {
            name: `Customer ${i + 1}`,
            phone: `+1234567${String(i).padStart(3, '0')}`,
            email: `customer${i + 1}@test.com`,
          },
        }, users[Math.floor(Math.random() * users.length)]._id.toString(), branch._id.toString());

        // Update order status if not pending
        if (status !== 'pending') {
          try {
            await posService.updateOrder((order as any)._id.toString(), {
              status: status,
            }, users[0]._id.toString());
          } catch (error) {
            console.log(`Status update for order ${i + 1} failed:`, error.message);
          }
        }

        sampleOrders.push(order);
        console.log(`✅ Order ${i + 1} created (${status}, $${finalTotal.toFixed(2)})`);
      } catch (error) {
        console.log(`Order ${i + 1} creation error:`, error.message);
      }
    }

    console.log('\n🎉 POS test data seeding completed!');
    console.log(`📊 Created:`);
    console.log(`   - 1 Company: ${company.name}`);
    console.log(`   - 1 Branch: ${branch.name}`);
    console.log(`   - ${users.length} Users (Owner, Manager, Cashier)`);
    console.log(`   - ${categories.length} Categories`);
    console.log(`   - ${menuItems.length} Menu Items`);
    console.log(`   - ${tables.length} Tables`);
    console.log(`   - ${sampleOrders.length} Sample Orders`);
    
    console.log('\n🔑 Test Login Credentials:');
    console.log('   Owner: owner@testrestaurant.com / password123 (PIN: 1234)');
    console.log('   Manager: manager@testrestaurant.com / password123 (PIN: 5678)');
    console.log('   Cashier: cashier@testrestaurant.com / password123 (PIN: 9999)');
    
    console.log('\n📱 You can now test the POS system with real data!');

  } catch (error) {
    console.error('❌ Error seeding POS test data:', error);
  } finally {
    await app.close();
  }
}

// Run the seeding function
seedPOSTestData()
  .then(() => {
    console.log('✅ Seeding process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding process failed:', error);
    process.exit(1);
  });