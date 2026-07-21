import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ReviewsService } from './src/modules/reviews/reviews.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const reviewsService = app.get(ReviewsService);
  
  const menuItemId = '6a3d59f5585cfa47bfe933ce';
  const branchId = '6a37fa7a289b39650e480485';
  const companyId = '6a37fa7a289b39650e480471';
  
  try {
    const reviews = await reviewsService.getItemReviews(menuItemId, branchId, companyId);
    console.log(`Found ${reviews.length} reviews from NestJS!`);
  } catch (e) {
    console.error(e);
  } finally {
    await app.close();
  }
}
bootstrap();
