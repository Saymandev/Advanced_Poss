import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { SuperAdminNotificationsService } from './super-admin-notifications.service';

@ApiTags('super-admin-notifications')
@Controller('super-admin/notifications')
export class SuperAdminNotificationsController {
  constructor(private readonly notificationsService: SuperAdminNotificationsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.list(Number(page) || 1, Number(limit) || 20);
  }

  @Get('unread-count')
  @Roles(UserRole.SUPER_ADMIN)
  unreadCount() {
    return this.notificationsService.unreadCount();
  }

  @Post(':id/read')
  @Roles(UserRole.SUPER_ADMIN)
  markRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('read-all')
  @Roles(UserRole.SUPER_ADMIN)
  markAllRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  clear(@Param('id') id: string) {
    return this.notificationsService.clear(id);
  }

  @Delete()
  @Roles(UserRole.SUPER_ADMIN)
  clearAll() {
    return this.notificationsService.clearAll();
  }
}

