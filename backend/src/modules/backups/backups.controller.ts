import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Schema as MongooseSchema } from 'mongoose';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BackupsService } from './backups.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { BackupScope, BackupStatus, BackupType } from './schemas/backup.schema';

@Controller('backups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  // Create a new backup
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async create(
    @Body() createBackupDto: CreateBackupDto,
    @CurrentUser('_id') userId: MongooseSchema.Types.ObjectId,
  ) {
    return await this.backupsService.create(createBackupDto, userId);
  }

  // Get all backups
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async findAll(
    @Query('type') type?: BackupType,
    @Query('status') status?: BackupStatus,
    @Query('scope') scope?: BackupScope,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.backupsService.findAll({
      type,
      status,
      scope,
      companyId: companyId
        ? (companyId as unknown as MongooseSchema.Types.ObjectId)
        : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  // Get backup by ID
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async findOne(@Param('id') id: string) {
    return await this.backupsService.findById(id);
  }

  // Restore backup
  @Post(':id/restore')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async restore(
    @Param('id') id: string,
    @Body() restoreDto: RestoreBackupDto,
    @CurrentUser('_id') userId: MongooseSchema.Types.ObjectId,
  ) {
    return await this.backupsService.restore(id, restoreDto, userId);
  }

  // Download backup
  @Get(':id/download')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async download(@Param('id') id: string, @Res() res: Response) {
    const { filePath, fileName } = await this.backupsService.downloadBackup(id);

    res.download(filePath, fileName, (err) => {
      if (err) {
        res.status(500).json({
          success: false,
          message: 'Failed to download backup',
          error: err.message,
        });
      }
    });
  }

  // Delete backup
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async remove(@Param('id') id: string) {
    await this.backupsService.delete(id);
    return {
      message: 'Backup deleted successfully',
    };
  }

  // Get backup statistics
  @Get('stats/overview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async getStatistics() {
    return await this.backupsService.getStatistics();
  }

  // Export data
  @Post('export')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async exportData(
    @Body('collections') collections: string[],
    @Res() res: Response,
    @Body('format') format: 'json' | 'csv' = 'json',
    @Body('filters') filters?: any,
  ) {
    const filePath = await this.backupsService.exportData(
      collections,
      format,
      filters,
    );

    res.download(filePath, `export_${Date.now()}.${format}`, (err) => {
      if (err) {
        res.status(500).json({
          success: false,
          message: 'Failed to export data',
          error: err.message,
        });
      }
    });
  }

  // Import data
  @Post('import')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  async importData(@Body('filePath') filePath: string) {
    await this.backupsService.importData(filePath);
    return {
      message: 'Data imported successfully',
    };
  }
}

