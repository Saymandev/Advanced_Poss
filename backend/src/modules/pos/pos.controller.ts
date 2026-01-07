import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseGuards
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { RequiresRoleFeature } from '../../common/decorators/requires-role-feature.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoleFeatureGuard } from '../../common/guards/role-feature.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { WorkPeriodCheckGuard } from '../../common/guards/work-period-check.guard';
import { CreatePOSOrderDto } from './dto/create-pos-order.dto';
import { POSOrderFiltersDto, POSStatsFiltersDto } from './dto/pos-filters.dto';
import { UpdatePOSSettingsDto } from './dto/pos-settings.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { UpdatePOSOrderDto } from './dto/update-pos-order.dto';
import { POSService } from './pos.service';
import { ReceiptService } from './receipt.service';

@Controller('pos')
@UseGuards(JwtAuthGuard, RoleFeatureGuard, SubscriptionFeatureGuard, WorkPeriodCheckGuard)
// Note: Feature requirements are now at endpoint level for flexibility
export class POSController {
  constructor(
    private readonly posService: POSService,
    private readonly receiptService: ReceiptService,
  ) {}

  // POS Orders
  @Post('orders')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async createOrder(@Body() createOrderDto: CreatePOSOrderDto, @Request() req) {
    const companyId = req.user?.companyId || req.user?.company?.id || req.user?.company?._id;
    // Use selected waiterId if provided, otherwise use logged-in user
    const userId = createOrderDto.waiterId || req.user.id;
    // Pass user's branchId for validation
    return this.posService.createOrder(createOrderDto, userId, req.user.branchId, companyId, req.user.branchId);
  }

  @Get('orders')
  @RequiresFeature(FEATURES.DASHBOARD) // Dashboard feature allows access to orders
  @RequiresRoleFeature(FEATURES.DASHBOARD)
  async getOrders(@Query() filters: POSOrderFiltersDto, @Request() req) {
    const filtersWithBranch = {
      ...filters,
      branchId: filters.branchId || req.user.branchId,
    };
    return this.posService.getOrders(filtersWithBranch);
  }

  @Get('orders/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getOrderById(@Param('id') id: string) {
    return this.posService.getOrderById(id);
  }

  @Put('orders/:id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async updateOrder(@Param('id') id: string, @Body() updateOrderDto: UpdatePOSOrderDto, @Request() req) {
    return this.posService.updateOrder(id, updateOrderDto, req.user.id);
  }

  @Patch('orders/:id/cancel')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @HttpCode(HttpStatus.OK)
  async cancelOrder(@Param('id') id: string, @Body() body: { reason: string }, @Request() req) {
    return this.posService.cancelOrder(id, body.reason, req.user.id);
  }

  // Payments
  @Post('payments')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async processPayment(@Body() processPaymentDto: ProcessPaymentDto, @Request() req) {
    const companyId = req.user?.companyId || req.user?.company?.id || req.user?.company?._id;
    return this.posService.processPayment(processPaymentDto, req.user.id, req.user.branchId, companyId);
  }

  // Statistics
  @Get('stats')
  @RequiresFeature(FEATURES.DASHBOARD) // Dashboard feature allows access to stats
  @RequiresRoleFeature(FEATURES.DASHBOARD)
  async getStats(@Query() filters: POSStatsFiltersDto, @Request() req) {
    const filtersWithBranch = {
      ...filters,
      branchId: filters.branchId || req.user.branchId,
    };
    return this.posService.getStats(filtersWithBranch);
  }

  @Get('quick-stats')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getQuickStats(@Request() req) {
    return this.posService.getQuickStats(req.user.branchId);
  }

  // Tables
  @Get('tables/available')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getAvailableTables(@Request() req) {
    return this.posService.getAvailableTables(req.user.branchId);
  }

  // Waiters
  @Get('waiters/active-orders')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getWaiterActiveOrdersCount(@Request() req) {
    return this.posService.getWaiterActiveOrdersCount(req.user.branchId);
  }

  // Menu Items
  @Get('menu-items')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getPOSMenuItems(@Query() filters: any, @Request() req) {
    return this.posService.getPOSMenuItems({ 
      ...filters, 
      branchId: req.user.branchId,
      companyId: req.user.companyId || req.user.company?._id || req.user.company?.id,
    });
  }

  // Settings
  @Get('settings')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getPOSSettings(@Request() req) {
    return this.posService.getPOSSettings(req.user.branchId);
  }

  @Put('settings')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async updatePOSSettings(@Body() updateSettingsDto: UpdatePOSSettingsDto, @Request() req) {
    return this.posService.updatePOSSettings(req.user.branchId, updateSettingsDto, req.user.id);
  }

  // Receipt endpoints are handled below with ReceiptService

  // Additional POS endpoints
  @Post('orders/:id/split')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async splitOrder(@Param('id') id: string, @Body() body: { items: any[] }, @Request() req) {
    return this.posService.splitOrder(id, body.items, req.user.id, req.user.branchId);
  }

  @Post('refunds')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async refundOrder(@Body() body: { orderId: string; amount: number; reason: string }, @Request() req) {
    return this.posService.processRefund(body.orderId, body.amount, body.reason, req.user.id, req.user.branchId);
  }

  @Get('tables/:tableId/orders')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getTableOrderHistory(@Param('tableId') tableId: string, @Query('limit') limit: number = 10) {
    return this.posService.getTableOrderHistory(tableId, limit);
  }

  // Receipt and Printing endpoints
  @Get('receipts/:orderId/html')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getReceiptHTML(@Param('orderId') orderId: string) {
    const html = await this.receiptService.generateReceiptHTML(orderId);
    return { html };
  }

  @Get('receipts/:orderId/pdf')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getReceiptPDF(@Param('orderId') orderId: string, @Res() res) {
    const pdfBuffer = await this.receiptService.generateReceiptPDF(orderId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${orderId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Post('receipts/:orderId/print')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async printReceipt(@Param('orderId') orderId: string, @Body('printerId') printerId?: string) {
    return this.receiptService.printReceipt(orderId, printerId);
  }

  @Post('receipts/:orderId/print-pdf')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async printReceiptPDF(@Param('orderId') orderId: string, @Body('printerId') printerId?: string) {
    return this.receiptService.printReceiptPDF(orderId, printerId);
  }

  // Printer management endpoints
  @Get('printers')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getAvailablePrinters() {
    return this.receiptService.getAvailablePrinters();
  }

  @Post('printers/test')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async testPrinter(@Body('printerName') printerName: string) {
    const success = await this.receiptService.testPrinter(printerName);
    return { success, message: success ? 'Printer test successful' : 'Printer test failed' };
  }

  @Get('print-jobs')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getPrintQueue() {
    return this.receiptService.getPrintQueue();
  }

  @Get('print-jobs/:jobId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getPrintJobStatus(@Param('jobId') jobId: string) {
    return this.receiptService.getPrintJobStatus(jobId);
  }

  @Delete('print-jobs/:jobId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async cancelPrintJob(@Param('jobId') jobId: string) {
    const success = await this.receiptService.cancelPrintJob(jobId);
    return { success, message: success ? 'Print job cancelled' : 'Failed to cancel print job' };
  }

  // ========== DELIVERY MANAGEMENT ENDPOINTS ==========

  @Get('delivery-orders')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER)
  @RequiresRoleFeature('delivery-management')
  @ApiOperation({ summary: 'Get delivery orders' })
  async getDeliveryOrders(
    @Query('deliveryStatus') deliveryStatus: string | undefined,
    @Query('assignedDriverId') assignedDriverId: string | undefined,
    @Request() req: any,
  ) {
    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new BadRequestException('Branch ID not found');
    }

    return this.posService.getDeliveryOrders(
      branchId,
      deliveryStatus as any,
      assignedDriverId,
    );
  }

  @Post('orders/:orderId/assign-driver')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @RequiresRoleFeature('delivery-management')
  @ApiOperation({ summary: 'Assign driver to delivery order' })
  async assignDriver(
    @Param('orderId') orderId: string,
    @Body('driverId') driverId: string,
    @Request() req: any,
  ) {
    return this.posService.assignDriver(orderId, driverId, req.user.id);
  }

  @Patch('orders/:orderId/delivery-status')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER)
  @RequiresRoleFeature('delivery-management')
  @ApiOperation({ summary: 'Update delivery status' })
  async updateDeliveryStatus(
    @Param('orderId') orderId: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.posService.updateDeliveryStatus(
      orderId,
      status as any,
      req.user.id,
    );
  }
}

