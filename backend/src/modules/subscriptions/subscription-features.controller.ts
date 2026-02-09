import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateSubscriptionFeatureDto, UpdateSubscriptionFeatureDto } from './dto/subscription-feature.dto';
import { SubscriptionFeaturesService } from './subscription-features.service';

@Controller('subscription-features')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionFeaturesController {
  constructor(
    private readonly featuresService: SubscriptionFeaturesService,
  ) { }

  // Super Admin only endpoints
  @Post()
  async create(@Body() createDto: CreateSubscriptionFeatureDto, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can create subscription features');
    }
    return this.featuresService.create(createDto);
  }

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('isRequired') isRequired?: string,
  ) {
    const filters: any = {};
    if (category) filters.category = category;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isRequired !== undefined) filters.isRequired = isRequired === 'true';
    return this.featuresService.findAll(filters);
  }

  @Get('seed')
  async seedFeatures(@CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can seed features');
    }
    const features = await this.featuresService.seedFeatures();
    return {
      success: true,
      message: `Seeded ${features.length} default features`,
      data: features,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.featuresService.findOne(id);
  }

  @Get('key/:key')
  async findByKey(@Param('key') key: string) {
    return this.featuresService.findByKey(key);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionFeatureDto,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can update subscription features');
    }
    return this.featuresService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can delete subscription features');
    }
    await this.featuresService.remove(id);
    return {
      success: true,
      message: 'Feature deleted successfully',
    };
  }

  @Post('calculate-price')
  async calculatePrice(
    @Body()
    body: {
      featureKeys: string[];
      billingCycle: 'monthly' | 'yearly';
      branchCount?: number;
      userCount?: number;
    },
  ) {
    return this.featuresService.calculatePrice(
      body.featureKeys,
      body.billingCycle,
      body.branchCount || 1,
      body.userCount || 1,
    );
  }
}

