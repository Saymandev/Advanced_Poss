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
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator'; // Need this for manual checks
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { RequiresLimit } from '../../common/decorators/requires-limit.decorator';
import { CustomerFilterDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { SubscriptionLimitGuard } from '../../common/guards/subscription-limit.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard, SubscriptionLimitGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  @Post()
  @RequiresLimit('maxCustomers')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT)
  @ApiOperation({ summary: 'Create new customer' })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT, FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Get all customers with pagination, filtering, and search' })
  findAll(@Query() filterDto: CustomerFilterDto) {
    return this.customersService.findAll(filterDto);
  }

  @Get('search')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT, FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Search customers' })
  search(
    @Query('companyId') companyId: string,
    @Query('q') query: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.customersService.search(companyId, query, branchId);
  }

  @Get('company/:companyId')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT, FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Get customers by company' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.customersService.findByCompany(companyId);
  }

  @Get('company/:companyId/vip')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT)
  @ApiOperation({ summary: 'Get VIP customers' })
  findVIP(@Param('companyId') companyId: string) {
    return this.customersService.findVIPCustomers(companyId);
  }

  @Get('company/:companyId/top')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT)
  @ApiOperation({ summary: 'Get top customers by spending' })
  findTopCustomers(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.findTopCustomers(companyId, limit || 10);
  }

  @Get('company/:companyId/stats')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT)
  @ApiOperation({ summary: 'Get customer statistics' })
  getStats(@Param('companyId') companyId: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER && user?.role !== UserRole.MANAGER) {
      throw new ForbiddenException('You do not have permission to view customer stats');
    }
    return this.customersService.getStats(companyId);
  }

  @Get(':id')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT, FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Get(':id/orders')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT, FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Get customer orders' })
  getCustomerOrders(@Param('id') id: string) {
    return this.customersService.getCustomerOrders(id);
  }

  @Patch(':id')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT)
  @ApiOperation({ summary: 'Update customer' })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER && user?.role !== UserRole.MANAGER) {
      throw new ForbiddenException('You do not have permission to update customers');
    }
    return this.customersService.update(id, updateCustomerDto);
  }

  @Post(':id/loyalty/add')
  @RequiresFeature(FEATURES.LOYALTY_PROGRAM)
  @ApiOperation({ summary: 'Add loyalty points' })
  addLoyaltyPoints(@Param('id') id: string, @Body('points') points: number, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER && user?.role !== UserRole.MANAGER) {
      throw new ForbiddenException('You do not have permission to add loyalty points manually');
    }
    return this.customersService.addLoyaltyPoints(id, points);
  }

  @Post(':id/loyalty/redeem')
  @RequiresFeature(FEATURES.LOYALTY_PROGRAM)
  @ApiOperation({ summary: 'Redeem loyalty points' })
  redeemLoyaltyPoints(
    @Param('id') id: string,
    @Body('points') points: number,
  ) {
    return this.customersService.redeemLoyaltyPoints(id, points);
  }

  @Patch(':id/loyalty')
  @RequiresFeature(FEATURES.LOYALTY_PROGRAM)
  @ApiOperation({ summary: 'Update loyalty points (add or subtract)' })
  updateLoyaltyPoints(
    @Param('id') id: string,
    @Body() body: { points: number; type: 'add' | 'subtract'; description?: string },
    @CurrentUser() user?: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER && user?.role !== UserRole.MANAGER) {
      throw new ForbiddenException('You do not have permission to update loyalty points manually');
    }
    if (body.type === 'add') {
      return this.customersService.addLoyaltyPoints(id, body.points);
    } else {
      return this.customersService.redeemLoyaltyPoints(id, body.points);
    }
  }

  @Post(':id/vip')
  @RequiresFeature(FEATURES.LOYALTY_PROGRAM)
  @ApiOperation({ summary: 'Make customer VIP' })
  makeVIP(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER && user?.role !== UserRole.MANAGER) {
      throw new ForbiddenException('You do not have permission to manage VIP status');
    }
    return this.customersService.makeVIP(id);
  }

  @Delete(':id/vip')
  @RequiresFeature(FEATURES.LOYALTY_PROGRAM)
  @ApiOperation({ summary: 'Remove VIP status' })
  removeVIP(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER && user?.role !== UserRole.MANAGER) {
      throw new ForbiddenException('You do not have permission to manage VIP status');
    }
    return this.customersService.removeVIP(id);
  }

  @Patch(':id/deactivate')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT)
  @ApiOperation({ summary: 'Deactivate customer' })
  deactivate(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER && user?.role !== UserRole.MANAGER) {
      throw new ForbiddenException('You do not have permission to deactivate customers');
    }
    return this.customersService.deactivate(id);
  }

  @Delete(':id')
  @RequiresFeature(FEATURES.CUSTOMER_MANAGEMENT)
  @ApiOperation({ summary: 'Delete customer' })
  remove(@Param('id') id: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Owners and Super Admins can delete customers');
    }
    return this.customersService.remove(id);
  }
}

