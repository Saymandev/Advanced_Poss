import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Public } from '../../common/decorators/public.decorator';
import { BookingsService } from '../bookings/bookings.service';
import { BranchesService } from '../branches/branches.service';
import { CategoriesService } from '../categories/categories.service';
import { CompaniesService } from '../companies/companies.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { RoomsService } from '../rooms/rooms.service';
import { PublicService } from './public.service';
@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly branchesService: BranchesService,
    private readonly menuItemsService: MenuItemsService,
    private readonly categoriesService: CategoriesService,
    private readonly zonesService: DeliveryZonesService,
    private readonly publicService: PublicService,
    private readonly roomsService: RoomsService,
    private readonly bookingsService: BookingsService,
  ) {}
  @Public()
  @Get('companies/:slug')
  @ApiOperation({ summary: 'Get company by slug (public)' })
  async getCompanyBySlug(@Param('slug') slug: string) {
    // Log the request for debugging
    // Validate slug is not empty or just whitespace
    if (!slug || !slug.trim()) {
      throw new NotFoundException('Invalid company slug');
    }
    // Exclude common static file requests (favicon, robots.txt, etc.)
    const staticFilePatterns = [
      'favicon.ico',
      'robots.txt',
      'sitemap.xml',
      '.well-known',
      'apple-touch-icon',
      'manifest.json',
    ];
    const normalizedSlug = slug.toLowerCase().trim();
    if (staticFilePatterns.some(pattern => normalizedSlug.includes(pattern))) {
      throw new NotFoundException('Not found');
    }
    // findBySlug already throws NotFoundException if company not found
    const company = await this.companiesService.findBySlug(slug);
    return {
      success: true,
      data: company,
    };
  }
  @Public()
  @Get('companies/:companySlug/branches')
  @ApiOperation({ summary: 'Get all branches for a company (public)' })
  async getCompanyBranches(@Param('companySlug') companySlug: string) {
    const company = await this.companiesService.findBySlug(companySlug);
    if (!company) {
      throw new NotFoundException(`Company with slug "${companySlug}" not found`);
    }
    const companyId = (company as any)._id?.toString() || (company as any).id;
    // Use findAll to get branches with proper slug handling
    const branchesResult = await this.branchesService.findAll({ companyId } as any);
    const branches = Array.isArray(branchesResult) 
      ? branchesResult 
      : (branchesResult as any)?.branches || [];
    // Filter active branches and ensure they have slugs
    const activeBranches = branches.filter((b: any) => b.isActive);
    return {
      success: true,
      data: activeBranches,
    };
  }
  @Public()
  @Get('companies/:companySlug/branches/:branchSlug')
  @ApiOperation({ summary: 'Get branch by slug (public)' })
  async getBranchBySlug(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
  ) {
    const company = await this.companiesService.findBySlug(companySlug);
    if (!company) {
      throw new NotFoundException(`Company with slug "${companySlug}" not found`);
    }
    const companyId = (company as any)._id?.toString() || (company as any).id;
    // Check subscription limits for public ordering access
    const { SubscriptionsService } = await import('../subscriptions/subscriptions.service');
    const subscriptionsModule = await import('../subscriptions/subscriptions.module');
    // Note: This validation should ideally be done via dependency injection, but for now we'll check in the service layer
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    if (!branch) {
      throw new NotFoundException(`Branch with slug "${branchSlug}" not found for company "${companySlug}"`);
    }
    // Only return active branches
    if (!branch.isActive) {
      throw new NotFoundException(`Branch "${branchSlug}" is not active`);
    }
    return {
      success: true,
      data: branch,
    };
  }
  @Public()
  @Get('branches/:branchId/menu')
  @ApiOperation({ summary: 'Get menu items for a branch by ID (public, for QR codes)' })
  async getBranchMenuById(
    @Param('branchId') branchId: string,
    @Query('type') menuType?: string,
  ) {
    const branch = await this.branchesService.findOne(branchId);
    if (!branch || !(branch as any).isActive) {
      throw new NotFoundException('Branch not found or inactive');
    }
    const categories = await this.categoriesService.findAll({ branchId } as any);
    const menuItemsResult = await this.menuItemsService.findAll({ 
      branchId,
      isAvailable: true 
    } as any);
    // Extract menuItems array from result (it might be wrapped in an object)
    let menuItems = Array.isArray(menuItemsResult) 
      ? menuItemsResult 
      : (menuItemsResult as any).menuItems || [];
    // Filter by menu type if provided
    if (menuType && menuType !== 'full') {
      const categoryTypes: Record<string, string[]> = {
        food: ['food', 'main', 'appetizer', 'entree'],
        drinks: ['beverage', 'drink', 'beverages'],
        desserts: ['dessert', 'sweets'],
      };
      const allowedTypes = categoryTypes[menuType] || [];
      if (allowedTypes.length > 0) {
        const filteredCategories = (categories as any[]).filter((cat: any) => {
          const catType = (cat as any).type?.toLowerCase();
          return allowedTypes.some(type => catType?.includes(type));
        });
        const categoryIds = filteredCategories.map((cat: any) => 
          (cat as any)._id?.toString() || (cat as any).id
        );
        menuItems = menuItems.filter((item: any) => {
          const itemCategoryId = (item as any).categoryId?._id?.toString() || 
                                (item as any).categoryId?.id ||
                                (item as any).categoryId;
          return categoryIds.includes(itemCategoryId);
        });
      }
    }
    return {
      success: true,
      data: {
        branch: {
          id: (branch as any)._id?.toString() || (branch as any).id,
          name: (branch as any).name,
          address: (branch as any).address,
        },
        categories: Array.isArray(categories) ? categories : [],
        menuItems: Array.isArray(menuItems) ? menuItems : [],
      },
    };
  }
  @Public()
  @Get('companies/:companySlug/branches/:branchSlug/menu')
  @ApiOperation({ summary: 'Get menu items for a branch (public)' })
  async getBranchMenu(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
    @Query('type') menuType?: string,
  ) {
    // Step 1: Find company by unique slug (company slug is always unique)
    const company = await this.companiesService.findBySlug(companySlug);
    if (!company) {
      throw new NotFoundException(`Company with slug "${companySlug}" not found`);
    }
    const companyId = (company as any)._id?.toString() || (company as any).id;
    // Step 2: Find branch by companyId + branchSlug (ensures branch belongs to this company)
    // findBySlug filters by companyId first, with fallback to slug-only for historical data
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    if (!branch) {
      throw new NotFoundException(`Branch with slug "${branchSlug}" not found for company "${companySlug}"`);
    }
    // Step 3: Verify branch actually belongs to the company (handle ObjectId/string formats)
    // Extract branch companyId - handle both populated ObjectId and string formats
    let branchCompanyId: string | undefined;
    const branchCompanyIdRaw = (branch as any).companyId;
    if (branchCompanyIdRaw) {
      if (typeof branchCompanyIdRaw === 'object' && branchCompanyIdRaw._id) {
        branchCompanyId = branchCompanyIdRaw._id.toString();
      } else if (typeof branchCompanyIdRaw === 'object' && branchCompanyIdRaw.id) {
        branchCompanyId = branchCompanyIdRaw.id.toString();
      } else {
        branchCompanyId = branchCompanyIdRaw.toString();
      }
    }
    // Normalize both IDs to strings for comparison
    const normalizedBranchCompanyId = branchCompanyId?.toString();
    const normalizedCompanyId = companyId?.toString();
    let branchId = (branch as any)._id?.toString() || (branch as any).id;
    let actualBranch = branch;
    // Step 4: If branch companyId doesn't match, find the correct branch for this company
    if (normalizedBranchCompanyId && normalizedCompanyId && normalizedBranchCompanyId !== normalizedCompanyId) {
      console.warn(`[Public API] ⚠️ Branch "${branchSlug}" belongs to different company (${normalizedBranchCompanyId})`);
      console.warn(`[Public API] ⚠️ Company "${companySlug}" has ID: ${normalizedCompanyId}`);
      console.warn(`[Public API] ⚠️ Finding correct branch for company "${companySlug}"...`);
      // Find branches that actually belong to this company
      const companyBranches = await this.branchesService.findByCompany(companyId);
      const correctBranch = companyBranches.find((b: any) => {
        const bSlug = (b as any).slug;
        return bSlug === branchSlug || bSlug === 'main-branch' || bSlug === 'main';
      }) || companyBranches[0]; // Use first branch if exact match not found
      if (correctBranch) {
        actualBranch = correctBranch;
        branchId = (correctBranch as any)._id?.toString() || (correctBranch as any).id;
        console.warn(`[Public API] ⚠️ Using branch "${(correctBranch as any).slug}" (ID: ${branchId}) for company "${companySlug}"`);
      } else {
        console.error(`[Public API] ❌ No branches found for company "${companySlug}"`);
        // Continue with original branch, but menu items query will return 0 items
      }
    }
    const categories = await this.categoriesService.findAll({ branchId } as any);
    // Step 5: Query menu items with companyId + branchId
    const menuItemsResult = await this.menuItemsService.findAll({
      companyId, // CRITICAL: Use companyId from company slug (unique identifier)
      branchId, // Use branch ID (corrected if needed)
      isAvailable: true,
    } as any);
    // Extract menuItems array from the result object
    // menuItemsService.findAll returns { menuItems: [], total, page, limit }
    let rawMenuItems = Array.isArray(menuItemsResult)
      ? menuItemsResult
      : (menuItemsResult as any)?.menuItems || [];
    // Filter by menu type if provided
    // Make this flexible by checking actual category types in the database
    if (menuType && menuType !== 'full') {
      // Get all unique category types from the database
      const uniqueCategoryTypes = new Set(
        (categories as any[]).map((cat: any) => (cat as any).type?.toLowerCase()).filter(Boolean)
      );
      // Flexible mapping: check if category type matches menu type or contains it
      // This allows custom types like "appetizer", "breakfast", etc. to work
      const filteredCategories = (categories as any[]).filter((cat: any) => {
        const catType = (cat as any).type?.toLowerCase();
        if (!catType) return false;
        // Direct match
        if (catType === menuType.toLowerCase()) return true;
        // Partial match (e.g., "beverage" matches "drinks", "dessert" matches "desserts")
        if (catType.includes(menuType.toLowerCase()) || menuType.toLowerCase().includes(catType)) {
          return true;
        }
        // Common mappings for backward compatibility
        const commonMappings: Record<string, string[]> = {
          food: ['food', 'main', 'appetizer', 'entree', 'breakfast', 'lunch', 'dinner'],
          drinks: ['beverage', 'drink', 'beverages', 'drinks'],
          desserts: ['dessert', 'sweets', 'desserts'],
        };
        const menuTypeLower = menuType.toLowerCase();
        if (commonMappings[menuTypeLower]) {
          return commonMappings[menuTypeLower].some(type => catType.includes(type) || type.includes(catType));
        }
        return false;
      });
      const categoryIds = filteredCategories.map((cat: any) => 
        (cat as any)._id?.toString() || (cat as any).id
      );
      if (categoryIds.length > 0) {
        rawMenuItems = rawMenuItems.filter((item: any) => {
          const itemCategoryId = (item as any).categoryId?._id?.toString() || 
                                (item as any).categoryId?.id ||
                                (item as any).categoryId;
          return categoryIds.includes(itemCategoryId);
        });
      }
    }
    // For public menu, hide items whose tracked ingredients are low or out of stock
    const menuItems = (rawMenuItems as any[]).filter((item) => {
      // If inventory is not tracked or no ingredients, keep item visible
      if (!item.trackInventory || !Array.isArray(item.ingredients) || item.ingredients.length === 0) {
        return true;
      }
      // If any ingredient is low stock or out of stock, hide from public menu
      return item.ingredients.every((ing: any) => {
        const ingredient: any = ing?.ingredientId;
        if (!ingredient) return true;
        return !ingredient.isLowStock && !ingredient.isOutOfStock;
      });
    });
    return {
      success: true,
      data: {
        branch: {
          id: branchId,
          name: (actualBranch as any).name,
          address: (actualBranch as any).address,
        },
        categories: Array.isArray(categories) ? categories : [],
        menuItems,
      },
    };
  }
  @Public()
  @Get('companies/:companySlug/branches/:branchSlug/products/:productId')
  @ApiOperation({ summary: 'Get single product details (public)' })
  async getProduct(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
    @Param('productId') productId: string,
  ) {
    const company = await this.companiesService.findBySlug(companySlug);
    const companyId = (company as any)._id?.toString() || (company as any).id;
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    const branchId = (branch as any)._id?.toString() || (branch as any).id;
    const product = await this.menuItemsService.findOne(productId);
    // Verify product belongs to this branch
    const productBranchId = (product as any).branchId?.toString() || (product as any).branchId;
    if (productBranchId !== branchId) {
      throw new NotFoundException('Product not found in this branch');
    }
    return {
      success: true,
      data: product,
    };
  }
  @Public()
  @Post('companies/:companySlug/branches/:branchSlug/orders')
  @ApiOperation({ summary: 'Create public order (public)' })
  async createPublicOrder(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
    @Body() orderData: any,
  ) {
    const company = await this.companiesService.findBySlug(companySlug);
    const companyId = (company as any)._id?.toString() || (company as any).id;
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    const branchId = (branch as any)._id?.toString() || (branch as any).id;
    const result = await this.publicService.createOrder({
      ...orderData,
      companyId,
      branchId,
      companySlug,
      branchSlug,
    });
    return result;
  }
  @Public()
  @Get('companies/:companySlug/branches/:branchSlug/reviews')
  @ApiOperation({ summary: 'Get branch reviews (public)' })
  async getBranchReviews(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
  ) {
    const company = await this.companiesService.findBySlug(companySlug);
    const companyId = (company as any)._id?.toString() || (company as any).id;
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    const branchId = (branch as any)._id?.toString() || (branch as any).id;
    return this.publicService.getReviews(branchId);
  }
  @Public()
  @Get('companies/:companySlug/gallery')
  @ApiOperation({ summary: 'Get company gallery (public)' })
  async getGallery(@Param('companySlug') companySlug: string) {
    const company = await this.companiesService.findBySlug(companySlug);
    const companyId = (company as any)._id?.toString() || (company as any).id;
    return this.publicService.getGallery(companyId);
  }
  @Public()
  @Get('orders/:orderId/track')
  @ApiOperation({ summary: 'Track order by ID (public)' })
  async trackOrder(@Param('orderId') orderId: string) {
    return this.publicService.getOrderById(orderId);
  }
  @Public()
  @Get('companies/:companySlug/branches/:branchSlug/delivery-zones')
  @ApiOperation({ summary: 'Get delivery zones for a branch (public)' })
  async getBranchZones(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
  ) {
    const company = await this.companiesService.findBySlug(companySlug);
    const companyId = (company as any)._id?.toString() || (company as any).id;
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    const branchId = (branch as any)._id?.toString() || (branch as any).id;
    const zones = await this.zonesService.findByBranch(branchId);
    return {
      success: true,
      data: zones,
    };
  }
  @Public()
  @Post('companies/:companySlug/branches/:branchSlug/find-zone')
  @ApiOperation({ summary: 'Find delivery zone by address (public)' })
  async findZone(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
    @Body() addressData: { zipCode?: string; city?: string; street?: string },
  ) {
    const company = await this.companiesService.findBySlug(companySlug);
    const companyId = (company as any)._id?.toString() || (company as any).id;
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    const branchId = (branch as any)._id?.toString() || (branch as any).id;
    const zone = await this.zonesService.findZoneByAddress(companyId, branchId, addressData);
    return {
      success: true,
      data: zone,
    };
  }
  @Public()
  @Post('companies/:companySlug/contact')
  @ApiOperation({ summary: 'Submit contact form (public)' })
  async submitContactForm(
    @Param('companySlug') companySlug: string,
    @Body() contactFormDto: any,
  ) {
    const company = await this.companiesService.findBySlug(companySlug);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    const companyId = (company as any)._id?.toString() || (company as any).id;
    return this.publicService.submitContactForm(companyId, contactFormDto);
  }
  @Public()
  @Post('contact')
  @ApiOperation({ summary: 'Submit general contact form (no company required)' })
  async submitGeneralContactForm(@Body() contactFormDto: any) {
    // Use a system/default company ID or null for general inquiries
    // For now, we'll use a special handling in the service
    return this.publicService.submitGeneralContactForm(contactFormDto);
  }
  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Get public system statistics' })
  async getPublicStats() {
    return this.publicService.getPublicStats();
  }
  // ========== Hotel/Room Public Endpoints ==========
  @Public()
  @Get('companies/:companySlug/branches/:branchSlug/rooms')
  @ApiOperation({ summary: 'Get all rooms for a branch (public)' })
  async getBranchRooms(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
  ) {
    // Step 1: Find company by unique slug (company slug is always unique)
    const company = await this.companiesService.findBySlug(companySlug);
    if (!company) {
      throw new NotFoundException(`Company with slug "${companySlug}" not found`);
    }
    // Extract companyId from company object
    const companyId = (company as any)._id?.toString() || (company as any).id;
    if (!companyId) {
      console.error('Company ID extraction failed:', {
        companyKeys: Object.keys(company || {}),
        companyType: typeof company,
        company: company,
      });
      throw new NotFoundException('Company ID not found');
    }
    // Validate companyId is a valid ObjectId
    if (!Types.ObjectId.isValid(companyId)) {
      console.error('Invalid companyId format:', { 
        companyId, 
        companyIdType: typeof companyId,
        companyIdLength: companyId?.length,
        company: company 
      });
      throw new BadRequestException(`Invalid company ID format: ${companyId}`);
    }
    // Step 2: Find branch by companyId + branchSlug (ensures branch belongs to this company)
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    if (!branch) {
      throw new NotFoundException(`Branch with slug "${branchSlug}" not found for company "${companySlug}"`);
    }
    // Step 3: Verify branch actually belongs to the company (handle ObjectId/string formats)
    // Extract branch companyId - handle both populated ObjectId and string formats
    let branchCompanyId: string | undefined;
    const branchCompanyIdRaw = (branch as any).companyId;
    if (branchCompanyIdRaw) {
      if (typeof branchCompanyIdRaw === 'object' && branchCompanyIdRaw._id) {
        branchCompanyId = branchCompanyIdRaw._id.toString();
      } else if (typeof branchCompanyIdRaw === 'object' && branchCompanyIdRaw.id) {
        branchCompanyId = branchCompanyIdRaw.id.toString();
      } else {
        branchCompanyId = branchCompanyIdRaw.toString();
      }
    }
    // Normalize both IDs to strings for comparison
    const normalizedBranchCompanyId = branchCompanyId?.toString();
    const normalizedCompanyId = companyId?.toString();
    let branchId = (branch as any)._id?.toString() || (branch as any).id;
    let actualBranch = branch;
    // Step 4: If branch companyId doesn't match, find the correct branch for this company
    if (normalizedBranchCompanyId && normalizedCompanyId && normalizedBranchCompanyId !== normalizedCompanyId) {
      console.warn(`[PublicController.getBranchRooms] ⚠️ Branch "${branchSlug}" belongs to different company (${normalizedBranchCompanyId})`);
      console.warn(`[PublicController.getBranchRooms] ⚠️ Company "${companySlug}" has ID: ${normalizedCompanyId}`);
      console.warn(`[PublicController.getBranchRooms] ⚠️ Finding correct branch for company "${companySlug}"...`);
      // Find branches that actually belong to this company
      const companyBranches = await this.branchesService.findByCompany(companyId);
      const correctBranch = companyBranches.find((b: any) => {
        const bSlug = (b as any).slug;
        return bSlug === branchSlug || bSlug === 'main-branch' || bSlug === 'main';
      }) || companyBranches[0]; // Use first branch if exact match not found
      if (correctBranch) {
        actualBranch = correctBranch;
        branchId = (correctBranch as any)._id?.toString() || (correctBranch as any).id;
        console.warn(`[PublicController.getBranchRooms] ⚠️ Using branch "${(correctBranch as any).slug}" (ID: ${branchId}) for company "${companySlug}"`);
      } else {
        console.error(`[PublicController.getBranchRooms] ❌ No branches found for company "${companySlug}"`);
        throw new NotFoundException(`No branches found for company "${companySlug}"`);
      }
    }
    // branchId is already extracted above from actualBranch, just validate it
    if (!branchId) {
      console.error('Branch ID extraction failed:', {
        branchKeys: Object.keys(actualBranch || {}),
        branchType: typeof actualBranch,
        branch: actualBranch,
      });
      throw new NotFoundException('Branch ID not found');
    }
    // Validate branchId is a valid ObjectId
    if (!Types.ObjectId.isValid(branchId)) {
      console.error('Invalid branchId format:', { 
        branchId, 
        branchIdType: typeof branchId,
        branchIdLength: branchId?.length,
        branch: actualBranch 
      });
      throw new BadRequestException(`Invalid branch ID format: ${branchId}`);
    }
    // Debug: Check rooms by branchId only (like dashboard does)
    const roomsByBranchOnly = await this.roomsService.findAll({ 
      branchId: branchId,
      isActive: true 
    });
    if (roomsByBranchOnly && roomsByBranchOnly.length > 0) {
      // Found rooms by branch
    }
    // Debug: Check if there are any rooms for this company at all
    const allCompanyRooms = await this.roomsService.findAll({ 
      companyId: new Types.ObjectId(companyId),
      isActive: true 
    });
    let rooms;
    if (checkInDate && checkOutDate) {
      // Get available rooms for the date range
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      rooms = await this.roomsService.findAvailable(branchId, checkIn, checkOut);
    } else {
      // Get all active rooms - use branchId only (like dashboard does) since companyId might not match
      // The rooms might have been created with a different companyId
      rooms = await this.roomsService.findAll({ 
        branchId: branchId,
        isActive: true 
      });
    }
    // Filter out sensitive information for public access
    const publicRooms = rooms.map((room: any) => {
      const roomData = room.toObject ? room.toObject() : room;
      return {
        id: roomData._id?.toString() || roomData.id,
        roomNumber: roomData.roomNumber,
        roomType: roomData.roomType,
        floor: roomData.floor,
        building: roomData.building,
        maxOccupancy: roomData.maxOccupancy,
        beds: roomData.beds,
        amenities: roomData.amenities,
        basePrice: roomData.basePrice,
        size: roomData.size,
        view: roomData.view,
        smokingAllowed: roomData.smokingAllowed,
        images: roomData.images || [],
        description: roomData.description,
        // Don't expose: status, currentBookingId, qrCode, etc.
      };
    });
    return {
      success: true,
      data: publicRooms,
    };
  }
  @Public()
  @Get('companies/:companySlug/branches/:branchSlug/rooms/:roomId')
  @ApiOperation({ summary: 'Get room details by ID (public)' })
  async getRoomDetails(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
    @Param('roomId') roomId: string,
  ) {
    // Step 1: Find company by unique slug (company slug is always unique)
    const company = await this.companiesService.findBySlug(companySlug);
    if (!company) {
      throw new NotFoundException(`Company with slug "${companySlug}" not found`);
    }
    // Extract companyId from company object
    const companyId = (company as any)._id?.toString() || (company as any).id;
    if (!companyId) {
      console.error('Company ID extraction failed:', {
        companyKeys: Object.keys(company || {}),
        companyType: typeof company,
        company: company,
      });
      throw new NotFoundException('Company ID not found');
    }
    // Validate companyId is a valid ObjectId
    if (!Types.ObjectId.isValid(companyId)) {
      console.error('Invalid companyId format:', { 
        companyId, 
        companyIdType: typeof companyId,
        companyIdLength: companyId?.length,
        company: company 
      });
      throw new BadRequestException(`Invalid company ID format: ${companyId}`);
    }
    // Step 2: Find branch by companyId + branchSlug (ensures branch belongs to this company)
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    if (!branch) {
      throw new NotFoundException(`Branch with slug "${branchSlug}" not found for company "${companySlug}"`);
    }
    // Step 3: Verify branch actually belongs to the company (handle ObjectId/string formats)
    // Extract branch companyId - handle both populated ObjectId and string formats
    let branchCompanyId: string | undefined;
    const branchCompanyIdRaw = (branch as any).companyId;
    if (branchCompanyIdRaw) {
      if (typeof branchCompanyIdRaw === 'object' && branchCompanyIdRaw._id) {
        branchCompanyId = branchCompanyIdRaw._id.toString();
      } else if (typeof branchCompanyIdRaw === 'object' && branchCompanyIdRaw.id) {
        branchCompanyId = branchCompanyIdRaw.id.toString();
      } else {
        branchCompanyId = branchCompanyIdRaw.toString();
      }
    }
    // Normalize both IDs to strings for comparison
    const normalizedBranchCompanyId = branchCompanyId?.toString();
    const normalizedCompanyId = companyId?.toString();
    let branchId = (branch as any)._id?.toString() || (branch as any).id;
    let actualBranch = branch;
    // Step 4: If branch companyId doesn't match, find the correct branch for this company
    if (normalizedBranchCompanyId && normalizedCompanyId && normalizedBranchCompanyId !== normalizedCompanyId) {
      console.warn(`[PublicController.getRoomDetails] ⚠️ Branch "${branchSlug}" belongs to different company (${normalizedBranchCompanyId})`);
      console.warn(`[PublicController.getRoomDetails] ⚠️ Company "${companySlug}" has ID: ${normalizedCompanyId}`);
      console.warn(`[PublicController.getRoomDetails] ⚠️ Finding correct branch for company "${companySlug}"...`);
      // Find branches that actually belong to this company
      const companyBranches = await this.branchesService.findByCompany(companyId);
      const correctBranch = companyBranches.find((b: any) => {
        const bSlug = (b as any).slug;
        return bSlug === branchSlug || bSlug === 'main-branch' || bSlug === 'main';
      }) || companyBranches[0]; // Use first branch if exact match not found
      if (correctBranch) {
        actualBranch = correctBranch;
        branchId = (correctBranch as any)._id?.toString() || (correctBranch as any).id;
        console.warn(`[PublicController.getRoomDetails] ⚠️ Using branch "${(correctBranch as any).slug}" (ID: ${branchId}) for company "${companySlug}"`);
      } else {
        console.error(`[PublicController.getRoomDetails] ❌ No branches found for company "${companySlug}"`);
        throw new NotFoundException(`No branches found for company "${companySlug}"`);
      }
    }
    // Step 5: Find the room by ID
    const room = await this.roomsService.findOne(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    // Step 6: Verify room belongs to this branch (handle ObjectId/string formats)
    const roomBranchIdRaw = (room as any).branchId;
    let roomBranchId: string | undefined;
    if (roomBranchIdRaw) {
      if (typeof roomBranchIdRaw === 'object' && roomBranchIdRaw._id) {
        roomBranchId = roomBranchIdRaw._id.toString();
      } else if (typeof roomBranchIdRaw === 'object' && roomBranchIdRaw.id) {
        roomBranchId = roomBranchIdRaw.id.toString();
      } else {
        roomBranchId = roomBranchIdRaw.toString();
      }
    }
    // Normalize both branchIds to strings for comparison
    const normalizedRoomBranchId = roomBranchId?.toString();
    const normalizedBranchId = branchId?.toString();
    if (normalizedRoomBranchId && normalizedBranchId && normalizedRoomBranchId !== normalizedBranchId) {
      console.warn(`[PublicController.getRoomDetails] ⚠️ Room "${roomId}" belongs to different branch (${normalizedRoomBranchId})`);
      console.warn(`[PublicController.getRoomDetails] ⚠️ Expected branch: ${normalizedBranchId}`);
      throw new NotFoundException('Room not found in this branch');
    }
    // Filter out sensitive information
    const roomData = (room as any).toObject ? (room as any).toObject() : room;
    const publicRoom = {
      id: roomData._id?.toString() || roomData.id,
      roomNumber: roomData.roomNumber,
      roomType: roomData.roomType,
      floor: roomData.floor,
      building: roomData.building,
      maxOccupancy: roomData.maxOccupancy,
      beds: roomData.beds,
      amenities: roomData.amenities,
      basePrice: roomData.basePrice,
      size: roomData.size,
      view: roomData.view,
      smokingAllowed: roomData.smokingAllowed,
      images: roomData.images || [],
      description: roomData.description,
    };
    return {
      success: true,
      data: publicRoom,
    };
  }
  @Public()
  @Get('companies/:companySlug/branches/:branchSlug/rooms/available')
  @ApiOperation({ summary: 'Check room availability for date range (public)' })
  async checkRoomAvailability(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
  ) {
    if (!checkInDate || !checkOutDate) {
      throw new BadRequestException('checkInDate and checkOutDate are required');
    }
    const company = await this.companiesService.findBySlug(companySlug);
    if (!company) {
      throw new NotFoundException(`Company with slug "${companySlug}" not found`);
    }
    // Extract companyId from company object
    let companyId: string;
    if ((company as any)._id) {
      const idValue = (company as any)._id;
      companyId = idValue.toString ? idValue.toString() : String(idValue);
    } else if ((company as any).id) {
      const idValue = (company as any).id;
      companyId = typeof idValue === 'string' ? idValue : (idValue.toString ? idValue.toString() : String(idValue));
    } else {
      console.error('Company ID extraction failed:', {
        companyKeys: Object.keys(company || {}),
        companyType: typeof company,
        company: company,
      });
      throw new NotFoundException('Company ID not found');
    }
    // Validate companyId is a valid ObjectId
    if (!Types.ObjectId.isValid(companyId)) {
      console.error('Invalid companyId format:', { 
        companyId, 
        companyIdType: typeof companyId,
        companyIdLength: companyId?.length,
        company: company 
      });
      throw new BadRequestException(`Invalid company ID format: ${companyId}`);
    }
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    if (!branch) {
      throw new NotFoundException(`Branch with slug "${branchSlug}" not found`);
    }
    const branchId = (branch as any)._id?.toString() || (branch as any).id;
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (checkIn >= checkOut) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }
    const availableRooms = await this.roomsService.findAvailable(branchId, checkIn, checkOut);
    // Filter out sensitive information
    const publicRooms = availableRooms.map((room: any) => {
      const roomData = room.toObject ? room.toObject() : room;
      return {
        id: roomData._id?.toString() || roomData.id,
        roomNumber: roomData.roomNumber,
        roomType: roomData.roomType,
        floor: roomData.floor,
        building: roomData.building,
        maxOccupancy: roomData.maxOccupancy,
        beds: roomData.beds,
        amenities: roomData.amenities,
        basePrice: roomData.basePrice,
        size: roomData.size,
        view: roomData.view,
        smokingAllowed: roomData.smokingAllowed,
        images: roomData.images || [],
        description: roomData.description,
      };
    });
    return {
      success: true,
      data: {
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        availableRooms: publicRooms,
        count: publicRooms.length,
      },
    };
  }
  @Public()
  @Post('companies/:companySlug/branches/:branchSlug/bookings')
  @ApiOperation({ summary: 'Create a booking (public, no auth required)' })
  async createPublicBooking(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
    @Body() createBookingDto: any,
  ) {
    const company = await this.companiesService.findBySlug(companySlug);
    if (!company) {
      throw new NotFoundException(`Company with slug "${companySlug}" not found`);
    }
    // Extract companyId from company object
    let companyId: string;
    if ((company as any)._id) {
      const idValue = (company as any)._id;
      companyId = idValue.toString ? idValue.toString() : String(idValue);
    } else if ((company as any).id) {
      const idValue = (company as any).id;
      companyId = typeof idValue === 'string' ? idValue : (idValue.toString ? idValue.toString() : String(idValue));
    } else {
      console.error('Company ID extraction failed:', {
        companyKeys: Object.keys(company || {}),
        companyType: typeof company,
        company: company,
      });
      throw new NotFoundException('Company ID not found');
    }
    // Validate companyId is a valid ObjectId
    if (!Types.ObjectId.isValid(companyId)) {
      console.error('Invalid companyId format:', { 
        companyId, 
        companyIdType: typeof companyId,
        companyIdLength: companyId?.length,
        company: company 
      });
      throw new BadRequestException(`Invalid company ID format: ${companyId}`);
    }
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    if (!branch) {
      throw new NotFoundException(`Branch with slug "${branchSlug}" not found`);
    }
    const branchId = (branch as any)._id?.toString() || (branch as any).id;
    // Set branchId and companyId from URL params (security: prevent branch/company mismatch)
    createBookingDto.branchId = branchId;
    createBookingDto.companyId = companyId;
    // Create or find customer from guest information
    if (createBookingDto.guestEmail || createBookingDto.guestPhone) {
      // Try to find existing customer
      let customer = null;
      if (createBookingDto.guestEmail) {
        customer = await this.publicService.findCustomerByEmail(createBookingDto.guestEmail, companyId);
      }
      if (!customer && createBookingDto.guestPhone) {
        customer = await this.publicService.findCustomerByPhone(createBookingDto.guestPhone, companyId);
      }
      // Create customer if not found
      if (!customer) {
        customer = await this.publicService.createCustomerFromBooking(createBookingDto, companyId);
      }
      if (customer) {
        createBookingDto.guestId = (customer as any)._id?.toString() || (customer as any).id;
      }
    }
    // Create booking (no userId for public bookings)
    const booking = await this.bookingsService.create(createBookingDto);
    // Return booking with sensitive info filtered
    const bookingData = (booking as any).toObject ? (booking as any).toObject() : booking;
    const publicBooking = {
      id: bookingData._id?.toString() || bookingData.id,
      bookingNumber: bookingData.bookingNumber,
      guestName: bookingData.guestName,
      guestEmail: bookingData.guestEmail,
      guestPhone: bookingData.guestPhone,
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,
      numberOfNights: bookingData.numberOfNights,
      roomRate: bookingData.roomRate,
      totalAmount: bookingData.totalAmount,
      paymentStatus: bookingData.paymentStatus,
      status: bookingData.status,
      specialRequests: bookingData.specialRequests,
      createdAt: bookingData.createdAt,
    };
    return {
      success: true,
      data: publicBooking,
      message: 'Booking created successfully',
    };
  }
  @Public()
  @Get('companies/:companySlug/branches/:branchSlug/bookings/:bookingId')
  @ApiOperation({ summary: 'Get booking details by ID (public)' })
  async getBookingDetails(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
    @Param('bookingId') bookingId: string,
  ) {
    const company = await this.companiesService.findBySlug(companySlug);
    if (!company) {
      throw new NotFoundException(`Company with slug "${companySlug}" not found`);
    }
    // Extract companyId from company object
    let companyId: string;
    if ((company as any)._id) {
      const idValue = (company as any)._id;
      companyId = idValue.toString ? idValue.toString() : String(idValue);
    } else if ((company as any).id) {
      const idValue = (company as any).id;
      companyId = typeof idValue === 'string' ? idValue : (idValue.toString ? idValue.toString() : String(idValue));
    } else {
      console.error('Company ID extraction failed:', {
        companyKeys: Object.keys(company || {}),
        companyType: typeof company,
        company: company,
      });
      throw new NotFoundException('Company ID not found');
    }
    // Validate companyId is a valid ObjectId
    if (!Types.ObjectId.isValid(companyId)) {
      console.error('Invalid companyId format:', { 
        companyId, 
        companyIdType: typeof companyId,
        companyIdLength: companyId?.length,
        company: company 
      });
      throw new BadRequestException(`Invalid company ID format: ${companyId}`);
    }
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    if (!branch) {
      throw new NotFoundException(`Branch with slug "${branchSlug}" not found`);
    }
    const branchId = (branch as any)._id?.toString() || (branch as any).id;
    const booking = await this.bookingsService.findOne(bookingId);
    // Verify booking belongs to this branch
    const bookingBranchId = (booking as any).branchId?._id?.toString() || 
                            (booking as any).branchId?.toString() || 
                            (booking as any).branchId;
    if (bookingBranchId !== branchId) {
      throw new NotFoundException('Booking not found');
    }
    // Filter out sensitive information
    const bookingData = (booking as any).toObject ? (booking as any).toObject() : booking;
    const publicBooking = {
      id: bookingData._id?.toString() || bookingData.id,
      bookingNumber: bookingData.bookingNumber,
      guestName: bookingData.guestName,
      guestEmail: bookingData.guestEmail,
      guestPhone: bookingData.guestPhone,
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,
      numberOfNights: bookingData.numberOfNights,
      roomRate: bookingData.roomRate,
      totalAmount: bookingData.totalAmount,
      paymentStatus: bookingData.paymentStatus,
      status: bookingData.status,
      specialRequests: bookingData.specialRequests,
      createdAt: bookingData.createdAt,
    };
    return {
      success: true,
      data: publicBooking,
    };
  }
}
