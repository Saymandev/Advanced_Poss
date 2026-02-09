import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { RequiresLimit } from '../../common/decorators/requires-limit.decorator';
import { BranchFilterDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { SubscriptionLimitGuard } from '../../common/guards/subscription-limit.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard, SubscriptionLimitGuard)
@RequiresFeature(FEATURES.BRANCHES)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) { }

  @Post()
  @RequiresLimit('maxBranches')
  @ApiOperation({ summary: 'Create new branch' })
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all branches' })
  findAll(@Query() filter: BranchFilterDto) {
    return this.branchesService.findAll(filter);
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Get all soft deleted branches' })
  @ApiResponse({
    status: 200,
    description: 'List of soft deleted branches',
  })
  findDeleted(@Query() filter: BranchFilterDto, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can access deleted branches');
    }
    return this.branchesService.findDeleted(filter);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get branches by company' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.branchesService.findByCompany(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch by ID' })
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get branch statistics' })
  getStats(@Param('id') id: string) {
    return this.branchesService.getStats(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update branch' })
  update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchesService.update(id, updateBranchDto);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle branch status' })
  toggleStatus(@Param('id') id: string) {
    return this.branchesService.toggleStatus(id);
  }

  @Patch(':id/settings')
  @ApiOperation({ summary: 'Update branch settings' })
  updateSettings(@Param('id') id: string, @Body() settings: any) {
    return this.branchesService.updateSettings(id, settings);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete branch (moves to trash)' })
  @ApiResponse({
    status: 200,
    description: 'Branch moved to trash successfully',
  })
  softDelete(@Param('id') id: string) {
    return this.branchesService.softDelete(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore soft deleted branch' })
  @ApiResponse({
    status: 200,
    description: 'Branch restored successfully',
  })
  restore(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can restore branches');
    }
    return this.branchesService.restore(id);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete branch and all related data' })
  @ApiResponse({
    status: 200,
    description: 'Branch permanently deleted with all related data',
  })
  permanentDelete(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can permanently delete branches');
    }
    return this.branchesService.permanentDeleteWithCascade(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate branch' })
  deactivate(@Param('id') id: string) {
    return this.branchesService.deactivate(id);
  }

  @Patch(':id/public-url')
  @ApiOperation({ summary: 'Update branch public URL (Super Admin only)' })
  updatePublicUrl(
    @Param('id') id: string,
    @Body() body: { publicUrl: string },
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admins can update public URL');
    }
    return this.branchesService.updatePublicUrl(id, body.publicUrl);
  }
}

