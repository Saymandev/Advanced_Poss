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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodsService } from './payment-methods.service';

@ApiTags('Payment Methods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create payment method' })
  create(@Body() createDto: CreatePaymentMethodDto, @Request() req: any) {
    const userId = req.user?.id || req.user?._id;
    return this.paymentMethodsService.create(createDto, userId);
  }

  @Get()
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
  @ApiOperation({ summary: 'Get system-wide payment methods' })
  findSystemMethods() {
    return this.paymentMethodsService.findSystemPaymentMethods();
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get payment methods by company (includes system methods)' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.paymentMethodsService.findByCompany(companyId);
  }

  @Get('branch/:companyId/:branchId')
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
  @ApiOperation({ summary: 'Get payment method by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentMethodsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update payment method' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentMethodDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?._id;
    return this.paymentMethodsService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete payment method' })
  remove(@Param('id') id: string) {
    return this.paymentMethodsService.remove(id);
  }
}

