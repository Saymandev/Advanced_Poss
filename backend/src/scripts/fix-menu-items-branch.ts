import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BranchesService } from '../modules/branches/branches.service';
import { MenuItemsService } from '../modules/menu-items/menu-items.service';

async function fixMenuItemsBranch() {
  console.log('🔧 FIXING MENU ITEMS BRANCH ASSOCIATION...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const menuItemsService = app.get(MenuItemsService);
  const branchesService = app.get(BranchesService);

  try {
    // Get the latest branch for demo restaurant
    const companyId = '68ffaa40ac2c3e6c7abb9f2d';
    const branches = await branchesService.findByCompany(companyId);
    const latestBranch = branches[branches.length - 1];
    const targetBranchId = (latestBranch as any)._id.toString();
    
    console.log(`📊 Company ID: ${companyId}`);
    console.log(`🏢 Target Branch: ${latestBranch.name} (${targetBranchId})\n`);
    
    // Get demo menu items by searching for specific names
    const demoItemNames = ['Caesar Salad', 'Chicken Wings', 'Grilled Salmon', 'Beef Steak', 
                           'Chocolate Cake', 'Ice Cream', 'Coca Cola', 'Coffee'];
    
    console.log('🔍 Searching for demo menu items...\n');
    
    let updated = 0;
    for (const name of demoItemNames) {
      // Find all items with this name
      const searchResult = await menuItemsService.findAll({
        search: name,
        page: 1,
        limit: 100,
      } as any);
      
      const matchingItems = searchResult.menuItems.filter((item: any) => 
        item.name.toLowerCase() === name.toLowerCase()
      );
      
      if (matchingItems.length > 0) {
        // Update the first match to target branch
        const item = matchingItems[0];
        const itemId = (item as any)._id.toString();
        
        try {
          await menuItemsService.update(itemId, {
            branchId: targetBranchId,
            companyId: companyId,
          } as any);
          console.log(`  ✅ Updated: ${item.name} → Branch: ${targetBranchId}`);
          updated++;
        } catch (error: any) {
          console.log(`  ⚠️  ${item.name}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ Updated ${updated} menu items\n`);
    
    // Verify
    const result = await menuItemsService.findAll({
      branchId: targetBranchId,
      page: 1,
      limit: 100,
    } as any);
    
    console.log('='.repeat(60));
    console.log(`VERIFICATION: ${result.menuItems.length} menu items in branch\n`);
    
    if (result.menuItems.length > 0) {
      for (const item of result.menuItems.slice(0, 10)) {
        console.log(`  ✅ ${item.name} - $${item.price}`);
      }
      if (result.menuItems.length > 10) {
        console.log(`  ... and ${result.menuItems.length - 10} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

fixMenuItemsBranch()
  .then(() => {
    console.log('\n✅ DONE - REFRESH POS PAGE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

