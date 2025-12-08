import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CreateWastageDto } from './dto/create-wastage.dto';
import { UpdateWastageDto } from './dto/update-wastage.dto';
import { WastageQueryDto } from './dto/wastage-query.dto';
import { WastageService } from './wastage.service';

@ApiTags('Wastage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.WASTAGE_MANAGEMENT)
@Controller('wastage')
export class WastageController {
  constructor(private readonly wastageService: WastageService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a wastage record' })
  create(@Body() createWastageDto: CreateWastageDto, @Request() req) {
    const companyId = req.user.companyId || req.user.company?._id || req.user.company?.id;
    const branchId = req.user.branchId || req.user.branch?._id || req.user.branch?.id;
    const userId = req.user._id || req.user.id;

    return this.wastageService.create(createWastageDto, companyId, branchId, userId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all wastage records' })
  findAll(@Query() queryDto: WastageQueryDto, @Request() req) {
    const companyId = req.user.companyId || req.user.company?._id || req.user.company?.id;
    return this.wastageService.findAll(queryDto, companyId);
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get wastage statistics' })
  getStats(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const companyId = req?.user?.companyId || req?.user?.company?._id || req?.user?.company?.id;
    return this.wastageService.getWastageStats(
      branchId,
      companyId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get a wastage record by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId || req.user.company?._id || req.user.company?.id;
    return this.wastageService.findOne(id, companyId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a wastage record' })
  update(
    @Param('id') id: string,
    @Body() updateWastageDto: UpdateWastageDto,
    @Request() req,
  ) {
    const companyId = req.user.companyId || req.user.company?._id || req.user.company?.id;
    const userId = req.user._id || req.user.id;
    return this.wastageService.update(id, updateWastageDto, companyId, userId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a wastage record' })
  remove(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId || req.user.company?._id || req.user.company?.id;
    return this.wastageService.remove(id, companyId);
  }
}

