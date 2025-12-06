import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
    // The reviews service will handle extracting branch/company info from the order
    return this.reviewsService.createFromOrder(createReviewDto);
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

