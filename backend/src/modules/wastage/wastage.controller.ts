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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CreateWastageDto } from './dto/create-wastage.dto';
import { UpdateWastageDto } from './dto/update-wastage.dto';
import { WastageQueryDto } from './dto/wastage-query.dto';
import { WastageService } from './wastage.service';

@ApiTags('Wastage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.WASTAGE_MANAGEMENT)
@Controller('wastage')
export class WastageController {
  constructor(private readonly wastageService: WastageService) { }

  @Post()
  @ApiOperation({ summary: 'Create a wastage record' })
  create(@Body() createWastageDto: CreateWastageDto, @Request() req) {
    const companyId = req.user.companyId || req.user.company?._id || req.user.company?.id;
    const branchId = req.user.branchId || req.user.branch?._id || req.user.branch?.id;
    const userId = req.user._id || req.user.id;

    return this.wastageService.create(createWastageDto, companyId, branchId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all wastage records' })
  findAll(@Query() queryDto: WastageQueryDto, @Request() req) {
    const companyId = req.user.companyId || req.user.company?._id || req.user.company?.id;
    return this.wastageService.findAll(queryDto, companyId);
  }

  @Get('stats')
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
  @ApiOperation({ summary: 'Get a wastage record by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId || req.user.company?._id || req.user.company?.id;
    return this.wastageService.findOne(id, companyId);
  }

  @Patch(':id')
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
  @ApiOperation({ summary: 'Delete a wastage record' })
  remove(@Param('id') id: string, @Request() req) {
    const companyId = req.user.companyId || req.user.company?._id || req.user.company?.id;
    return this.wastageService.remove(id, companyId);
  }
}
