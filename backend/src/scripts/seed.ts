import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserRole } from '../common/enums/user-role.enum';
import { BranchesService } from '../modules/branches/branches.service';
import { CategoriesService } from '../modules/categories/categories.service';
import { CompaniesService } from '../modules/companies/companies.service';
import { CustomersService } from '../modules/customers/customers.service';
import { IngredientsService } from '../modules/ingredients/ingredients.service';
import { MenuItemsService } from '../modules/menu-items/menu-items.service';
import { TablesService } from '../modules/tables/tables.service';
import { UsersService } from '../modules/users/users.service';

async function seed() {
  console.log('🌱 Starting database seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);
    const menuItemsService = app.get(MenuItemsService);
    const categoriesService = app.get(CategoriesService);
    const tablesService = app.get(TablesService);
    const ingredientsService = app.get(IngredientsService);
    const customersService = app.get(CustomersService);
    const companiesService = app.get(CompaniesService);
    const branchesService = app.get(BranchesService);

    // 1. Create Owner User first (required for company)
    console.log('👤 Creating owner user...');
    
    const ownerUser = await usersService.create({
      email: 'owner@restaurant.com',
      password: 'Password123!', // Plain password - service will hash it
      firstName: 'Owner',
      lastName: 'Restaurant',
      role: UserRole.OWNER,
    } as any);
    console.log('✅ Owner user created: owner@restaurant.com / Password123!');

    // 2. Create Company
    console.log('🏢 Creating company...');
    const company = await companiesService.create({
      name: 'Demo Restaurant Group',
      email: 'info@demorestaurant.com',
      phone: '+1-555-0100',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
      // @ts-ignore
      ownerId: ownerUser._id.toString(),
      isActive: true,
    } as any);
    console.log('✅ Company created');

    // 3. Create Branch
    console.log('🏪 Creating branch...');
    // @ts-ignore
    const branch = await branchesService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      name: 'Main Branch',
      email: 'main@demorestaurant.com',
      phone: '+1-555-0101',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
      isActive: true,
    } as any);
    console.log('✅ Branch created');

    // 4. Create Additional Users
    console.log('\n👤 Creating additional users...');
    
    const adminUser = await usersService.create({
      email: 'admin@restaurant.com',
      password: 'Password123!', // Plain password - service will hash it
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.SUPER_ADMIN,
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
    } as any);
    console.log('✅ Admin user created: admin@restaurant.com / Password123!');

    const managerUser = await usersService.create({
      email: 'manager@restaurant.com',
      password: 'Password123!', // Plain password - service will hash it
      firstName: 'Manager',
      lastName: 'Smith',
      role: UserRole.MANAGER,
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
    } as any);
    console.log('✅ Manager user created: manager@restaurant.com / Password123!');

    const waiterUser = await usersService.create({
      email: 'waiter@restaurant.com',
      password: 'Password123!', // Plain password - service will hash it
      firstName: 'Sarah',
      lastName: 'Waiter',
      role: UserRole.WAITER,
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
    } as any);
    console.log('✅ Waiter user created: waiter@restaurant.com / Password123!');

    const chefUser = await usersService.create({
      email: 'chef@restaurant.com',
      password: 'Password123!', // Plain password - service will hash it
      firstName: 'Gordon',
      lastName: 'Chef',
      role: UserRole.CHEF,
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
    } as any);
    console.log('✅ Chef user created: chef@restaurant.com / Password123!');

    // 5. Create Menu Categories
    console.log('\n🍽️  Creating menu categories...');
    
    const appetizers = await categoriesService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Appetizers',
      description: 'Start your meal right',
      isActive: true,
      sortOrder: 1,
    } as any);

    const mainCourses = await categoriesService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Main Courses',
      description: 'Hearty main dishes',
      isActive: true,
      sortOrder: 2,
    } as any);

    const desserts = await categoriesService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Desserts',
      description: 'Sweet endings',
      isActive: true,
      sortOrder: 3,
    } as any);

    const beverages = await categoriesService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Beverages',
      description: 'Refreshing drinks',
      isActive: true,
      sortOrder: 4,
    } as any);
    console.log('✅ Created 4 menu categories');

    // 6. Create Menu Items
    console.log('🍔 Creating menu items...');
    
    // Appetizers
    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with Caesar dressing and croutons',
      // @ts-ignore
      categoryId: appetizers._id.toString(),
      price: 8.99,
      cost: 3.50,
      preparationTime: 10,
      isAvailable: true,
      isVegetarian: true,
      calories: 350,
      allergens: ['dairy', 'gluten'],
      image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1',
    } as any);

    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Chicken Wings',
      description: 'Crispy wings with your choice of sauce',
      // @ts-ignore
      categoryId: appetizers._id.toString(),
      price: 12.99,
      cost: 5.00,
      preparationTime: 15,
      isAvailable: true,
      spicyLevel: 'medium',
      calories: 650,
      allergens: ['dairy'],
      image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7',
    } as any);

    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Bruschetta',
      description: 'Toasted bread topped with tomatoes, garlic, and basil',
      // @ts-ignore
      categoryId: appetizers._id.toString(),
      price: 9.99,
      cost: 3.00,
      preparationTime: 8,
      isAvailable: true,
      isVegetarian: true,
      isVegan: true,
      calories: 280,
      allergens: ['gluten'],
      image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f',
    } as any);

    // Main Courses
    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Grilled Salmon',
      description: 'Fresh Atlantic salmon with vegetables and lemon butter',
      // @ts-ignore
      categoryId: mainCourses._id.toString(),
      price: 24.99,
      cost: 10.00,
      preparationTime: 25,
      isAvailable: true,
      isGlutenFree: true,
      calories: 580,
      allergens: ['fish'],
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
    } as any);

    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Beef Burger',
      description: 'Angus beef patty with lettuce, tomato, and special sauce',
      // @ts-ignore
      categoryId: mainCourses._id.toString(),
      price: 16.99,
      cost: 6.50,
      preparationTime: 20,
      isAvailable: true,
      calories: 820,
      allergens: ['gluten', 'dairy'],
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    } as any);

    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce, mozzarella, and basil',
      // @ts-ignore
      categoryId: mainCourses._id.toString(),
      price: 14.99,
      cost: 5.00,
      preparationTime: 18,
      isAvailable: true,
      isVegetarian: true,
      calories: 950,
      allergens: ['gluten', 'dairy'],
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
    } as any);

    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Chicken Pasta Alfredo',
      description: 'Fettuccine pasta with grilled chicken in creamy Alfredo sauce',
      // @ts-ignore
      categoryId: mainCourses._id.toString(),
      price: 18.99,
      cost: 7.00,
      preparationTime: 22,
      isAvailable: true,
      calories: 1050,
      allergens: ['gluten', 'dairy'],
      image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9',
    } as any);

    // Desserts
    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Chocolate Lava Cake',
      description: 'Warm chocolate cake with molten center and vanilla ice cream',
      // @ts-ignore
      categoryId: desserts._id.toString(),
      price: 8.99,
      cost: 3.00,
      preparationTime: 12,
      isAvailable: true,
      isVegetarian: true,
      calories: 650,
      allergens: ['dairy', 'gluten', 'eggs'],
      image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51',
    } as any);

    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Tiramisu',
      description: 'Classic Italian dessert with coffee and mascarpone',
      // @ts-ignore
      categoryId: desserts._id.toString(),
      price: 7.99,
      cost: 2.50,
      preparationTime: 5,
      isAvailable: true,
      isVegetarian: true,
      calories: 480,
      allergens: ['dairy', 'gluten', 'eggs'],
      image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9',
    } as any);

    // Beverages
    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Fresh Orange Juice',
      description: 'Freshly squeezed orange juice',
      // @ts-ignore
      categoryId: beverages._id.toString(),
      price: 4.99,
      cost: 1.50,
      preparationTime: 5,
      isAvailable: true,
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      calories: 120,
      image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba',
    } as any);

    await menuItemsService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      // @ts-ignore
      branchId: branch._id.toString(),
      name: 'Iced Coffee',
      description: 'Cold brew coffee served over ice',
      // @ts-ignore
      categoryId: beverages._id.toString(),
      price: 3.99,
      cost: 1.00,
      preparationTime: 3,
      isAvailable: true,
      isVegetarian: true,
      isGlutenFree: true,
      calories: 80,
      image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7',
    } as any);

    console.log('✅ Created 12 menu items across 4 categories');

    // 7. Create Tables
    console.log('\n🪑 Creating tables...');
    const tableData = [
      { tableNumber: 'T1', capacity: 2, location: 'Window', status: 'available' as const },
      { tableNumber: 'T2', capacity: 2, location: 'Window', status: 'available' as const },
      { tableNumber: 'T3', capacity: 4, location: 'Main Hall', status: 'available' as const },
      { tableNumber: 'T4', capacity: 4, location: 'Main Hall', status: 'available' as const },
      { tableNumber: 'T5', capacity: 6, location: 'Main Hall', status: 'available' as const },
      { tableNumber: 'T6', capacity: 4, location: 'Patio', status: 'available' as const },
      { tableNumber: 'T7', capacity: 2, location: 'Patio', status: 'available' as const },
      { tableNumber: 'T8', capacity: 8, location: 'Private Room', status: 'available' as const },
    ];

    for (const table of tableData) {
      await tablesService.create({
        // @ts-ignore
        branchId: branch._id.toString(),
        ...table,
      });
    }
    console.log('✅ Created 8 tables');

    // 8. Create Ingredients
    console.log('\n📦 Creating inventory ingredients...');
    const ingredients = [
      { name: 'Chicken Breast', category: 'food', unit: 'kg', currentStock: 25, minimumStock: 10, maximumStock: 50, unitCost: 8.50 },
      { name: 'Salmon Fillet', category: 'food', unit: 'kg', currentStock: 15, minimumStock: 5, maximumStock: 30, unitCost: 18.00 },
      { name: 'Ground Beef', category: 'food', unit: 'kg', currentStock: 30, minimumStock: 15, maximumStock: 60, unitCost: 9.00 },
      { name: 'Mozzarella Cheese', category: 'food', unit: 'kg', currentStock: 20, minimumStock: 10, maximumStock: 40, unitCost: 12.00 },
      { name: 'Tomatoes', category: 'food', unit: 'kg', currentStock: 40, minimumStock: 20, maximumStock: 80, unitCost: 3.50 },
      { name: 'Lettuce', category: 'food', unit: 'kg', currentStock: 15, minimumStock: 10, maximumStock: 30, unitCost: 2.50 },
      { name: 'Pasta', category: 'food', unit: 'kg', currentStock: 50, minimumStock: 20, maximumStock: 100, unitCost: 2.00 },
      { name: 'Pizza Dough', category: 'food', unit: 'kg', currentStock: 30, minimumStock: 15, maximumStock: 60, unitCost: 1.50 },
      { name: 'Olive Oil', category: 'food', unit: 'l', currentStock: 25, minimumStock: 10, maximumStock: 50, unitCost: 8.00 },
      { name: 'Coffee Beans', category: 'beverage', unit: 'kg', currentStock: 10, minimumStock: 5, maximumStock: 20, unitCost: 15.00 },
    ];

    for (const ingredient of ingredients) {
      await ingredientsService.create({
        // @ts-ignore
        companyId: company._id.toString(),
        // @ts-ignore
        branchId: branch._id.toString(),
        ...ingredient,
      } as any);
    }
    console.log('✅ Created 10 inventory ingredients');

    // 9. Create Customers
    console.log('\n👥 Creating customers...');
    await customersService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@email.com',
      phone: '+1-555-0201',
    });

    await customersService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      firstName: 'Emma',
      lastName: 'Johnson',
      email: 'emma.j@email.com',
      phone: '+1-555-0202',
      dietaryRestrictions: ['vegetarian'],
    });

    await customersService.create({
      // @ts-ignore
      companyId: company._id.toString(),
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael.brown@email.com',
      phone: '+1-555-0203',
    });

    console.log('✅ Created 3 customers');

    console.log('\n✨ Seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Owner:   owner@restaurant.com / Password123!');
    console.log('Admin:   admin@restaurant.com / Password123!');
    console.log('Manager: manager@restaurant.com / Password123!');
    console.log('Waiter:  waiter@restaurant.com / Password123!');
    console.log('Chef:    chef@restaurant.com / Password123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seed()
  .then(() => {
    console.log('👋 Seeding process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
