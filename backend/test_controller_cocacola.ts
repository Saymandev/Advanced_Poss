import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ReviewsService } from './src/modules/reviews/reviews.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const reviewsService = app.get(ReviewsService);
  
  const menuItemId = '68fcf7ad6c48e90d4a9c8e53';
  const branchId = '6900908c6366914f0b372f0b';
  const companyId = '68ffaa40ac2c3e6c7abb9f2d';
  
  try {
    const reviews = await reviewsService.getItemReviews(menuItemId, branchId, companyId);
    console.log(`Found ${reviews.length} reviews from NestJS!`);
  } catch (e) {
    console.error("Error from controller:", e);
  } finally {
    await app.close();
  }
}
bootstrap();
