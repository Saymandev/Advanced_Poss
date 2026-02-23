/**
 * Migration: Seed/fix default POS payment methods for existing companies.
 *
 * - Creates missing methods (cash, bkash, nagad, card) per company
 * - Patches existing ones to set allowsPartialPayment: true (root cause fix)
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-pos-payment-methods.ts
 */

import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { Company } from '../modules/companies/schemas/company.schema';
import { PaymentMethod } from '../modules/payment-methods/schemas/payment-method.schema';

// Same as companies.service.ts create() — with allowsPartialPayment: true
const DEFAULT_METHODS = [
  { name: 'Cash',  code: 'cash',  type: 'cash',         sortOrder: 1, allowsPartialPayment: true, allowsChangeDue: true  },
  { name: 'Bkash', code: 'bkash', type: 'mobile_wallet', sortOrder: 2, allowsPartialPayment: true, allowsChangeDue: false },
  { name: 'Nagad', code: 'nagad', type: 'mobile_wallet', sortOrder: 3, allowsPartialPayment: true, allowsChangeDue: false },
  { name: 'Card',  code: 'card',  type: 'card',          sortOrder: 4, allowsPartialPayment: true, allowsChangeDue: false },
];

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const companyModel = app.get<Model<Company>>(getModelToken(Company.name));
  const paymentMethodModel = app.get<Model<PaymentMethod>>(getModelToken(PaymentMethod.name));

  const companies = await companyModel.find({}).select('_id name').lean();
  console.log(`Found ${companies.length} companies to process.\n`);

  for (const company of companies) {
    const companyId = (company as any)._id;
    console.log(`Processing: ${company.name} (${companyId})`);

    for (const method of DEFAULT_METHODS) {
      const exists = await paymentMethodModel.findOne({ code: method.code, companyId });
      if (!exists) {
        await paymentMethodModel.create({ ...method, companyId, currentBalance: 0, isActive: true });
        console.log(`  ✅ Created: ${method.name}`);
      } else {
        // Patch existing record if allowsPartialPayment is not set
        if (!exists.allowsPartialPayment) {
          await paymentMethodModel.updateOne(
            { _id: exists._id },
            { $set: { allowsPartialPayment: true, allowsChangeDue: method.allowsChangeDue } },
          );
          console.log(`  🔧 Patched allowsPartialPayment: ${method.name}`);
        } else {
          console.log(`  ⏭  OK: ${method.name}`);
        }
      }
    }
  }

  console.log('\n🎉 Done.');
  await app.close();
}

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
