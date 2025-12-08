import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Query
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BranchesService } from '../branches/branches.service';
import { CategoriesService } from '../categories/categories.service';
import { CompaniesService } from '../companies/companies.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { MenuItemsService } from '../menu-items/menu-items.service';
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
  ) {}

  @Public()
  @Get('companies/:slug')
  @ApiOperation({ summary: 'Get company by slug (public)' })
  async getCompanyBySlug(@Param('slug') slug: string) {
    try {
      const company = await this.companiesService.findBySlug(slug);
      return {
        success: true,
        data: company,
      };
    } catch (error) {
      throw new NotFoundException('Company not found');
    }
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
    const company = await this.companiesService.findBySlug(companySlug);
    const companyId = (company as any)._id?.toString() || (company as any).id;
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    const branchId = (branch as any)._id?.toString() || (branch as any).id;
    const categories = await this.categoriesService.findAll({ branchId } as any);
    const menuItemsResult = await this.menuItemsService.findAll({
      branchId,
      isAvailable: true,
    } as any);

    // Extract menuItems array from the result object
    // menuItemsService.findAll returns { menuItems: [], total, page, limit }
    let rawMenuItems = Array.isArray(menuItemsResult)
      ? menuItemsResult
      : (menuItemsResult as any)?.menuItems || [];

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
          name: (branch as any).name,
          address: (branch as any).address,
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
}

