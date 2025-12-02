import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { GalleryController } from './gallery.controller';
import { GalleryService } from './gallery.service';
import { Gallery, GallerySchema } from './schemas/gallery.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Gallery.name, schema: GallerySchema },
    ]),
  ],
  controllers: [GalleryController],
  providers: [GalleryService, CloudinaryService],
  exports: [GalleryService],
})
export class GalleryModule {}

