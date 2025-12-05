import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { SubscriptionPlansService } from './subscription-plans.service';
import { ALL_FEATURE_KEYS, getFeaturesByCategory } from './utils/plan-features.helper';

@ApiTags('subscription-plans')
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(private readonly subscriptionPlansService: SubscriptionPlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new subscription plan (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Subscription plan created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto) {
    return this.subscriptionPlansService.create(createSubscriptionPlanDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscription plans (optionally filtered by isActive)' })
  @ApiResponse({ status: 200, description: 'Subscription plans retrieved successfully' })
  findAll(@Query('isActive') isActive?: string) {
    // If isActive query param is provided, parse it; otherwise return all plans
    const filterActive = isActive !== undefined ? isActive === 'true' : undefined;
    return this.subscriptionPlansService.findAll(filterActive);
  }

  @Get('available-features')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all available features for plan customization (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Available features retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getAvailableFeatures() {
    const featuresByCategory = getFeaturesByCategory();
    return {
      success: true,
      data: {
        featuresByCategory,
        allFeatureKeys: ALL_FEATURE_KEYS,
      },
    };
  }

  @Get(':id/features')
  @ApiOperation({ summary: 'Get plan with normalized feature keys' })
  @ApiResponse({ status: 200, description: 'Plan with normalized features retrieved successfully' })
  async getPlanWithFeatures(@Param('id') id: string) {
    return this.subscriptionPlansService.getPlanWithNormalizedFeatures(id);
  }

  @Post(':id/migrate-features')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Migrate legacy plan features to new enabledFeatureKeys format (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan migrated successfully' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  async migratePlanFeatures(@Param('id') id: string) {
    return this.subscriptionPlansService.migrateToEnabledFeatureKeys(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription plan by ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  findOne(@Param('id') id: string) {
    return this.subscriptionPlansService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subscription plan (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(@Param('id') id: string, @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto) {
    return this.subscriptionPlansService.update(id, updateSubscriptionPlanDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subscription plan (Super Admin only)' })
  @ApiResponse({ status: 204, description: 'Subscription plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string) {
    return this.subscriptionPlansService.remove(id);
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize default subscription plans (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Default subscription plans initialized successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  initializeDefaultPlans() {
    return this.subscriptionPlansService.initializeDefaultPlans();
  }
}
