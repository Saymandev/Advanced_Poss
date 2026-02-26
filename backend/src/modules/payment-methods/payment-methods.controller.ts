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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodsService } from './payment-methods.service';

@ApiTags('Payment Methods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) { }

  @Post()
  @RequiresFeature(FEATURES.SETTINGS)
  @ApiOperation({ summary: 'Create payment method' })
  create(@Body() createDto: CreatePaymentMethodDto, @Request() req: any) {
    if (req.user?.role !== UserRole.MANAGER && req.user?.role !== UserRole.OWNER && req.user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can create payment methods');
    }
    const userId = req.user?.id || req.user?._id;
    return this.paymentMethodsService.create(createDto, userId);
  }

  @Get()
  @RequiresFeature(FEATURES.SETTINGS, FEATURES.ORDER_MANAGEMENT, FEATURES.EXPENSES, FEATURES.PURCHASE_ORDERS)
  @ApiOperation({ summary: 'Get all payment methods' })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('systemOnly') systemOnly?: string,
  ) {
    const filter: any = {};
    if (companyId) filter.companyId = companyId;
    if (branchId) filter.branchId = branchId;
    if (systemOnly === 'true') filter.systemOnly = true;
    return this.paymentMethodsService.findAll(filter);
  }

  @Get('system')
  @RequiresFeature(FEATURES.SETTINGS, FEATURES.ORDER_MANAGEMENT, FEATURES.EXPENSES, FEATURES.PURCHASE_ORDERS)
  @ApiOperation({ summary: 'Get system-wide payment methods' })
  findSystemMethods() {
    return this.paymentMethodsService.findSystemPaymentMethods();
  }

  @Get('company/:companyId')
  @RequiresFeature(FEATURES.SETTINGS, FEATURES.ORDER_MANAGEMENT, FEATURES.EXPENSES, FEATURES.PURCHASE_ORDERS)
  @ApiOperation({ summary: 'Get payment methods by company (includes system methods)' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.paymentMethodsService.findByCompany(companyId);
  }

  @Get('branch/:companyId/:branchId')
  @RequiresFeature(FEATURES.SETTINGS, FEATURES.ORDER_MANAGEMENT, FEATURES.EXPENSES, FEATURES.PURCHASE_ORDERS)
  @ApiOperation({
    summary: 'Get payment methods by branch (includes system and company methods)',
  })
  findByBranch(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.paymentMethodsService.findByBranch(companyId, branchId);
  }

  @Get(':id')
  @RequiresFeature(FEATURES.SETTINGS, FEATURES.ORDER_MANAGEMENT, FEATURES.EXPENSES, FEATURES.PURCHASE_ORDERS)
  @ApiOperation({ summary: 'Get payment method by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentMethodsService.findOne(id);
  }

  @Patch(':id')
  @RequiresFeature(FEATURES.SETTINGS)
  @ApiOperation({ summary: 'Update payment method' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentMethodDto,
    @Request() req: any,
  ) {
    if (req.user?.role !== UserRole.MANAGER && req.user?.role !== UserRole.OWNER && req.user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can update payment methods');
    }
    const userId = req.user?.id || req.user?._id;
    return this.paymentMethodsService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @RequiresFeature(FEATURES.SETTINGS)
  @ApiOperation({ summary: 'Delete payment method' })
  remove(@Param('id') id: string, @Request() req: any) {
    if (req.user?.role !== UserRole.MANAGER && req.user?.role !== UserRole.OWNER && req.user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Managers and Owners can delete payment methods');
    }
    return this.paymentMethodsService.remove(id);
  }
}

