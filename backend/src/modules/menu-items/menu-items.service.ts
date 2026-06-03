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
    if (query.branchId) {
      const branchIdObjectId = typeof query.branchId === 'string' 
        ? new Types.ObjectId(query.branchId) 
        : query.branchId;
      
      // Build branch filter: include items for this branch OR company-wide items
      const branchConditions = companyIdObjectId 
        ? [
            { branchId: branchIdObjectId, companyId: companyIdObjectId },
            { branchId: null, companyId: companyIdObjectId }
          ]
        : [
            { branchId: branchIdObjectId },
            { branchId: null }
          ];

      // Use $and to combine branch conditions with existing filters
      if (!query.$and) query.$and = [];
      query.$and.push({ $or: branchConditions });
      
      // Remove top-level branchId and companyId to avoid conflicts with $or
      delete query.branchId;
      if (companyIdObjectId) delete query.companyId;
    }

    // Handle range filters
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      query.price = {};
      if (query.minPrice !== undefined) query.price.$gte = query.minPrice;
      if (query.maxPrice !== undefined) query.price.$lte = query.maxPrice;
      delete query.minPrice;
      delete query.maxPrice;
    }

    if (query.minPrepTime !== undefined || query.maxPrepTime !== undefined) {
      query.preparationTime = {};
      if (query.minPrepTime !== undefined) query.preparationTime.$gte = query.minPrepTime;
      if (query.maxPrepTime !== undefined) query.preparationTime.$lte = query.maxPrepTime;
      delete query.minPrepTime;
      delete query.maxPrepTime;
    }

    // Build search conditions if provided
    if (search) {
      const searchConditions = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } },
        ],
      };
      
      if (!query.$and) query.$and = [];
      query.$and.push(searchConditions);
    }

    console.log('--- MENU ITEMS QUERY DEBUG ---');
    console.log('Final Query:', JSON.stringify(query, null, 2));

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
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
      .lean()
      .exec();
    // Debug: Log the names of found items to verify new items are included
    if (menuItems.length > 0) {
      const itemNames = menuItems.map((item: any) => item.name).slice(0, 5);
      // Found menu items
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

  async findByBarcode(barcode: string, companyId: string): Promise<MenuItem | null> {
    return this.menuItemModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        $or: [{ barcode }, { sku: barcode }],
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
    const menuItem = await this.menuItemModel.findById(id);
    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    // Apply updates
    Object.assign(menuItem, updateData);

    const savedItem = await menuItem.save();
    return savedItem.populate('categoryId', 'name type');
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

  /**
   * Bulk import products from parsed CSV rows.
   * Auto-creates categories if they don't exist.
   * Detects duplicates by barcode or SKU within the same company.
   */
  async bulkImportFromCSV(
    companyId: string,
    branchId: string | undefined,
    rows: Array<{
      name: string;
      barcode?: string;
      sku?: string;
      price: number;
      cost?: number;
      category?: string;
      unitType?: string;
      weightBased?: boolean;
      stock?: number;
      minimumStock?: number;
      description?: string;
      expiryDate?: string;
      batchNumber?: string;
    }>,
    categoryModel: Model<any>,
  ): Promise<{ imported: number; skipped: number; errors: Array<{ row: number; reason: string }> }> {
    const errors: Array<{ row: number; reason: string }> = [];
    let imported = 0;
    let skipped = 0;

    const companyObjId = new Types.ObjectId(companyId);
    const branchObjId = branchId ? new Types.ObjectId(branchId) : undefined;

    // Cache categories to avoid repeated lookups
    const categoryCache = new Map<string, Types.ObjectId>();

    // Pre-load existing categories
    const existingCategories = await categoryModel
      .find({ companyId: companyObjId })
      .lean()
      .exec();
    for (const cat of existingCategories) {
      categoryCache.set((cat as any).name.toLowerCase(), (cat as any)._id);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row + 0-indexed

      try {
        if (!row.name || row.name.trim() === '') {
          errors.push({ row: rowNum, reason: 'Missing product name' });
          skipped++;
          continue;
        }
        if (row.price === undefined || row.price === null || isNaN(Number(row.price))) {
          errors.push({ row: rowNum, reason: 'Missing or invalid price' });
          skipped++;
          continue;
        }

        // Check for duplicate by barcode or SKU
        if (row.barcode && row.barcode.trim()) {
          const existing = await this.menuItemModel.findOne({
            companyId: companyObjId,
            $or: [{ barcode: row.barcode.trim() }, { sku: row.barcode.trim() }],
          });
          if (existing) {
            errors.push({ row: rowNum, reason: `Duplicate barcode: ${row.barcode}` });
            skipped++;
            continue;
          }
        }
        if (row.sku && row.sku.trim()) {
          const existing = await this.menuItemModel.findOne({
            companyId: companyObjId,
            sku: row.sku.trim(),
          });
          if (existing) {
            errors.push({ row: rowNum, reason: `Duplicate SKU: ${row.sku}` });
            skipped++;
            continue;
          }
        }

        // Resolve or create category
        let categoryId: Types.ObjectId;
        const categoryName = (row.category || 'General').trim();
        const categoryKey = categoryName.toLowerCase();

        if (categoryCache.has(categoryKey)) {
          categoryId = categoryCache.get(categoryKey)!;
        } else {
          const lastCat = await categoryModel
            .findOne({ companyId: companyObjId })
            .sort({ sortOrder: -1 });
          const sortOrder = lastCat ? (lastCat as any).sortOrder + 1 : 0;

          const newCat = await categoryModel.create({
            name: categoryName,
            companyId: companyObjId,
            branchId: branchObjId || null,
            isActive: true,
            sortOrder,
          });
          categoryId = (newCat as any)._id;
          categoryCache.set(categoryKey, categoryId);
        }

        // Create the product
        const menuItemData: any = {
          companyId: companyObjId,
          branchId: branchObjId || null,
          categoryId,
          name: row.name.trim(),
          price: Number(row.price),
          isAvailable: true,
          trackInventory: row.stock !== undefined && row.stock !== null,
          requiresKitchen: false,
        };

        if (row.barcode) menuItemData.barcode = row.barcode.trim();
        if (row.sku) menuItemData.sku = row.sku.trim();
        if (row.cost !== undefined && row.cost !== null) menuItemData.cost = Number(row.cost);
        if (row.description) menuItemData.description = row.description.trim();
        if (row.unitType) menuItemData.unitType = row.unitType.trim();
        if (row.weightBased !== undefined) menuItemData.weightBasedPricing = row.weightBased;
        if (row.stock !== undefined && row.stock !== null) menuItemData.stock = Number(row.stock);
        if (row.minimumStock !== undefined) menuItemData.minimumStock = Number(row.minimumStock);
        if (row.expiryDate) menuItemData.expiryDate = new Date(row.expiryDate);
        if (row.batchNumber) menuItemData.batchNumber = row.batchNumber.trim();

        await this.menuItemModel.create(menuItemData);
        imported++;
      } catch (err: any) {
        errors.push({ row: rowNum, reason: err.message || 'Unknown error' });
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  /** Adjust stock for a single product (add, remove, or set). */
  async adjustStock(
    id: string,
    adjustment: { type: 'add' | 'remove' | 'set'; quantity: number },
  ): Promise<MenuItem> {
    const menuItem = await this.menuItemModel.findById(id);
    if (!menuItem) throw new NotFoundException('Menu item not found');

    const currentStock = (menuItem as any).stock || 0;
    switch (adjustment.type) {
      case 'add':
        (menuItem as any).stock = currentStock + adjustment.quantity;
        break;
      case 'remove':
        (menuItem as any).stock = Math.max(0, currentStock - adjustment.quantity);
        break;
      case 'set':
        (menuItem as any).stock = adjustment.quantity;
        break;
    }
    return menuItem.save();
  }

  /** Deduct stock for all items in a completed order. */
  async deductStockForOrder(
    items: Array<{ menuItemId: string; quantity: number }>,
  ): Promise<{ success: boolean; outOfStock: string[] }> {
    const outOfStock: string[] = [];
    for (const item of items) {
      try {
        const menuItem = await this.menuItemModel.findById(item.menuItemId);
        if (!menuItem) continue;
        if (menuItem.trackInventory && (menuItem as any).stock != null) {
          const newStock = Math.max(0, ((menuItem as any).stock || 0) - item.quantity);
          (menuItem as any).stock = newStock;
          if (newStock <= 0) outOfStock.push(menuItem.name);
          await menuItem.save();
        }
      } catch (err) {
        console.error(`Failed to deduct stock for item ${item.menuItemId}:`, err);
      }
    }
    return { success: true, outOfStock };
  }

  /** Restore stock for all items when an order is cancelled. */
  async restoreStockForOrder(
    items: Array<{ menuItemId: string; quantity: number }>,
  ): Promise<void> {
    for (const item of items) {
      try {
        const menuItem = await this.menuItemModel.findById(item.menuItemId);
        if (!menuItem) continue;
        if (menuItem.trackInventory && (menuItem as any).stock != null) {
          (menuItem as any).stock = ((menuItem as any).stock || 0) + item.quantity;
          await menuItem.save();
        }
      } catch (err) {
        console.error(`Failed to restore stock for item ${item.menuItemId}:`, err);
      }
    }
  }

  /** Get expiring products (grocery) */
  async getExpiringProducts(companyId: string, branchId?: string, days: number = 30): Promise<MenuItem[]> {
    const query: any = {
      companyId: new Types.ObjectId(companyId),
      expiryDate: { $exists: true, $ne: null }
    };
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    query.expiryDate = { $lte: futureDate };

    return this.menuItemModel
      .find(query)
      .populate('categoryId', 'name')
      .sort({ expiryDate: 1 })
      .exec();
  }

  /** Generate unique barcode for store item */
  async generateUniqueBarcode(companyId: string): Promise<string> {
    // Generate a 12 digit code starting with '20' (Internal EAN prefix)
    let isUnique = false;
    let barcode = '';

    while (!isUnique) {
      // 20 + 9 random digits = 11 digits. We will add a check digit.
      const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
      const code11 = `20${randomPart}`;
      
      // Calculate EAN-13 check digit (dummy standard approach)
      let sum = 0;
      for (let i = 0; i < 11; i++) {
        sum += parseInt(code11[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      barcode = `${code11}${checkDigit}`;

      const existing = await this.menuItemModel.findOne({ barcode });
      if (!existing) {
        isUnique = true;
      }
    }
    return barcode;
  }
}
