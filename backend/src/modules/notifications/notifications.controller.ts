import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.NOTIFICATIONS)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Post()
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
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
  async markRead(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  async markAllRead(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('role') role?: string,
    @Query('userId') userId?: string,
  ) {
    return this.notificationsService.markAllAsRead({ companyId, branchId, role, userId });
  }

  /** DELETE /notifications — clears notifications for this user's role/branch scope only */
  @Delete()
  async clearAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('role') role?: string,
    @Query('userId') userId?: string,
  ) {
    return this.notificationsService.deleteAll({ companyId, branchId, role, userId });
  }

  /** DELETE /notifications/:id — delete single notification */
  @Delete(':id')
  async deleteOne(@Param('id') id: string) {
    return this.notificationsService.delete(id);
  }
}
