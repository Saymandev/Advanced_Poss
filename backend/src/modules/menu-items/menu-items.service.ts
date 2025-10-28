import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItemFilterDto } from '../../common/dto/pagination.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectModel(MenuItem.name)
    private menuItemModel: Model<MenuItemDocument>,
  ) {}

  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    // Check if item with same name exists in the same category
    const existingItem = await this.menuItemModel.findOne({
      categoryId: new Types.ObjectId(createMenuItemDto.categoryId),
      name: { $regex: new RegExp(`^${createMenuItemDto.name}$`, 'i') },
    });

    if (existingItem) {
      throw new BadRequestException(
        'Menu item with this name already exists in this category',
      );
    }

    const menuItem = new this.menuItemModel(createMenuItemDto);
    return menuItem.save();
  }

  async findAll(filterDto: MenuItemFilterDto): Promise<{ menuItems: MenuItem[], total: number, page: number, limit: number }> {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search,
      ...filters 
    } = filterDto;
    
    const skip = (page - 1) * limit;
    const query: any = { ...filters };

    // Convert string IDs to ObjectIds for proper MongoDB querying
    if (query.branchId && typeof query.branchId === 'string') {
      query.branchId = new Types.ObjectId(query.branchId);
    }
    if (query.categoryId && typeof query.categoryId === 'string') {
      query.categoryId = new Types.ObjectId(query.categoryId);
    }
    if (query.companyId && typeof query.companyId === 'string') {
      query.companyId = new Types.ObjectId(query.companyId);
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { 'category.name': { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const menuItems = await this.menuItemModel
      .find(query)
      .populate('categoryId', 'name type')
      .populate('ingredients.ingredientId', 'name unit')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.menuItemModel.countDocuments(query);

    return {
      menuItems,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<MenuItem> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid menu item ID');
    }

    const menuItem = await this.menuItemModel
      .findById(id)
      .populate('categoryId', 'name type')
      .populate('ingredients.ingredientId', 'name unit currentStock');

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return menuItem;
  }

  async findByCategory(categoryId: string): Promise<MenuItem[]> {
    return this.menuItemModel
      .find({ categoryId: new Types.ObjectId(categoryId), isAvailable: true })
      .exec();
  }

  async findByCompany(companyId: string): Promise<MenuItem[]> {
    return this.menuItemModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .populate('categoryId', 'name type')
      .exec();
  }

  async findByBranch(branchId: string): Promise<MenuItem[]> {
    return this.menuItemModel
      .find({
        $or: [
          { branchId: new Types.ObjectId(branchId) },
          { branchId: null }, // Include company-wide items
        ],
        isAvailable: true,
      })
      .populate('categoryId', 'name type')
      .exec();
  }

  async search(query: string, companyId: string): Promise<MenuItem[]> {
    return this.menuItemModel
      .find({
        companyId: new Types.ObjectId(companyId),
        $text: { $search: query },
        isAvailable: true,
      })
      .populate('categoryId', 'name type')
      .exec();
  }

  async findPopular(companyId: string, limit: number = 10): Promise<MenuItem[]> {
    return this.menuItemModel
      .find({ companyId: new Types.ObjectId(companyId), isPopular: true })
      .limit(limit)
      .sort({ totalOrders: -1 })
      .populate('categoryId', 'name type')
      .exec();
  }

  async update(
    id: string,
    updateMenuItemDto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid menu item ID');
    }

    // Convert string IDs to ObjectIds if needed
    const updateData: any = { ...updateMenuItemDto };
    if (updateData.branchId && typeof updateData.branchId === 'string') {
      updateData.branchId = new Types.ObjectId(updateData.branchId);
    }
    if (updateData.categoryId && typeof updateData.categoryId === 'string') {
      updateData.categoryId = new Types.ObjectId(updateData.categoryId);
    }
    if (updateData.companyId && typeof updateData.companyId === 'string') {
      updateData.companyId = new Types.ObjectId(updateData.companyId);
    }

    const menuItem = await this.menuItemModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('categoryId', 'name type');

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return menuItem;
  }

  async toggleAvailability(id: string): Promise<MenuItem> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid menu item ID');
    }

    const menuItem = await this.menuItemModel.findById(id);

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    return menuItem.save();
  }

  async incrementOrders(id: string, amount: number): Promise<void> {
    await this.menuItemModel.findByIdAndUpdate(id, {
      $inc: {
        totalOrders: 1,
        totalRevenue: amount,
      },
    });
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid menu item ID');
    }

    const result = await this.menuItemModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Menu item not found');
    }
  }

  async countByCompany(companyId: string): Promise<number> {
    return this.menuItemModel
      .countDocuments({ companyId: new Types.ObjectId(companyId) })
      .exec();
  }

  async countByCategory(categoryId: string): Promise<number> {
    return this.menuItemModel
      .countDocuments({ categoryId: new Types.ObjectId(categoryId) })
      .exec();
  }
}

