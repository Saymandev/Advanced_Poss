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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.WAITER,
  )
  @ApiOperation({ summary: 'Create new customer' })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  findAll(@Query('companyId') companyId?: string) {
    const filter: any = {};
    if (companyId) filter.companyId = companyId;
    return this.customersService.findAll(filter);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search customers' })
  search(
    @Query('companyId') companyId: string,
    @Query('q') query: string,
  ) {
    return this.customersService.search(companyId, query);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get customers by company' })
  findByCompany(@Param('companyId') companyId: string) {
    return this.customersService.findByCompany(companyId);
  }

  @Get('company/:companyId/vip')
  @ApiOperation({ summary: 'Get VIP customers' })
  findVIP(@Param('companyId') companyId: string) {
    return this.customersService.findVIPCustomers(companyId);
  }

  @Get('company/:companyId/top')
  @ApiOperation({ summary: 'Get top customers by spending' })
  findTopCustomers(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.findTopCustomers(companyId, limit || 10);
  }

  @Get('company/:companyId/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get customer statistics' })
  getStats(@Param('companyId') companyId: string) {
    return this.customersService.getStats(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update customer' })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Post(':id/loyalty/add')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add loyalty points' })
  addLoyaltyPoints(@Param('id') id: string, @Body('points') points: number) {
    return this.customersService.addLoyaltyPoints(id, points);
  }

  @Post(':id/loyalty/redeem')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.WAITER,
  )
  @ApiOperation({ summary: 'Redeem loyalty points' })
  redeemLoyaltyPoints(
    @Param('id') id: string,
    @Body('points') points: number,
  ) {
    return this.customersService.redeemLoyaltyPoints(id, points);
  }

  @Post(':id/vip')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Make customer VIP' })
  makeVIP(@Param('id') id: string) {
    return this.customersService.makeVIP(id);
  }

  @Delete(':id/vip')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove VIP status' })
  removeVIP(@Param('id') id: string) {
    return this.customersService.removeVIP(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Deactivate customer' })
  deactivate(@Param('id') id: string) {
    return this.customersService.deactivate(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete customer' })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}

