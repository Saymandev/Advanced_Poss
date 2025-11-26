import {
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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePOSOrderDto } from './dto/create-pos-order.dto';
import { POSOrderFiltersDto, POSStatsFiltersDto } from './dto/pos-filters.dto';
import { UpdatePOSSettingsDto } from './dto/pos-settings.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { UpdatePOSOrderDto } from './dto/update-pos-order.dto';
import { POSService } from './pos.service';
import { ReceiptService } from './receipt.service';

@Controller('pos')
@UseGuards(JwtAuthGuard)
export class POSController {
  constructor(
    private readonly posService: POSService,
    private readonly receiptService: ReceiptService,
  ) {}

  // POS Orders
  @Post('orders')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async createOrder(@Body() createOrderDto: CreatePOSOrderDto, @Request() req) {
    const companyId = req.user?.companyId || req.user?.company?.id || req.user?.company?._id;
    return this.posService.createOrder(createOrderDto, req.user.id, req.user.branchId, companyId);
  }

  @Get('orders')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
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
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
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
}

