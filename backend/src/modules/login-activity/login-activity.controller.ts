import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateLoginActivityDto, CreateLoginSessionDto, LoginActivityFilterDto, SessionFilterDto, TerminateSessionDto, UpdateSessionActivityDto } from './dto/login-activity.dto';
import { LoginActivityService } from './login-activity.service';

@Controller('login-activity')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoginActivityController {
  constructor(private readonly loginActivityService: LoginActivityService) {}

  @Get('activities')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async getLoginActivities(
    @Query() filterDto: LoginActivityFilterDto,
    @CurrentUser() user: any,
  ) {
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async getActiveSessions(
    @Query() filterDto: SessionFilterDto,
    @CurrentUser() user: any,
  ) {
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async getLoginStats(
    @CurrentUser() user: any,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
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
  @Roles(UserRole.SUPER_ADMIN)
  async createLoginActivity(@Body() createDto: CreateLoginActivityDto) {
    const activity = await this.loginActivityService.createLoginActivity(createDto);
    
    return {
      success: true,
      data: activity,
      message: 'Login activity created successfully',
    };
  }

  @Post('sessions')
  @Roles(UserRole.SUPER_ADMIN)
  async createLoginSession(@Body() createDto: CreateLoginSessionDto) {
    const session = await this.loginActivityService.createLoginSession(createDto);
    
    return {
      success: true,
      data: session,
      message: 'Login session created successfully',
    };
  }

  @Put('sessions/:sessionId/activity')
  @Roles(UserRole.SUPER_ADMIN)
  async updateSessionActivity(
    @Param('sessionId') sessionId: string,
    @Body() updateDto: UpdateSessionActivityDto,
  ) {
    const session = await this.loginActivityService.updateSessionActivity(sessionId, updateDto);
    
    return {
      success: true,
      data: session,
      message: 'Session activity updated successfully',
    };
  }

  @Put('sessions/:sessionId/terminate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async terminateSession(
    @Param('sessionId') sessionId: string,
    @Body() terminateDto: TerminateSessionDto,
    @CurrentUser() user: any,
  ) {
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async terminateAllUserSessions(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
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
  @Roles(UserRole.SUPER_ADMIN)
  async terminateAllCompanySessions(
    @CurrentUser() user: any,
    @Param('companyId') companyId: string,
    @Body('reason') reason?: string,
  ) {
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
  @Roles(UserRole.SUPER_ADMIN)
  async cleanupExpiredSessions() {
    const cleanedCount = await this.loginActivityService.cleanupExpiredSessions();
    
    return {
      success: true,
      data: { cleanedCount },
      message: `${cleanedCount} expired sessions cleaned up successfully`,
    };
  }

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async getDashboardData(
    @CurrentUser() user: any,
    @Query('companyId') companyId?: string,
  ) {
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
