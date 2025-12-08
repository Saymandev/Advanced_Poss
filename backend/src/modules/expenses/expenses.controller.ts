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
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiresRoleFeature } from '../../common/decorators/requires-role-feature.decorator';
import { ExpenseFilterDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleFeatureGuard } from '../../common/guards/role-feature.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleFeatureGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.EXPENSES)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Create new expense' })
  create(@Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.create(createExpenseDto);
  }

  @Get()
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Get all expenses with pagination, filtering, and search' })
  findAll(
    @Query() filterDto: ExpenseFilterDto,
    @CurrentUser('role') userRole?: string,
  ) {
    return this.expensesService.findAll(filterDto, userRole);
  }

  @Get('branch/:branchId')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Get expenses by branch' })
  findByBranch(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expensesService.findByBranch(
      branchId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('branch/:branchId/category/:category')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Get expenses by category' })
  findByCategory(
    @Param('branchId') branchId: string,
    @Param('category') category: string,
  ) {
    return this.expensesService.findByCategory(branchId, category);
  }

  @Get('branch/:branchId/pending')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Get pending expenses' })
  findPending(@Param('branchId') branchId: string) {
    return this.expensesService.findPending(branchId);
  }

  @Get('branch/:branchId/recurring')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Get recurring expenses' })
  findRecurring(@Param('branchId') branchId: string) {
    return this.expensesService.findRecurring(branchId);
  }

  @Get('branch/:branchId/stats')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Get expense statistics' })
  getStats(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.expensesService.getStats(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('branch/:branchId/breakdown')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Get category breakdown' })
  getCategoryBreakdown(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.expensesService.getCategoryBreakdown(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('branch/:branchId/trend/:year')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Get monthly expense trend' })
  getMonthlyTrend(
    @Param('branchId') branchId: string,
    @Param('year') year: number,
  ) {
    return this.expensesService.getMonthlyTrend(branchId, +year);
  }

  @Get(':id')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Get expense by ID' })
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Update expense' })
  update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Post(':id/approve')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Approve expense' })
  approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('approverId') approverId?: string,
  ) {
    // Use approverId from body if provided, otherwise use current user ID
    const approver = approverId || userId;
    return this.expensesService.approve(id, approver);
  }

  @Post(':id/reject')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Reject expense' })
  reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('approverId') approverId?: string,
    @Body('reason') reason?: string,
  ) {
    // Use approverId from body if provided, otherwise use current user ID
    const approver = approverId || userId;
    return this.expensesService.reject(id, approver, reason);
  }

  @Post(':id/mark-paid')
  @RequiresRoleFeature('expenses')
  @ApiOperation({ summary: 'Mark expense as paid' })
  markAsPaid(@Param('id') id: string) {
    return this.expensesService.markAsPaid(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete expense (owner only)' })
  remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }
}

