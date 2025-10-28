import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TablesService } from '../modules/tables/tables.service';

async function createTables() {
  console.log('🪑 CREATING TABLES FOR CURRENT BRANCH...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const tablesService = app.get(TablesService);

  try {
    const branchId = '6900908c6366914f0b372f0b';
    
    console.log(`📊 Branch ID: ${branchId}\n`);
    console.log('Creating 10 tables...\n');
    
    for (let i = 1; i <= 10; i++) {
      try {
        const table = await tablesService.create({
          tableNumber: `T-${i.toString().padStart(2, '0')}`,
          capacity: i <= 3 ? 2 : i <= 6 ? 4 : 6,
          branchId,
          location: i <= 5 ? 'Indoor' : 'Outdoor',
          status: 'available',
        } as any);
        console.log(`  ✅ ${table.tableNumber} - Capacity: ${table.capacity} - Location: ${table.location}`);
      } catch (error: any) {
        if (error.code === 11000) {
          console.log(`  ⚠️  T-${i.toString().padStart(2, '0')} already exists, skipping`);
        } else {
          console.log(`  ❌ T-${i.toString().padStart(2, '0')}: ${error.message}`);
        }
      }
    }
    
    // Verify
    const tables = await tablesService.findByBranch(branchId);
    console.log(`\n✅ Created ${tables.length} tables total\n`);
    
    if (tables.length > 0) {
      console.log('Tables:');
      tables.forEach((t: any) => {
        console.log(`  - ${t.tableNumber}: ${t.capacity} seats, ${t.status}, ${t.location}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

createTables()
  .then(() => {
    console.log('\n✅ DONE - REFRESH TABLES PAGE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

