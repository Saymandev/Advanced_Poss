import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { ContentPage, ContentPageSchema } from './schemas/content-page.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContentPage.name, schema: ContentPageSchema },
    ]),
  ],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}

