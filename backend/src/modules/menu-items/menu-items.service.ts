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

    // Convert string IDs to ObjectIds to ensure proper MongoDB storage and querying
    const menuItemData: any = { ...createMenuItemDto };
    
    if (menuItemData.companyId && typeof menuItemData.companyId === 'string') {
      menuItemData.companyId = new Types.ObjectId(menuItemData.companyId);
    }
    
    if (menuItemData.branchId && typeof menuItemData.branchId === 'string') {
      menuItemData.branchId = new Types.ObjectId(menuItemData.branchId);
    }
    
    if (menuItemData.categoryId && typeof menuItemData.categoryId === 'string') {
      menuItemData.categoryId = new Types.ObjectId(menuItemData.categoryId);
    }

    // Convert ingredient IDs to ObjectIds
    if (menuItemData.ingredients && Array.isArray(menuItemData.ingredients)) {
      menuItemData.ingredients = menuItemData.ingredients.map((ing: any) => ({
        ...ing,
        ingredientId:
          ing.ingredientId && typeof ing.ingredientId === 'string'
            ? new Types.ObjectId(ing.ingredientId)
            : ing.ingredientId,
      }));

      // If ingredients are defined but trackInventory was not explicitly set to false,
      // default trackInventory to true so stock is tracked automatically.
      if (menuItemData.trackInventory === undefined) {
        menuItemData.trackInventory = true;
      }
    }

    const menuItem = new this.menuItemModel(menuItemData);
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
    if (query.categoryId && typeof query.categoryId === 'string') {
      query.categoryId = new Types.ObjectId(query.categoryId);
    }
    
    // Convert companyId to ObjectId FIRST (before branchId handling)
    let companyIdObjectId: Types.ObjectId | undefined;
    if (query.companyId) {
      companyIdObjectId = typeof query.companyId === 'string' 
        ? new Types.ObjectId(query.companyId) 
        : query.companyId;
      query.companyId = companyIdObjectId;
    }

    // Handle branchId: when provided, include both branch-specific AND company-wide items (branchId: null)
    // IMPORTANT: This ensures each branch sees:
    // 1. Items created specifically for that branch (branchId matches)
    // 2. Company-wide items (branchId: null) - available to all branches
    // 3. Items from OTHER branches are NOT shown (they have different branchId)
    // This matches the findByBranch logic to ensure consistency
    
    if (query.branchId) {
      const branchIdObjectId = typeof query.branchId === 'string' 
        ? new Types.ObjectId(query.branchId) 
        : query.branchId;
      
      // Remove branchId from query (we'll add it back in $or)
      delete query.branchId;
      
      // Build branch filter: include items for this branch OR company-wide items
      // Ensure companyId is applied to both conditions in $or
      const branchConditions: any[] = [
        { branchId: branchIdObjectId }, // Items for this specific branch
        { branchId: null }, // Company-wide items (available to all branches)
      ];
      
      // Apply companyId to both conditions if provided
      if (companyIdObjectId) {
        branchConditions[0].companyId = companyIdObjectId;
        branchConditions[1].companyId = companyIdObjectId;
        // Remove companyId from top level since it's now in $or conditions
        delete query.companyId;
      }
      
      query.$or = branchConditions;
    }

    // Build search conditions if provided
    if (search) {
      const searchConditions = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } },
          { 'category.name': { $regex: search, $options: 'i' } },
        ],
      };
      
      // If we already have $or (from branchId), combine with $and
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          searchConditions,
        ];
        delete query.$or;
      } else {
        Object.assign(query, searchConditions);
      }
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Debug logging to help troubleshoot
    // Note: JSON.stringify converts ObjectIds to strings, but the actual query uses ObjectIds
    console.log('🔍 MenuItemsService.findAll query:', JSON.stringify(query, null, 2));
    console.log('🔍 MenuItemsService.findAll filters:', { page, limit, sortBy, sortOrder, search });
    
    // Log actual ObjectId types for debugging
    if (query.$or && Array.isArray(query.$or)) {
      console.log('🔍 $or conditions:', query.$or.map((cond: any) => ({
        branchId: cond.branchId?.toString?.() || cond.branchId,
        companyId: cond.companyId?.toString?.() || cond.companyId,
      })));
    }

    const menuItems = await this.menuItemModel
      .find(query)
      .populate('categoryId', 'name type')
      // Populate ingredient details including stock flags so we can derive low-stock status
      .populate(
        'ingredients.ingredientId',
        'name unit currentStock minimumStock isLowStock isOutOfStock',
      )
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    console.log(`✅ MenuItemsService.findAll found ${menuItems.length} items`);
    
    // Debug: Log the names of found items to verify new items are included
    if (menuItems.length > 0) {
      const itemNames = menuItems.map((item: any) => item.name).slice(0, 5);
      console.log(`📋 First ${Math.min(5, menuItems.length)} items:`, itemNames.join(', '));
    }

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

    // Normalize ingredients array and ensure ingredientId is an ObjectId
    if (Array.isArray(updateData.ingredients)) {
      updateData.ingredients = updateData.ingredients.map((ing: any) => ({
        ...ing,
        ingredientId:
          ing.ingredientId && typeof ing.ingredientId === 'string'
            ? new Types.ObjectId(ing.ingredientId)
            : ing.ingredientId,
      }));

      // If ingredients are present and trackInventory not explicitly set,
      // default it to true so stock is tracked.
      if (updateData.trackInventory === undefined) {
        updateData.trackInventory = updateData.ingredients.length > 0;
      }
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

