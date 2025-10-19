import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check if category with same name exists in the same company/branch
    const filter: any = {
      companyId: new Types.ObjectId(createCategoryDto.companyId),
      name: { $regex: new RegExp(`^${createCategoryDto.name}$`, 'i') },
    };

    if (createCategoryDto.branchId) {
      filter.branchId = new Types.ObjectId(createCategoryDto.branchId);
    }

    const existingCategory = await this.categoryModel.findOne(filter);

    if (existingCategory) {
      throw new BadRequestException(
        'Category with this name already exists in this location',
      );
    }

    // Get the highest sort order and increment
    const lastCategory = await this.categoryModel
      .findOne({ companyId: new Types.ObjectId(createCategoryDto.companyId) })
      .sort({ sortOrder: -1 });

    const sortOrder = lastCategory ? lastCategory.sortOrder + 1 : 0;

    const category = new this.categoryModel({
      ...createCategoryDto,
      sortOrder,
    });

    return category.save();
  }

  async findAll(filter: any = {}): Promise<Category[]> {
    return this.categoryModel.find(filter).sort({ sortOrder: 1 }).exec();
  }

  async findOne(id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findById(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findByCompany(companyId: string): Promise<Category[]> {
    return this.categoryModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ sortOrder: 1 })
      .exec();
  }

  async findByBranch(branchId: string): Promise<Category[]> {
    return this.categoryModel
      .find({
        $or: [
          { branchId: new Types.ObjectId(branchId) },
          { branchId: null }, // Include company-wide categories
        ],
      })
      .sort({ sortOrder: 1 })
      .exec();
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      updateCategoryDto,
      { new: true },
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async updateSortOrder(
    id: string,
    newSortOrder: number,
  ): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      { sortOrder: newSortOrder },
      { new: true },
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const result = await this.categoryModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Category not found');
    }
  }

  async countByCompany(companyId: string): Promise<number> {
    return this.categoryModel
      .countDocuments({ companyId: new Types.ObjectId(companyId) })
      .exec();
  }
}

