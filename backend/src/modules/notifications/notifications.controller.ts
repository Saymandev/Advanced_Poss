import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { WorkPeriodCheckGuard } from '../../common/guards/work-period-check.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard, WorkPeriodCheckGuard)
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
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
    @Query('features') features?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('companyId') queryCompanyId?: string, // Allow super_admin to specify
  ) {
    const featuresArr = features ? features.split(',').map((f) => f.trim()).filter(Boolean) : [];
    
    // Force identity to prevent cross-company access unless super_admin
    const isSuperAdmin = user?.role === 'super_admin';
    const companyId = isSuperAdmin ? (queryCompanyId || user?.companyId?.toString()) : (user?.companyId?.toString() || user?.company?.toString());
    const role = isSuperAdmin ? undefined : user?.role;
    const userId = isSuperAdmin ? undefined : (user?._id?.toString() || user?.id?.toString());
    
    return this.notificationsService.list({ 
      companyId, 
      branchId: branchId || user?.branchId?.toString(), 
      role, 
      userId, 
      features: featuresArr, 
      page, 
      limit 
    });
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user?._id?.toString() || user?.id?.toString();
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  async markAllRead(
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const isSuperAdmin = user?.role === 'super_admin';
    const companyId = isSuperAdmin ? (queryCompanyId || user?.companyId?.toString()) : (user?.companyId?.toString() || user?.company?.toString());
    const role = isSuperAdmin ? undefined : user?.role;
    const userId = isSuperAdmin ? undefined : (user?._id?.toString() || user?.id?.toString());

    return this.notificationsService.markAllAsRead({ 
      companyId, 
      branchId: branchId || user?.branchId?.toString(), 
      role, 
      userId 
    });
  }

  /** DELETE /notifications — clears notifications for this user's role/branch scope only */
  @Delete()
  async clearAll(
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const isSuperAdmin = user?.role === 'super_admin';
    const companyId = isSuperAdmin ? (queryCompanyId || user?.companyId?.toString()) : (user?.companyId?.toString() || user?.company?.toString());
    const role = isSuperAdmin ? undefined : user?.role;
    const userId = isSuperAdmin ? undefined : (user?._id?.toString() || user?.id?.toString());

    return this.notificationsService.deleteAll({ 
      companyId, 
      branchId: branchId || user?.branchId?.toString(), 
      role, 
      userId 
    });
  }

  /** DELETE /notifications/:id — delete single notification */
  @Delete(':id')
  async deleteOne(@Param('id') id: string) {
    return this.notificationsService.delete(id);
  }
}
