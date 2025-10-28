import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BranchesService } from '../modules/branches/branches.service';
import { MenuItemsService } from '../modules/menu-items/menu-items.service';

async function checkMenuItems() {
  console.log('🔍 CHECKING MENU ITEMS...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const menuItemsService = app.get(MenuItemsService);
  const branchesService = app.get(BranchesService);

  try {
    // Get the latest branch
    const companyId = '68ffaa40ac2c3e6c7abb9f2d';
    const branches = await branchesService.findByCompany(companyId);
    const latestBranch = branches[branches.length - 1];
    const branchId = (latestBranch as any)._id.toString();
    
    console.log(`📊 Company ID: ${companyId}`);
    console.log(`🏢 Branch: ${latestBranch.name} (${branchId})\n`);
    
    // Check menu items for this branch
    const result = await menuItemsService.findAll({
      branchId: branchId,
      page: 1,
      limit: 100,
    } as any);
    
    console.log(`✅ Found ${result.menuItems.length} menu items for this branch\n`);
    
    if (result.menuItems.length > 0) {
      for (const item of result.menuItems) {
        const itemId = (item as any)._id.toString();
        console.log(`  - ${item.name} (${itemId}) - $${item.price}`);
        console.log(`    BranchId: ${(item as any).branchId}`);
      }
    } else {
      console.log('❌ NO MENU ITEMS FOUND!');
      console.log('\n🔍 Checking ALL menu items...\n');
      
      // Check all menu items
      const allResult = await menuItemsService.findAll({
        page: 1,
        limit: 100,
      } as any);
      
      console.log(`Total menu items in database: ${allResult.menuItems.length}\n`);
      
      if (allResult.menuItems.length > 0) {
        for (const item of allResult.menuItems) {
          const itemId = (item as any)._id.toString();
          const itemBranchId = (item as any).branchId?.toString() || 'NONE';
          console.log(`  - ${item.name} (${itemId})`);
          console.log(`    BranchId: ${itemBranchId}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

checkMenuItems()
  .then(() => {
    console.log('\n✅ DONE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

