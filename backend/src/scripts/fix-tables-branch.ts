import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BranchesService } from '../modules/branches/branches.service';
import { TablesService } from '../modules/tables/tables.service';

async function fixTablesBranch() {
  console.log('🔧 FIXING TABLES BRANCH ASSOCIATION...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const tablesService = app.get(TablesService);
  const branchesService = app.get(BranchesService);

  try {
    // Get the latest branch for demo restaurant
    const companyId = '68ffaa40ac2c3e6c7abb9f2d';
    const branches = await branchesService.findByCompany(companyId);
    const latestBranch = branches[branches.length - 1];
    const targetBranchId = (latestBranch as any)._id.toString();
    
    console.log(`📊 Company ID: ${companyId}`);
    console.log(`🏢 Target Branch: ${latestBranch.name} (${targetBranchId})\n`);
    
    // Get ALL tables for this company (check all branches)
    const allTables: any[] = [];
    for (const branch of branches) {
      const branchId = (branch as any)._id.toString();
      const tables = await tablesService.findByBranch(branchId);
      allTables.push(...tables);
      if (tables.length > 0) {
        console.log(`Found ${tables.length} tables in branch: ${branch.name} (${branchId})`);
      }
    }
    
    console.log(`\nTotal tables found: ${allTables.length}\n`);
    
    // Update tables to target branch
    let updated = 0;
    for (const table of allTables) {
      try {
        const tableId = (table as any)._id.toString();
        await tablesService.update(tableId, {
          branchId: targetBranchId,
        } as any);
        console.log(`  ✅ Updated: ${table.tableNumber} → Branch: ${targetBranchId}`);
        updated++;
      } catch (error: any) {
        console.log(`  ⚠️  ${table.tableNumber}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Updated ${updated} tables\n`);
    
    // Verify
    const result = await tablesService.findByBranch(targetBranchId);
    
    console.log('='.repeat(60));
    console.log(`VERIFICATION: ${result.length} tables in branch\n`);
    
    if (result.length > 0) {
      for (const table of result.slice(0, 10)) {
        console.log(`  ✅ ${table.tableNumber} - Capacity: ${table.capacity} - Status: ${table.status}`);
      }
      if (result.length > 10) {
        console.log(`  ... and ${result.length - 10} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

fixTablesBranch()
  .then(() => {
    console.log('\n✅ DONE - REFRESH TABLES PAGE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

