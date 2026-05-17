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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { ExpenseFilterDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomesService } from './incomes.service';

@ApiTags('Incomes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.INCOME)
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  @RequiresFeature(FEATURES.INCOME)
  @ApiOperation({ summary: 'Create new manual income' })
  create(
    @Body() createIncomeDto: CreateIncomeDto,
    @CurrentUser('role') userRole?: string,
  ) {
    return this.incomesService.create(createIncomeDto, userRole);
  }

  @Get()
  @RequiresFeature(FEATURES.INCOME)
  @ApiOperation({ summary: 'Get all incomes with pagination, filtering, and search' })
  findAll(
    @Query() filterDto: ExpenseFilterDto,
    @CurrentUser('role') userRole?: string,
  ) {
    return this.incomesService.findAll(filterDto, userRole);
  }

  @Get('branch/:branchId/stats')
  @RequiresFeature(FEATURES.INCOME)
  @ApiOperation({ summary: 'Get income statistics' })
  getStats(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.incomesService.getStats(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @RequiresFeature(FEATURES.INCOME)
  @ApiOperation({ summary: 'Get income by ID' })
  findOne(@Param('id') id: string) {
    return this.incomesService.findOne(id);
  }

  @Patch(':id')
  @RequiresFeature(FEATURES.INCOME)
  @ApiOperation({ summary: 'Update income' })
  update(@Param('id') id: string, @Body() updateIncomeDto: UpdateIncomeDto) {
    return this.incomesService.update(id, updateIncomeDto);
  }

  @Post(':id/mark-received')
  @RequiresFeature(FEATURES.INCOME)
  @ApiOperation({ summary: 'Mark income as received' })
  markAsReceived(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.incomesService.markAsReceived(id, userId);
  }

  @Delete(':id')
  @RequiresFeature(FEATURES.ACCOUNTING)
  @ApiOperation({ summary: 'Delete income (owner/accounting manager only)' })
  remove(@Param('id') id: string) {
    return this.incomesService.remove(id);
  }
}
