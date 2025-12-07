import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSystemFeedbackDto } from './dto/create-system-feedback.dto';
import { FeedbackType } from './schemas/system-feedback.schema';
import { SystemFeedbackService } from './system-feedback.service';

@ApiTags('System Feedback')
@Controller('system-feedback')
export class SystemFeedbackController {
  constructor(private readonly feedbackService: SystemFeedbackService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit system feedback (Company Owner/Manager)' })
  create(
    @Body() createFeedbackDto: CreateSystemFeedbackDto,
    @CurrentUser() user: any,
  ) {
    return this.feedbackService.create(
      createFeedbackDto,
      user.id,
      user.companyId || user.companyContext?.companyId,
    );
  }

  @Get('testimonials')
  @Public()
  @ApiOperation({ summary: 'Get public testimonials (Public)' })
  getPublicTestimonials(@Query('limit') limit?: string) {
    return this.feedbackService.getPublicTestimonials(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('my-feedback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my feedback submissions' })
  getMyFeedback(@CurrentUser() user: any) {
    return this.feedbackService.findAll({
      userId: user.id,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all feedback (Super Admin only)' })
  findAll(
    @Query('type') type?: FeedbackType,
    @Query('isPublic') isPublic?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedbackService.findAll({
      type,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feedback by ID' })
  findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  @Post(':id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Respond to feedback (Super Admin only)' })
  respond(
    @Param('id') id: string,
    @Body('response') response: string,
    @CurrentUser() user: any,
  ) {
    return this.feedbackService.respondToFeedback(id, response, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete feedback' })
  remove(@Param('id') id: string) {
    return this.feedbackService.delete(id);
  }
}

