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
import { OrderFilterDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { AddPaymentDto } from './dto/add-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.ORDER_MANAGEMENT)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
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

  @Get('branch/:branchId/series')
  @ApiOperation({ summary: 'Get daily series of orders and revenue' })
  getDailySeries(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.ordersService.getDailySeries(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('branch/:branchId/top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  getTopProducts(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit = '5',
  ) {
    return this.ordersService.getTopProducts(
      branchId,
      new Date(startDate),
      new Date(endDate),
      parseInt(limit, 10) || 5,
    );
  }

  @Get('branch/:branchId/top-employees')
  @ApiOperation({ summary: 'Get best employees by orders served' })
  getTopEmployees(
    @Param('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit = '4',
  ) {
    return this.ordersService.getTopEmployees(
      branchId,
      new Date(startDate),
      new Date(endDate),
      parseInt(limit, 10) || 4,
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
  @ApiOperation({ summary: 'Update order' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto, user.id);
  }

  @Post(':id/payment')
  @ApiOperation({ summary: 'Add payment to order' })
  addPayment(@Param('id') id: string, @Body() addPaymentDto: AddPaymentDto) {
    return this.ordersService.addPayment(id, addPaymentDto);
  }

  @Post(':id/split')
  @ApiOperation({ summary: 'Split order' })
  splitOrder(@Param('id') id: string, @Body() splitData: any) {
    return this.ordersService.splitOrder(id, splitData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete order' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}

