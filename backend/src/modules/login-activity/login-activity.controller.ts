import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateLoginActivityDto, CreateLoginSessionDto, LoginActivityFilterDto, SessionFilterDto, TerminateSessionDto, UpdateSessionActivityDto } from './dto/login-activity.dto';
import { LoginActivityService } from './login-activity.service';

@Controller('login-activity')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequiresFeature(FEATURES.SETTINGS)
export class LoginActivityController {
  constructor(private readonly loginActivityService: LoginActivityService) { }

  @Get('activities')
  async getLoginActivities(
    @Query() filterDto: LoginActivityFilterDto,
    @CurrentUser() user: any,
  ) {
    if (user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Owners and Super Admins can view login activities');
    }
    // If user is not SUPER_ADMIN, filter by their company
    if (user.role !== UserRole.SUPER_ADMIN) {
      filterDto.companyId = user.companyId;
    }

    const result = await this.loginActivityService.getLoginActivities(filterDto);

    return {
      success: true,
      data: result,
      message: 'Login activities retrieved successfully',
    };
  }

  @Get('sessions')
  async getActiveSessions(
    @Query() filterDto: SessionFilterDto,
    @CurrentUser() user: any,
  ) {
    if (user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Owners and Super Admins can view active sessions');
    }
    // If user is not SUPER_ADMIN, filter by their company
    if (user.role !== UserRole.SUPER_ADMIN) {
      filterDto.companyId = user.companyId;
    }

    const result = await this.loginActivityService.getActiveSessions(filterDto);

    return {
      success: true,
      data: result,
      message: 'Active sessions retrieved successfully',
    };
  }

  @Get('stats')
  async getLoginStats(
    @CurrentUser() user: any,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Owners and Super Admins can view login stats');
    }
    // If user is not SUPER_ADMIN, use their company
    const targetCompanyId = user.role === UserRole.SUPER_ADMIN ? companyId : user.companyId;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const [loginStats, sessionStats] = await Promise.all([
      this.loginActivityService.getLoginStats(targetCompanyId, start, end),
      this.loginActivityService.getSessionStats(targetCompanyId),
    ]);

    return {
      success: true,
      data: {
        loginStats,
        sessionStats,
      },
      message: 'Login statistics retrieved successfully',
    };
  }

  @Post('activities')
  async createLoginActivity(@Body() createDto: CreateLoginActivityDto, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can create login activities');
    }
    const activity = await this.loginActivityService.createLoginActivity(createDto);

    return {
      success: true,
      data: activity,
      message: 'Login activity created successfully',
    };
  }

  @Post('sessions')
  async createLoginSession(@Body() createDto: CreateLoginSessionDto, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can create login sessions');
    }
    const session = await this.loginActivityService.createLoginSession(createDto);

    return {
      success: true,
      data: session,
      message: 'Login session created successfully',
    };
  }

  @Put('sessions/:sessionId/activity')
  async updateSessionActivity(
    @Param('sessionId') sessionId: string,
    @Body() updateDto: UpdateSessionActivityDto,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can update session activity');
    }
    const session = await this.loginActivityService.updateSessionActivity(sessionId, updateDto);

    return {
      success: true,
      data: session,
      message: 'Session activity updated successfully',
    };
  }

  @Put('sessions/:sessionId/terminate')
  async terminateSession(
    @Param('sessionId') sessionId: string,
    @Body() terminateDto: TerminateSessionDto,
    @CurrentUser() user: any,
  ) {
    if (user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Owners and Super Admins can terminate sessions');
    }
    const session = await this.loginActivityService.terminateSession(sessionId, {
      ...terminateDto,
      terminatedBy: terminateDto.terminatedBy || user.id,
    });

    return {
      success: true,
      data: session,
      message: 'Session terminated successfully',
    };
  }

  @Delete('sessions/user/:userId')
  async terminateAllUserSessions(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    if (user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Owners and Super Admins can terminate all user sessions');
    }
    const terminatedCount = await this.loginActivityService.terminateAllUserSessions(
      userId,
      user.id,
      reason,
    );

    return {
      success: true,
      data: { terminatedCount },
      message: `${terminatedCount} user sessions terminated successfully`,
    };
  }

  @Delete('sessions/company/:companyId')
  async terminateAllCompanySessions(
    @CurrentUser() user: any,
    @Param('companyId') companyId: string,
    @Body('reason') reason?: string,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can terminate all company sessions');
    }
    const terminatedCount = await this.loginActivityService.terminateAllCompanySessions(
      companyId,
      user.id,
      reason,
    );

    return {
      success: true,
      data: { terminatedCount },
      message: `${terminatedCount} company sessions terminated successfully`,
    };
  }

  @Post('cleanup/expired-sessions')
  async cleanupExpiredSessions(@CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can cleanup expired sessions');
    }
    const cleanedCount = await this.loginActivityService.cleanupExpiredSessions();

    return {
      success: true,
      data: { cleanedCount },
      message: `${cleanedCount} expired sessions cleaned up successfully`,
    };
  }

  @Get('dashboard')
  async getDashboardData(
    @CurrentUser() user: any,
    @Query('companyId') companyId?: string,
  ) {
    if (user?.role !== UserRole.OWNER && user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Owners and Super Admins can view dashboard data');
    }
    const targetCompanyId = user.role === UserRole.SUPER_ADMIN ? companyId : user.companyId;

    const [loginStats, sessionStats, recentActivities, activeSessions] = await Promise.all([
      this.loginActivityService.getLoginStats(targetCompanyId),
      this.loginActivityService.getSessionStats(targetCompanyId),
      this.loginActivityService.getLoginActivities({
        companyId: targetCompanyId,
        limit: 10
      }),
      this.loginActivityService.getActiveSessions({
        companyId: targetCompanyId,
        activeOnly: true,
        limit: 10
      }),
    ]);

    return {
      success: true,
      data: {
        loginStats,
        sessionStats,
        recentActivities: recentActivities.activities,
        activeSessions: activeSessions.sessions,
      },
      message: 'Dashboard data retrieved successfully',
    };
  }
}
