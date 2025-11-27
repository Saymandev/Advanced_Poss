import { Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a review (public, for customers)' })
  async create(@Body() createReviewDto: CreateReviewDto) {
    // Get branchId and companyId from order
    // Populate branchId to get companyId from branch (since POSOrder doesn't have companyId directly)
    const order = await (this.reviewsService as any).posOrderModel
      .findById(createReviewDto.orderId)
      .populate('branchId', 'companyId')
      .exec();
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Safely extract branchId
    let branchId: string;
    if (order.branchId) {
      if (typeof order.branchId === 'object' && order.branchId !== null) {
        branchId = order.branchId._id?.toString() || order.branchId.toString() || String(order.branchId);
      } else {
        branchId = String(order.branchId);
      }
    } else {
      throw new NotFoundException('Order branchId is missing');
    }

    // Get companyId from populated branch
    let companyId: string | undefined;
    if (order.branchId && typeof order.branchId === 'object' && order.branchId !== null) {
      const branch = order.branchId as any;
      if (branch.companyId) {
        if (typeof branch.companyId === 'object' && branch.companyId !== null) {
          companyId = branch.companyId._id?.toString() || branch.companyId.toString() || String(branch.companyId);
        } else {
          companyId = String(branch.companyId);
        }
      }
    }

    // If companyId is still not found, we need to fetch it from branch separately
    if (!companyId && branchId) {
      // Fetch branch to get companyId
      const BranchModel = (this.reviewsService as any).posOrderModel.db.model('Branch');
      const branch = await BranchModel.findById(branchId).select('companyId').exec();
      if (branch && branch.companyId) {
        if (typeof branch.companyId === 'object' && branch.companyId !== null) {
          companyId = branch.companyId._id?.toString() || branch.companyId.toString() || String(branch.companyId);
        } else {
          companyId = String(branch.companyId);
        }
      }
    }

    if (!companyId) {
      throw new NotFoundException('Could not determine companyId from order branch');
    }

    return this.reviewsService.create(createReviewDto, branchId, companyId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all reviews (public)' })
  async findAll(@Query('branchId') branchId?: string, @Query('companyId') companyId?: string) {
    return this.reviewsService.findAll(branchId, companyId);
  }

  @Public()
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get review by order ID (public)' })
  async findByOrder(@Param('orderId') orderId: string) {
    return this.reviewsService.findByOrder(orderId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get review by ID' })
  async findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Get('menu-item/:menuItemId/rating')
  @ApiOperation({ summary: 'Get average rating for a menu item' })
  async getMenuItemRating(
    @Param('menuItemId') menuItemId: string,
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.reviewsService.getMenuItemRating(menuItemId, branchId, companyId);
  }

  @Post('menu-items/ratings')
  @ApiOperation({ summary: 'Get ratings summary for multiple menu items' })
  async getMenuItemsRatings(
    @Body() body: { menuItemIds: string[] },
    @Query('branchId') branchId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.reviewsService.getMenuItemsRatings(body.menuItemIds, branchId, companyId);
  }
}

