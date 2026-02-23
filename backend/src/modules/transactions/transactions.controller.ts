import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { RequiresRoleFeature } from '../../common/decorators/requires-role-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleFeatureGuard } from '../../common/guards/role-feature.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionCategory, TransactionType } from './schemas/transaction.schema';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard, RoleFeatureGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.ACCOUNTING)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER) // Only managers and up can manually record transactions
  @RequiresRoleFeature('accounting')
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Req() req: any,
  ) {
    return this.transactionsService.recordTransaction(
      createTransactionDto,
      req.user.companyId,
      req.user.branchId,
      req.user.id,
    );
  }

  @Post('withdraw-profit')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER) // strictly admin/owner functionality
  @RequiresRoleFeature('accounting')
  async withdrawProfit(
    @Body('paymentMethodId') paymentMethodId: string,
    @Body('amount') amount: number,
    @Body('notes') notes: string,
    @Req() req: any,
  ) {
    return this.transactionsService.withdrawProfit(
      paymentMethodId,
      amount,
      notes,
      req.user.companyId,
      req.user.branchId,
      req.user.id,
    );
  }

  @Get('balances')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @RequiresRoleFeature('accounting')
  async getBalances(@Req() req: any) {
    return this.transactionsService.getAccountBalances(req.user.companyId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @RequiresRoleFeature('accounting')
  async findAll(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('paymentMethodId') paymentMethodId?: string,
    @Query('type') type?: TransactionType,
    @Query('category') category?: TransactionCategory,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsService.findAll(req.user.companyId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      paymentMethodId,
      type,
      category,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @RequiresRoleFeature('accounting')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.transactionsService.findOne(id, req.user.companyId);
  }
}
