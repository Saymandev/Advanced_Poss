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
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSubscriptionFeatureDto, UpdateSubscriptionFeatureDto } from './dto/subscription-feature.dto';
import { SubscriptionFeaturesService } from './subscription-features.service';

@Controller('subscription-features')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionFeaturesController {
  constructor(
    private readonly featuresService: SubscriptionFeaturesService,
  ) {}

  // Super Admin only endpoints
  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() createDto: CreateSubscriptionFeatureDto) {
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
  @Roles(UserRole.SUPER_ADMIN)
  async seedFeatures() {
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
  @Roles(UserRole.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionFeatureDto,
  ) {
    return this.featuresService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
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

