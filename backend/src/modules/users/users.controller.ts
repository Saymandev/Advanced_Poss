import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { RequiresLimit } from '../../common/decorators/requires-limit.decorator';
import { UserFilterDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { SubscriptionLimitGuard } from '../../common/guards/subscription-limit.guard';
import { AdminUpdatePasswordDto } from './dto/admin-update-password.dto';
import { AdminUpdatePinDto } from './dto/admin-update-pin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard, SubscriptionLimitGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @RequiresLimit('maxUsers')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Create new user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT, FEATURES.ORDER_MANAGEMENT, FEATURES.DASHBOARD)
  @ApiOperation({ summary: 'Get all users with pagination, filtering, and search' })
  findAll(@Query() filterDto: UserFilterDto) {
    return this.usersService.findAll(filterDto);
  }

  @Get('system/all')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Get all users across all companies (Super Admin only)' })
  findAllSystemWide(@Query() filterDto: UserFilterDto, @Request() req: any) {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can access system-wide users');
    }
    // For super admin: bypass company/branch filters and include super admins
    const systemFilter = {
      ...filterDto,
      includeSuperAdmins: true,
      // Remove branchId and companyId filters for system-wide access
    };
    // Explicitly remove branchId/companyId from filters
    delete (systemFilter as any).branchId;
    delete (systemFilter as any).companyId;
    return this.usersService.findAll(systemFilter);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Get(':id')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT, FEATURES.ORDER_MANAGEMENT, FEATURES.DASHBOARD)
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, updateUserDto);
  }

  @Patch(':id')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Update user by ID' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/deactivate')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Deactivate user' })
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/activate')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Activate user' })
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Patch(':id/admin-update-pin')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Update user PIN (admin - no current PIN required)' })
  adminUpdatePin(
    @Param('id') id: string,
    @Body() dto: AdminUpdatePinDto,
  ) {
    return this.usersService.updatePin(id, dto.newPin);
  }

  @Patch(':id/admin-update-password')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT)
  @ApiOperation({ summary: 'Update user password (admin - no current password required)' })
  adminUpdatePassword(
    @Param('id') id: string,
    @Body() dto: AdminUpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(id, dto.newPassword);
  }

  @Get('branch/:branchId/role/:role')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT, FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Get employees by branch and role' })
  getEmployeesByBranchAndRole(
    @Param('branchId') branchId: string,
    @Param('role') role: string,
  ) {
    return this.usersService.findByBranchAndRole(branchId, role);
  }

  @Post('upload-avatar')
  @RequiresFeature(FEATURES.STAFF_MANAGEMENT, FEATURES.ORDER_MANAGEMENT, FEATURES.DASHBOARD)
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(userId, file);
  }
}

