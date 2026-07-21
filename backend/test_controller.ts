import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PublicController } from './src/modules/public/public.controller';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const publicController = app.get(PublicController);
  
  const companySlug = 'rahpos';
  const branchSlug = 'dhaka';
  const productId = '6a3d59f5585cfa47bfe933ce';
  
  try {
    const result = await publicController.getProductReviews(companySlug, branchSlug, productId);
    console.log(`Success: ${result.success}`);
    console.log(`Data length: ${result.data?.length}`);
  } catch (e) {
    console.error("Error from controller:", e);
  } finally {
    await app.close();
  }
}
bootstrap();
