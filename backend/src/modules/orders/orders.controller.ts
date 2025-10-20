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
import { OrderFilterDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AddPaymentDto } from './dto/add-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.WAITER,
  )
  @ApiOperation({ summary: 'Create new order' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders with pagination, filtering, and search' })
  findAll(@Query() filterDto: OrderFilterDto) {
    return this.ordersService.findAll(filterDto);
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Get orders by branch' })
  findByBranch(
    @Param('branchId') branchId: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.findByBranch(
      branchId,
      status,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('branch/:branchId/active')
  @ApiOperation({ summary: 'Get active orders for branch' })
  findActiveOrders(@Param('branchId') branchId: string) {
    return this.ordersService.findActiveOrders(branchId);
  }

  @Get('branch/:branchId/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get sales statistics' })
  getSalesStats(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.ordersService.getSalesStats(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('table/:tableId')
  @ApiOperation({ summary: 'Get orders for table' })
  findByTable(@Param('tableId') tableId: string) {
    return this.ordersService.findByTable(tableId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.WAITER,
  )
  @ApiOperation({ summary: 'Update order' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/status')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.WAITER,
    UserRole.CHEF,
  )
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }

  @Post(':id/payment')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.WAITER,
  )
  @ApiOperation({ summary: 'Add payment to order' })
  addPayment(@Param('id') id: string, @Body() addPaymentDto: AddPaymentDto) {
    return this.ordersService.addPayment(id, addPaymentDto);
  }

  @Post(':id/split')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.WAITER,
  )
  @ApiOperation({ summary: 'Split order' })
  splitOrder(@Param('id') id: string, @Body() splitData: any) {
    return this.ordersService.splitOrder(id, splitData);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete order' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}

