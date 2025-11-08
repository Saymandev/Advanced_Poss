import { NestFactory } from '@nestjs/core';
import { Types } from 'mongoose';
import { AppModule } from '../app.module';
import { POSService } from '../modules/pos/pos.service';

async function createSimplePOSData() {
  console.log('🌱 Creating simple POS test data...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const posService = app.get(POSService);

  try {
    // Create a simple order with minimal data
    const orderData = {
      orderType: 'dine-in' as const,
      tableId: new Types.ObjectId().toString(), // Use a random table ID
      items: [{
        menuItemId: new Types.ObjectId().toString(), // Use a random menu item ID
        quantity: 2,
        price: 15.99,
      }],
      totalAmount: 31.98,
      status: 'pending' as const,
      customerInfo: {
        name: 'Test Customer',
        phone: '+1234567890',
        email: 'test@example.com',
      },
    };

    const userId = new Types.ObjectId().toString(); // Use a random user ID
    const branchId = new Types.ObjectId().toString(); // Use a random branch ID

    console.log('Creating test order...');
    const order = await posService.createOrder(orderData, userId, branchId);
    console.log('✅ Test order created:', order);

  } catch (error) {
    console.error('❌ Error creating POS test data:', error.message);
  } finally {
    await app.close();
  }
}

createSimplePOSData()
  .then(() => {
    console.log('✅ Simple POS data creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Simple POS data creation failed:', error);
    process.exit(1);
  });
