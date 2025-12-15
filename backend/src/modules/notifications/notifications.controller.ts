import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.NOTIFICATIONS)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.SUPER_ADMIN)
  async list(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('role') role?: string,
    @Query('userId') userId?: string,
    @Query('features') features?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const featuresArr = features ? features.split(',').map((f) => f.trim()).filter(Boolean) : [];
    return this.notificationsService.list({ companyId, branchId, role, userId, features: featuresArr, page, limit });
  }

  @Post(':id/read')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.SUPER_ADMIN)
  async markRead(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER, UserRole.SUPER_ADMIN)
  async markAllRead(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('role') role?: string,
    @Query('userId') userId?: string,
  ) {
    return this.notificationsService.markAllAsRead({ companyId, branchId, role, userId });
  }
}

