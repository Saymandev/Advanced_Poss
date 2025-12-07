import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateContentPageDto } from './dto/create-content-page.dto';
import { UpdateContentPageDto } from './dto/update-content-page.dto';
import {
    ContentPage,
    ContentPageDocument,
    ContentPageStatus,
    ContentPageType,
} from './schemas/content-page.schema';

@Injectable()
export class CmsService {
  constructor(
    @InjectModel(ContentPage.name)
    private contentPageModel: Model<ContentPageDocument>,
  ) {}

  async create(
    createContentPageDto: CreateContentPageDto,
    userId: string,
  ): Promise<ContentPage> {
    // Check if slug already exists
    const existingPage = await this.contentPageModel.findOne({
      slug: createContentPageDto.slug.toLowerCase(),
    });

    if (existingPage) {
      throw new BadRequestException('A page with this slug already exists');
    }

    const contentPageData: any = {
      ...createContentPageDto,
      slug: createContentPageDto.slug.toLowerCase(),
      createdBy: new Types.ObjectId(userId),
      status: createContentPageDto.status || ContentPageStatus.DRAFT,
    };

    // Set publishedAt if status is published
    if (contentPageData.status === ContentPageStatus.PUBLISHED) {
      contentPageData.publishedAt = new Date();
    }

    const contentPage = new this.contentPageModel(contentPageData);
    return contentPage.save();
  }

  async findAll(
    filter: {
      type?: ContentPageType;
      status?: ContentPageStatus;
      isActive?: boolean;
      search?: string;
    } = {},
  ): Promise<ContentPage[]> {
    const query: any = {};

    if (filter.type) {
      query.type = filter.type;
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive;
    }

    if (filter.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { slug: { $regex: filter.search, $options: 'i' } },
        { excerpt: { $regex: filter.search, $options: 'i' } },
        { content: { $regex: filter.search, $options: 'i' } },
      ];
    }

    return this.contentPageModel
      .find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .exec();
  }

  async findOne(id: string): Promise<ContentPage> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid content page ID');
    }

    const contentPage = await this.contentPageModel
      .findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .exec();

    if (!contentPage) {
      throw new NotFoundException('Content page not found');
    }

    return contentPage;
  }

  async findBySlug(slug: string): Promise<ContentPage> {
    const contentPage = await this.contentPageModel
      .findOne({
        slug: slug.toLowerCase(),
        status: ContentPageStatus.PUBLISHED,
        isActive: true,
      })
      .populate('createdBy', 'name email')
      .exec();

    if (!contentPage) {
      throw new NotFoundException('Content page not found');
    }

    // Increment view count
    await this.contentPageModel.findByIdAndUpdate(contentPage._id, {
      $inc: { viewCount: 1 },
    });

    return contentPage;
  }

  async findByType(
    type: ContentPageType,
    options: {
      status?: ContentPageStatus;
      limit?: number;
      featured?: boolean;
    } = {},
  ): Promise<ContentPage[]> {
    const query: any = {
      type,
      isActive: true,
    };

    if (options.status) {
      query.status = options.status;
    } else {
      query.status = ContentPageStatus.PUBLISHED;
    }

    if (options.featured !== undefined) {
      query.isFeatured = options.featured;
    }

    let queryBuilder = this.contentPageModel
      .find(query)
      .sort({ sortOrder: 1, publishedAt: -1, createdAt: -1 })
      .populate('createdBy', 'name email');

    if (options.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }

    return queryBuilder.exec();
  }

  async update(
    id: string,
    updateContentPageDto: UpdateContentPageDto,
    userId: string,
  ): Promise<ContentPage> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid content page ID');
    }

    const contentPage = await this.contentPageModel.findById(id);

    if (!contentPage) {
      throw new NotFoundException('Content page not found');
    }

    // Check if slug is being changed and if it conflicts
    if (
      updateContentPageDto.slug &&
      updateContentPageDto.slug.toLowerCase() !== contentPage.slug
    ) {
      const existingPage = await this.contentPageModel.findOne({
        slug: updateContentPageDto.slug.toLowerCase(),
        _id: { $ne: id },
      });

      if (existingPage) {
        throw new BadRequestException('A page with this slug already exists');
      }
    }

    const updateData: any = {
      ...updateContentPageDto,
      updatedBy: new Types.ObjectId(userId),
    };

    if (updateContentPageDto.slug) {
      updateData.slug = updateContentPageDto.slug.toLowerCase();
    }

    // Set publishedAt if status is being changed to published
    if (
      updateContentPageDto.status === ContentPageStatus.PUBLISHED &&
      contentPage.status !== ContentPageStatus.PUBLISHED
    ) {
      updateData.publishedAt = new Date();
    }

    const updatedPage = await this.contentPageModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .exec();

    return updatedPage;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid content page ID');
    }

    const contentPage = await this.contentPageModel.findById(id);

    if (!contentPage) {
      throw new NotFoundException('Content page not found');
    }

    // Soft delete by setting isActive to false
    await this.contentPageModel.findByIdAndUpdate(id, {
      isActive: false,
      status: ContentPageStatus.ARCHIVED,
    });
  }

  async hardDelete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid content page ID');
    }

    const result = await this.contentPageModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Content page not found');
    }
  }

  async getCategories(type: ContentPageType): Promise<string[]> {
    const categories = await this.contentPageModel
      .distinct('category', {
        type,
        status: ContentPageStatus.PUBLISHED,
        isActive: true,
        category: { $exists: true, $ne: null },
      })
      .exec();

    return categories.filter((cat) => cat) as string[];
  }
}

