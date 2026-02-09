import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { FEATURES } from '../../common/constants/features.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { CreatePrinterConfigDto, PrinterTestDto, PrintJobDto, UpdatePrinterConfigDto } from './dto/printer-config.dto';
import { PrinterService } from './printer.service';

@Controller('pos/printers')
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
export class PrinterManagementController {
  constructor(private readonly printerService: PrinterService) { }

  @Get()
  @RequiresFeature(FEATURES.PRINTER_MANAGEMENT)
  async getPrinters() {
    return this.printerService.getAvailablePrinters();
  }

  @Post()
  @RequiresFeature(FEATURES.PRINTER_MANAGEMENT)
  async createPrinter(@Body() createPrinterDto: CreatePrinterConfigDto) {
    return this.printerService.addPrinter(createPrinterDto as any);
  }

  @Put(':name')
  @RequiresFeature(FEATURES.PRINTER_MANAGEMENT)
  async updatePrinter(
    @Param('name') name: string,
    @Body() updatePrinterDto: UpdatePrinterConfigDto,
  ) {
    return this.printerService.updatePrinter(name, updatePrinterDto as any);
  }

  @Delete(':name')
  @RequiresFeature(FEATURES.PRINTER_MANAGEMENT)
  async deletePrinter(@Param('name') name: string) {
    return this.printerService.removePrinter(name);
  }

  @Get(':name/status')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  async getPrinterStatus(@Param('name') name: string) {
    return this.printerService.getPrinterStatus(name);
  }

  @Post('test')
  @RequiresFeature(FEATURES.PRINTER_MANAGEMENT)
  async testPrinter(@Body() testDto: PrinterTestDto) {
    const success = await this.printerService.testPrinter(testDto.printerName);
    return {
      success,
      message: success ? 'Printer test successful' : 'Printer test failed',
    };
  }

  @Get('queue')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  async getPrintQueue() {
    return this.printerService.getPrintQueue();
  }

  @Get('queue/:jobId')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  async getPrintJob(@Param('jobId') jobId: string) {
    return this.printerService.getPrintJob(jobId);
  }

  @Delete('queue/:jobId')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  async cancelPrintJob(@Param('jobId') jobId: string) {
    const success = await this.printerService.cancelPrintJob(jobId);
    return {
      success,
      message: success ? 'Print job cancelled' : 'Failed to cancel print job',
    };
  }

  @Post('print')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  async printContent(@Body() printJobDto: PrintJobDto) {
    return this.printerService.printReceipt(
      printJobDto.content,
      printJobDto.printerName,
      {
        copies: printJobDto.copies,
        priority: printJobDto.priority as any,
      },
    );
  }
}
