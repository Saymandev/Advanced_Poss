import { NestFactory } from '@nestjs/core';
import { Types } from 'mongoose';
import { AppModule } from '../app.module';
import { POSService } from '../modules/pos/pos.service';

async function createBasicPOSData() {
  console.log('🌱 Creating basic POS test data...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const posService = app.get(POSService);

  try {
    // Create multiple simple orders with different statuses
    const orders = [];
    
    for (let i = 1; i <= 10; i++) {
      const orderData = {
        orderType: 'dine-in' as const,
        tableId: new Types.ObjectId().toString(),
        items: [{
          menuItemId: new Types.ObjectId().toString(),
          quantity: Math.floor(Math.random() * 3) + 1,
          price: 15.99 + (Math.random() * 20), // Random price between 15.99 and 35.99
        }],
        totalAmount: (15.99 + (Math.random() * 20)) * (Math.floor(Math.random() * 3) + 1),
        status: i <= 6 ? 'paid' : 'pending',
        customerInfo: {
          name: `Customer ${i}`,
          phone: `+1234567${String(i).padStart(3, '0')}`,
          email: `customer${i}@test.com`,
        },
      };

      const userId = new Types.ObjectId().toString();
      const branchId = new Types.ObjectId().toString();

      try {
        const order = await posService.createOrder(orderData, userId, branchId);
        orders.push(order);
        console.log(`✅ Order ${i} created: ${(order as any).orderNumber} - $${(order as any).totalAmount} - ${(order as any).status}`);
      } catch (error) {
        console.log(`❌ Order ${i} failed:`, error.message);
      }
    }

    console.log('\n🎉 Basic POS test data created!');
    console.log(`📊 Created ${orders.length} orders`);
    console.log(`   - Paid orders: ${orders.filter(o => (o as any).status === 'paid').length}`);
    console.log(`   - Pending orders: ${orders.filter(o => (o as any).status === 'pending').length}`);
    
    console.log('\n📱 You can now test the POS Reports page!');

  } catch (error) {
    console.error('❌ Error creating POS test data:', error);
  } finally {
    await app.close();
  }
}

createBasicPOSData()
  .then(() => {
    console.log('✅ Basic POS data creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Basic POS data creation failed:', error);
    process.exit(1);
  });
