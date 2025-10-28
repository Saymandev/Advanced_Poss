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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePrinterConfigDto, PrinterTestDto, PrintJobDto, UpdatePrinterConfigDto } from './dto/printer-config.dto';
import { PrinterService } from './printer.service';

@Controller('pos/printers')
@UseGuards(JwtAuthGuard)
export class PrinterManagementController {
  constructor(private readonly printerService: PrinterService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getPrinters() {
    return this.printerService.getAvailablePrinters();
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async createPrinter(@Body() createPrinterDto: CreatePrinterConfigDto) {
    return this.printerService.addPrinter(createPrinterDto as any);
  }

  @Put(':name')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async updatePrinter(
    @Param('name') name: string,
    @Body() updatePrinterDto: UpdatePrinterConfigDto,
  ) {
    return this.printerService.updatePrinter(name, updatePrinterDto as any);
  }

  @Delete(':name')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async deletePrinter(@Param('name') name: string) {
    return this.printerService.removePrinter(name);
  }

  @Get(':name/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getPrinterStatus(@Param('name') name: string) {
    return this.printerService.getPrinterStatus(name);
  }

  @Post('test')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async testPrinter(@Body() testDto: PrinterTestDto) {
    const success = await this.printerService.testPrinter(testDto.printerName);
    return {
      success,
      message: success ? 'Printer test successful' : 'Printer test failed',
    };
  }

  @Get('queue')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getPrintQueue() {
    return this.printerService.getPrintQueue();
  }

  @Get('queue/:jobId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getPrintJob(@Param('jobId') jobId: string) {
    return this.printerService.getPrintJob(jobId);
  }

  @Delete('queue/:jobId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async cancelPrintJob(@Param('jobId') jobId: string) {
    const success = await this.printerService.cancelPrintJob(jobId);
    return {
      success,
      message: success ? 'Print job cancelled' : 'Failed to cancel print job',
    };
  }

  @Post('print')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
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
