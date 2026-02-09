import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateSystemFeedbackDto } from './dto/create-system-feedback.dto';
import { FeedbackType } from './schemas/system-feedback.schema';
import { SystemFeedbackService } from './system-feedback.service';

@ApiTags('System Feedback')
@Controller('system-feedback')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SystemFeedbackController {
  constructor(private readonly feedbackService: SystemFeedbackService) { }

  @Post()
  @RequiresFeature(FEATURES.SETTINGS)
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
  @RequiresFeature(FEATURES.SETTINGS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my feedback submissions' })
  getMyFeedback(@CurrentUser() user: any) {
    return this.feedbackService.findAll({
      userId: user.id,
    });
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all feedback (Super Admin only)' })
  findAll(
    @Query('type') type?: FeedbackType,
    @Query('isPublic') isPublic?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can view all feedback');
    }
    return this.feedbackService.findAll({
      type,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @RequiresFeature(FEATURES.SETTINGS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feedback by ID' })
  findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  @Post(':id/respond')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Respond to feedback (Super Admin only)' })
  respond(
    @Param('id') id: string,
    @Body('response') response: string,
    @CurrentUser() user: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can respond to feedback');
    }
    return this.feedbackService.respondToFeedback(id, response, user.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete feedback' })
  remove(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Owners and Super Admins can delete feedback');
    }
    return this.feedbackService.delete(id);
  }
}

