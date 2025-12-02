import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { Gallery, GalleryDocument } from './schemas/gallery.schema';

@Injectable()
export class GalleryService {
  constructor(
    @InjectModel(Gallery.name)
    private galleryModel: Model<GalleryDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findAll(companyId: string, isActive?: boolean): Promise<Gallery[]> {
    const query: any = { companyId: new Types.ObjectId(companyId) };
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    return this.galleryModel
      .find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
  }

  async findOne(id: string, companyId: string): Promise<Gallery> {
    const gallery = await this.galleryModel
      .findOne({
        _id: new Types.ObjectId(id),
        companyId: new Types.ObjectId(companyId),
      })
      .lean();

    if (!gallery) {
      throw new NotFoundException('Gallery image not found');
    }

    return gallery;
  }

  async create(
    companyId: string,
    file: Express.Multer.File,
    createGalleryDto: CreateGalleryDto,
  ): Promise<Gallery> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP)');
    }

    // Validate file size (max 10MB for gallery images)
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // Upload to Cloudinary
    if (!file.buffer) {
      throw new BadRequestException('File buffer is missing');
    }

    const uploadResult = await this.cloudinaryService.uploadImage(
      file.buffer,
      'gallery',
    );

    // Create gallery entry
    const gallery = new this.galleryModel({
      companyId: new Types.ObjectId(companyId),
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      caption: createGalleryDto.caption,
      description: createGalleryDto.description,
      displayOrder: createGalleryDto.displayOrder || 0,
      isActive: createGalleryDto.isActive !== undefined ? createGalleryDto.isActive : true,
    });

    return gallery.save();
  }

  async update(
    id: string,
    companyId: string,
    updateGalleryDto: UpdateGalleryDto,
  ): Promise<Gallery> {
    const gallery = await this.galleryModel.findOne({
      _id: new Types.ObjectId(id),
      companyId: new Types.ObjectId(companyId),
    });

    if (!gallery) {
      throw new NotFoundException('Gallery image not found');
    }

    Object.assign(gallery, updateGalleryDto);
    return gallery.save();
  }

  async remove(id: string, companyId: string): Promise<void> {
    const gallery = await this.galleryModel.findOne({
      _id: new Types.ObjectId(id),
      companyId: new Types.ObjectId(companyId),
    });

    if (!gallery) {
      throw new NotFoundException('Gallery image not found');
    }

    // Delete from Cloudinary if publicId exists
    if (gallery.publicId) {
      try {
        await this.cloudinaryService.deleteImage(gallery.publicId);
      } catch (error) {
        console.warn('Failed to delete image from Cloudinary:', error);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await this.galleryModel.deleteOne({
      _id: new Types.ObjectId(id),
      companyId: new Types.ObjectId(companyId),
    });
  }

  async reorder(companyId: string, imageIds: string[]): Promise<void> {
    const updates = imageIds.map((id, index) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(id),
          companyId: new Types.ObjectId(companyId),
        },
        update: { displayOrder: index },
      },
    }));

    await this.galleryModel.bulkWrite(updates);
  }
}

