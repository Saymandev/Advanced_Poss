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

async function createCompletePOSData() {
  console.log('🌱 Creating complete POS test data...');

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
    console.log('📊 Creating company...');
    let company = await companiesService.findByEmail('test@restaurant.com');
    
    if (!company) {
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
        ownerId: new Types.ObjectId().toString(),
        subscriptionPlan: 'basic',
      });
    }

    // Convert to plain object
    if (company && (company as any).toObject) {
      company = (company as any).toObject();
    }

    // 2. Create or find branch
    console.log('🏢 Creating branch...');
    let branches = await branchesService.findByCompany((company as any)._id.toString());
    let branch = branches[0];
    
    if (!branch) {
      branch = await branchesService.create({
        companyId: (company as any)._id.toString(),
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
      });
    }

    // Convert to plain object
    if (branch && (branch as any).toObject) {
      branch = (branch as any).toObject();
    }

    // 3. Create test user
    console.log('👤 Creating test user...');
    let user: any = await usersService.findByEmail('test@restaurant.com');
    
    if (!user) {
      user = await usersService.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@restaurant.com',
        password: 'password123',
        role: UserRole.OWNER,
        companyId: (company as any)._id.toString(),
        branchId: (branch as any)._id.toString(),
        pin: '1234',
        phone: '+1234567890',
      });
    }

    // Convert to plain object
    if (user && user.toObject) {
      user = user.toObject();
    }

    // 4. Create category
    console.log('📂 Creating category...');
    let categories = await categoriesService.findByBranch((branch as any)._id.toString());
    let category = categories.find((c: any) => c.name === 'Test Category');
    
    if (!category) {
      category = await categoriesService.create({
        name: 'Test Category',
        description: 'Test category for POS',
        companyId: (company as any)._id.toString(),
        branchId: (branch as any)._id.toString(),
        type: 'food',
      });
    }

    // Convert to plain object
    if (category && (category as any).toObject) {
      category = (category as any).toObject();
    }

    // 5. Create menu item
    console.log('🍽️ Creating menu item...');
    let menuItem = await menuItemsService.create({
      name: 'Test Burger',
      description: 'Delicious test burger',
      price: 15.99,
      categoryId: (category as any)._id.toString(),
      companyId: (company as any)._id.toString(),
      branchId: (branch as any)._id.toString(),
      isAvailable: true,
      preparationTime: 15,
      ingredients: [
        { ingredientId: new Types.ObjectId().toString(), quantity: 1, unit: 'piece' },
        { ingredientId: new Types.ObjectId().toString(), quantity: 2, unit: 'slice' },
      ],
    });

    // Convert to plain object
    if (menuItem && (menuItem as any).toObject) {
      menuItem = (menuItem as any).toObject();
    }

    // 6. Create table
    console.log('🪑 Creating table...');
    let table = await tablesService.create({
      tableNumber: 'T-001',
      capacity: 4,
      branchId: (branch as any)._id.toString(),
      location: 'Main Area',
    });

    // Convert to plain object
    if (table && (table as any).toObject) {
      table = (table as any).toObject();
    }

    // 7. Create POS orders
    console.log('📋 Creating POS orders...');
    const orders = [];
    
    for (let i = 1; i <= 5; i++) {
      const orderData = {
        orderType: 'dine-in' as const,
        tableId: (table as any)._id.toString(),
        items: [{
          menuItemId: (menuItem as any)._id.toString(),
          quantity: Math.floor(Math.random() * 3) + 1,
          price: (menuItem as any).price,
        }],
        totalAmount: (menuItem as any).price * (Math.floor(Math.random() * 3) + 1),
        status: i <= 3 ? 'paid' : 'pending',
        customerInfo: {
          name: `Customer ${i}`,
          phone: `+1234567${String(i).padStart(3, '0')}`,
          email: `customer${i}@test.com`,
        },
      };

      const order = await posService.createOrder(orderData, (user as any)._id.toString(), (branch as any)._id.toString());
      orders.push(order);
      console.log(`✅ Order ${i} created: ${(order as any).orderNumber} - $${(order as any).totalAmount}`);
    }

    console.log('\n🎉 Complete POS test data created!');
    console.log(`📊 Summary:`);
    console.log(`   - Company: ${(company as any).name} (${(company as any)._id})`);
    console.log(`   - Branch: ${(branch as any).name} (${(branch as any)._id})`);
    console.log(`   - User: ${(user as any).firstName} ${(user as any).lastName} (${(user as any)._id})`);
    console.log(`   - Category: ${(category as any).name} (${(category as any)._id})`);
    console.log(`   - Menu Item: ${(menuItem as any).name} (${(menuItem as any)._id})`);
    console.log(`   - Table: ${(table as any).tableNumber} (${(table as any)._id})`);
    console.log(`   - Orders: ${orders.length} created`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: test@restaurant.com');
    console.log('   Password: password123');
    console.log('   PIN: 1234');
    
    console.log('\n📱 You can now test the POS system with real data!');

  } catch (error) {
    console.error('❌ Error creating POS test data:', error);
  } finally {
    await app.close();
  }
}

createCompletePOSData()
  .then(() => {
    console.log('✅ Complete POS data creation finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Complete POS data creation failed:', error);
    process.exit(1);
  });
