import { connect } from 'mongoose';
import { RolePermission } from './backend/src/modules/role-permissions/schemas/role-permission.schema';

async function check() {
  const conn = await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/raha_pos');
  const db = conn.connection.db;
  
  const ownerRoles = await db.collection('rolepermissions').find({ role: 'owner' }).toArray();
  const withoutAi = ownerRoles.filter(r => !r.features?.includes('ai-shift-analysis'));
  
  console.log(`Total owners: ${ownerRoles.length}`);
  console.log(`Owners without ai-shift-analysis: ${withoutAi.length}`);
  
  if (withoutAi.length > 0) {
    console.log('Sample without AI:', withoutAi[0]._id, withoutAi[0].companyId);
  }
  
  await conn.disconnect();
}
check().catch(console.error);
