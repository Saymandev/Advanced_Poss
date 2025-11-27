import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateQRCodeDto } from './dto/create-qr-code.dto';
import { UpdateQRCodeDto } from './dto/update-qr-code.dto';
import { QRCodesService } from './qr-codes.service';

@ApiTags('QR Codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('qr-codes')
export class QRCodesController {
  constructor(private readonly qrCodesService: QRCodesService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new QR code for menu' })
  async create(
    @Body() createQRCodeDto: CreateQRCodeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.qrCodesService.generate(createQRCodeDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all QR codes' })
  async findAll(
    @Query('branchId') branchId?: string,
    @Query('tableNumber') tableNumber?: string,
  ) {
    // Parse tableNumber safely - convert string to number if provided
    let tableNum: number | undefined = undefined;
    if (tableNumber && tableNumber !== 'all' && tableNumber.trim() !== '') {
      const parsed = parseInt(tableNumber, 10);
      if (!isNaN(parsed) && parsed > 0) {
        tableNum = parsed;
      }
    }
    return this.qrCodesService.findAll(branchId, tableNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a QR code by ID' })
  async findOne(@Param('id') id: string) {
    return this.qrCodesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a QR code' })
  async update(
    @Param('id') id: string,
    @Body() updateQRCodeDto: UpdateQRCodeDto,
  ) {
    return this.qrCodesService.update(id, updateQRCodeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a QR code' })
  async remove(@Param('id') id: string) {
    await this.qrCodesService.delete(id);
    return { message: 'QR code deleted successfully' };
  }
}

