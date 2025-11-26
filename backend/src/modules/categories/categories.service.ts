import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @Inject(forwardRef(() => MenuItemsService))
    private menuItemsService: MenuItemsService,
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

    // Convert string IDs to ObjectIds for proper storage
    const categoryData: any = {
      ...createCategoryDto,
      companyId: new Types.ObjectId(createCategoryDto.companyId),
      sortOrder,
    };

    if (createCategoryDto.branchId) {
      categoryData.branchId = new Types.ObjectId(createCategoryDto.branchId);
    }

    const category = new this.categoryModel(categoryData);
    return category.save();
  }

  async findAll(filter: any = {}): Promise<Category[]> {
    const query: any = { ...filter };
    
    console.log('🔍 CategoriesService.findAll - Input filter:', JSON.stringify(filter, null, 2));
    
    // Convert string IDs to ObjectIds
    let companyIdObjectId: Types.ObjectId | undefined;
    if (query.companyId && typeof query.companyId === 'string') {
      companyIdObjectId = new Types.ObjectId(query.companyId);
      query.companyId = companyIdObjectId;
    } else if (query.companyId) {
      companyIdObjectId = query.companyId;
    }

    // When branchId is provided, include both branch-specific and company-wide categories
    if (query.branchId) {
      const branchId =
        typeof query.branchId === 'string'
          ? new Types.ObjectId(query.branchId)
          : query.branchId;

      delete query.branchId;
      delete query.companyId; // Remove from top level, will add to $or conditions

      // Build $or conditions with companyId in both
      const orConditions: any[] = [
        { branchId },
        { branchId: null },
      ];

      // Add companyId to both conditions if provided
      if (companyIdObjectId) {
        orConditions[0].companyId = companyIdObjectId;
        orConditions[1].companyId = companyIdObjectId;
      }

      query.$or = orConditions;
    }

    console.log('🔍 CategoriesService.findAll - Final query:', JSON.stringify(query, null, 2));
    
    const results = await this.categoryModel.find(query).sort({ sortOrder: 1 }).exec();
    
    console.log(`✅ CategoriesService.findAll - Found ${results.length} categories`);
    
    // Populate menu items count for each category
    const categoriesWithCounts = await Promise.all(
      results.map(async (category) => {
        try {
          const count = await this.menuItemsService.countByCategory(category._id.toString());
          return {
            ...category.toObject(),
            menuItemsCount: count,
          };
        } catch (error) {
          console.error(`Error counting menu items for category ${category._id}:`, error);
          return {
            ...category.toObject(),
            menuItemsCount: 0,
          };
        }
      })
    );
    
    if (categoriesWithCounts.length > 0) {
      console.log('✅ First 3 categories with counts:', categoriesWithCounts.slice(0, 3).map(c => ({ 
        id: c._id || c.id, 
        name: c.name, 
        branchId: c.branchId,
        menuItemsCount: c.menuItemsCount 
      })));
    }
    
    return categoriesWithCounts;
  }

  async findOne(id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findById(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Populate menu items count
    try {
      const count = await this.menuItemsService.countByCategory(id);
      return {
        ...category.toObject(),
        menuItemsCount: count,
      } as any;
    } catch (error) {
      console.error(`Error counting menu items for category ${id}:`, error);
      return {
        ...category.toObject(),
        menuItemsCount: 0,
      } as any;
    }
  }

  async findByCompany(companyId: string): Promise<Category[]> {
    const results = await this.categoryModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ sortOrder: 1 })
      .exec();

    // Populate menu items count for each category
    const categoriesWithCounts = await Promise.all(
      results.map(async (category) => {
        try {
          const count = await this.menuItemsService.countByCategory(category._id.toString());
          return {
            ...category.toObject(),
            menuItemsCount: count,
          };
        } catch (error) {
          console.error(`Error counting menu items for category ${category._id}:`, error);
          return {
            ...category.toObject(),
            menuItemsCount: 0,
          };
        }
      })
    );

    return categoriesWithCounts;
  }

  async findByBranch(branchId: string, companyId?: string): Promise<Category[]> {
    const query: any = {
      $or: [
        { branchId: new Types.ObjectId(branchId) },
        { branchId: null }, // Include company-wide categories
      ],
    };

    // Add companyId filter if provided to ensure data isolation
    if (companyId) {
      query.companyId = new Types.ObjectId(companyId);
    }

    const results = await this.categoryModel
      .find(query)
      .sort({ sortOrder: 1 })
      .exec();

    // Populate menu items count for each category
    const categoriesWithCounts = await Promise.all(
      results.map(async (category) => {
        try {
          const count = await this.menuItemsService.countByCategory(category._id.toString());
          return {
            ...category.toObject(),
            menuItemsCount: count,
          };
        } catch (error) {
          console.error(`Error counting menu items for category ${category._id}:`, error);
          return {
            ...category.toObject(),
            menuItemsCount: 0,
          };
        }
      })
    );

    return categoriesWithCounts;
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

  async toggleStatus(id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.isActive = !category.isActive;
    return category.save();
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has menu items
    try {
      const menuItems = await this.menuItemsService.findByCategory(id);
      if (menuItems && menuItems.length > 0) {
        throw new ConflictException(
          `Cannot delete category "${category.name}" because it has ${menuItems.length} menu item(s). Please remove or reassign the menu items first.`,
        );
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      // If MenuItemsService is not available, log warning but allow deletion
      console.warn('Could not check menu items before category deletion:', error);
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

