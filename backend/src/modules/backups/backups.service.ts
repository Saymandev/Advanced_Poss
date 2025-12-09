import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { Connection, Model, Schema as MongooseSchema } from 'mongoose';
import * as path from 'path';
import { promisify } from 'util';
// import { WinstonLoggerService } from '../../common/logger/winston.logger';
import { CreateBackupDto } from './dto/create-backup.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { Backup, BackupDocument, BackupScope, BackupStatus, BackupType } from './schemas/backup.schema';

const execAsync = promisify(exec);

@Injectable()
export class BackupsService {
  // private readonly logger = new WinstonLoggerService('BackupsService');
  private readonly backupDir: string;
  private readonly retentionDays: number;

  constructor(
    @InjectModel(Backup.name)
    private backupModel: Model<BackupDocument>,
    @InjectConnection() private connection: Connection,
    private configService: ConfigService,
  ) {
    this.backupDir = this.configService.get<string>('backup.dir') || './backups';
    this.retentionDays = this.configService.get<number>('backup.retentionDays') || 30;

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Create a new backup
  async create(
    createBackupDto: CreateBackupDto,
    userId: MongooseSchema.Types.ObjectId,
  ): Promise<BackupDocument> {
    try {
      const backup = new this.backupModel({
        ...createBackupDto,
        status: BackupStatus.PENDING,
        createdBy: userId,
        expiresAt: this.calculateExpirationDate(),
      });

      await backup.save();

      // Start backup process asynchronously
      this.processBackup(backup._id.toString()).catch((error) => {
        // this.logger.error(`Backup failed: ${backup._id}`, error);
      });

      return backup;
    } catch (error) {
      // this.logger.error('Failed to create backup', error);
      throw error;
    }
  }

  // Process backup
  private async processBackup(backupId: string): Promise<void> {
    const backup = await this.backupModel.findById(backupId);

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    try {
      backup.status = BackupStatus.IN_PROGRESS;
      backup.startedAt = new Date();
      await backup.save();

      const mongoUri = this.configService.get<string>('database.uri');
      const dbName = this.extractDatabaseName(mongoUri);
      const timestamp = Date.now();
      const fileName = `backup_${dbName}_${timestamp}.gz`;
      const filePath = path.join(this.backupDir, fileName);

      // Build mongodump command
      let command = `mongodump --uri="${mongoUri}" --archive="${filePath}" --gzip`;

      // Add scope-specific options
      if (backup.scope === BackupScope.COMPANY && backup.companyId) {
        command += ` --query '{"companyId": {"$oid": "${backup.companyId}"}}'`;
      } else if (backup.scope === BackupScope.BRANCH && backup.branchId) {
        command += ` --query '{"branchId": {"$oid": "${backup.branchId}"}}'`;
      } else if (backup.scope === BackupScope.COLLECTION && backup.collections.length > 0) {
        // Backup specific collections
        for (const collection of backup.collections) {
          command += ` --collection=${collection}`;
        }
      }

      // Execute mongodump
      // this.logger.log(`Executing backup: ${command.replace(mongoUri, '[HIDDEN]')}`);
      await execAsync(command);

      // Get file stats
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Calculate checksum
      const checksum = await this.calculateChecksum(filePath);

      // Get metadata
      const metadata = await this.getBackupMetadata(backup.scope, backup.companyId, backup.branchId);

      // Update backup record
      backup.status = BackupStatus.COMPLETED;
      backup.filePath = filePath;
      backup.fileName = fileName;
      backup.fileSize = fileSize;
      backup.checksum = checksum;
      backup.completedAt = new Date();
      backup.duration = backup.completedAt.getTime() - backup.startedAt.getTime();
      backup.isCompressed = true;
      backup.metadata = metadata;

      await backup.save();

      // this.logger.log(`Backup completed successfully: ${backup._id}`);
    } catch (error) {
      backup.status = BackupStatus.FAILED;
      backup.error = error.message;
      backup.completedAt = new Date();
      backup.duration = backup.completedAt.getTime() - backup.startedAt.getTime();
      await backup.save();

      // this.logger.error(`Backup failed: ${backup._id}`, error);
      throw error;
    }
  }

  // Restore backup
  async restore(
    backupId: string,
    restoreDto: RestoreBackupDto,
    userId: MongooseSchema.Types.ObjectId,
  ): Promise<BackupDocument> {
    const backup = await this.findById(backupId);

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new BadRequestException('Backup is not in completed state');
    }

    if (!fs.existsSync(backup.filePath)) {
      throw new NotFoundException('Backup file not found');
    }

    try {
      backup.status = BackupStatus.RESTORING;
      await backup.save();

      const mongoUri = this.configService.get<string>('database.uri');

      // Build mongorestore command
      let command = `mongorestore --uri="${mongoUri}" --archive="${backup.filePath}" --gzip`;

      if (restoreDto.dropExisting) {
        command += ' --drop';
      }

      // Execute mongorestore
      // this.logger.log(`Executing restore: ${command.replace(mongoUri, '[HIDDEN]')}`);
      await execAsync(command);

      backup.status = BackupStatus.RESTORED;
      backup.restoredAt = new Date();
      backup.restoredBy = userId;
      await backup.save();

      // this.logger.log(`Backup restored successfully: ${backup._id}`);
      return backup;
    } catch (error) {
      backup.status = BackupStatus.FAILED;
      backup.error = error.message;
      await backup.save();

      // this.logger.error(`Restore failed: ${backup._id}`, error);
      throw error;
    }
  }

  // Get all backups
  async findAll(filters: {
    type?: BackupType;
    status?: BackupStatus;
    scope?: BackupScope;
    companyId?: MongooseSchema.Types.ObjectId;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ backups: BackupDocument[]; total: number }> {
    const query: any = { isActive: true };

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.scope) query.scope = filters.scope;
    if (filters.companyId) query.companyId = filters.companyId;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [backups, total] = await Promise.all([
      this.backupModel
        .find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('restoredBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean()
        .exec(),
      this.backupModel.countDocuments(query),
    ]);

    // @ts-ignore - Mongoose lean type
    return { backups, total };
  }

  // Get backup by ID
  async findById(id: string): Promise<BackupDocument> {
    const backup = await this.backupModel
      .findOne({ _id: id, isActive: true })
      .populate('createdBy', 'firstName lastName email')
      .populate('restoredBy', 'firstName lastName email')
      .exec();

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    return backup;
  }

  // Download backup file
  async downloadBackup(id: string): Promise<{ filePath: string; fileName: string }> {
    const backup = await this.findById(id);

    if (!fs.existsSync(backup.filePath)) {
      throw new NotFoundException('Backup file not found');
    }

    return {
      filePath: backup.filePath,
      fileName: backup.fileName,
    };
  }

  // Delete backup
  async delete(id: string): Promise<void> {
    const backup = await this.findById(id);

    // Delete backup file
    if (fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }

    backup.isActive = false;
    await backup.save();

    // this.logger.log(`Backup deleted: ${id}`);
  }

  // Get backup statistics
  async getStatistics(): Promise<any> {
    const [
      total,
      totalSize,
      byStatus,
      byType,
      recent,
    ] = await Promise.all([
      this.backupModel.countDocuments({ isActive: true }),
      this.backupModel.aggregate([
        { $match: { isActive: true, status: BackupStatus.COMPLETED } },
        { $group: { _id: null, totalSize: { $sum: '$fileSize' } } },
      ]),
      this.backupModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.backupModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.backupModel
        .find({ isActive: true, status: BackupStatus.COMPLETED })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name fileName fileSize createdAt')
        .lean()
        .exec(),
    ]);

    return {
      total,
      totalSize: totalSize[0]?.totalSize || 0,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recent,
    };
  }

  // Export data
  async exportData(
    collections: string[],
    format: 'json' | 'csv' = 'json',
    filters?: any,
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const fileName = `export_${timestamp}.${format}`;
      const filePath = path.join(this.backupDir, fileName);

      const exportData: any = {};

      for (const collectionName of collections) {
        const model = this.connection.model(collectionName);
        const query = filters?.[collectionName] || {};
        const data = await model.find(query).lean().exec();
        exportData[collectionName] = data;
      }

      if (format === 'json') {
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      } else {
        // For CSV, would need additional processing
        // Simplified for now
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      }

      return filePath;
    } catch (error) {
      // this.logger.error('Failed to export data', error);
      throw error;
    }
  }

  // Import data
  async importData(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Import file not found');
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      for (const [collectionName, documents] of Object.entries(data)) {
        const model = this.connection.model(collectionName);
        await model.insertMany(documents as any[]);
      }

      // this.logger.log(`Data imported successfully from: ${filePath}`);
    } catch (error) {
      // this.logger.error('Failed to import data', error);
      throw error;
    }
  }

  // Scheduled automatic backup (daily at 2 AM)
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledBackup() {
    try {
      // this.logger.log('Starting scheduled backup');

      const backup = new this.backupModel({
        name: `Scheduled Backup - ${new Date().toISOString()}`,
        description: 'Automatic daily backup',
        type: BackupType.AUTOMATIC,
        status: BackupStatus.PENDING,
        scope: BackupScope.FULL,
        createdBy: null, // System generated
        expiresAt: this.calculateExpirationDate(),
      });

      await backup.save();

      await this.processBackup(backup._id.toString());

      // this.logger.log('Scheduled backup completed');
    } catch (error) {
      // this.logger.error('Scheduled backup failed', error);
    }
  }

  // Clean up expired backups (daily at 3 AM)
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredBackups() {
    try {
      const expiredBackups = await this.backupModel.find({
        isActive: true,
        expiresAt: { $lte: new Date() },
      });

      for (const backup of expiredBackups) {
        if (fs.existsSync(backup.filePath)) {
          fs.unlinkSync(backup.filePath);
        }

        backup.isActive = false;
        await backup.save();
      }

      // this.logger.log(`Cleaned up ${expiredBackups.length} expired backups`);
    } catch (error) {
      // this.logger.error('Failed to cleanup expired backups', error);
    }
  }

  // Helper methods
  private extractDatabaseName(mongoUri: string): string {
    try {
      const url = new URL(mongoUri);
      return url.pathname.substring(1) || 'database';
    } catch {
      return 'database';
    }
  }

  private calculateExpirationDate(): Date {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.retentionDays);
    return expirationDate;
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async getBackupMetadata(
    scope: BackupScope,
    companyId?: MongooseSchema.Types.ObjectId,
    branchId?: MongooseSchema.Types.ObjectId,
  ): Promise<any> {
    const metadata: any = {
      collections: [],
      totalDocuments: 0,
    };

    const collections = await this.connection.db.listCollections().toArray();

    for (const collection of collections) {
      const collectionName = collection.name;
      const model = this.connection.model(collectionName);

      let query: any = {};
      if (scope === BackupScope.COMPANY && companyId) {
        query.companyId = companyId;
      } else if (scope === BackupScope.BRANCH && branchId) {
        query.branchId = branchId;
      }

      const count = await model.countDocuments(query);

      metadata.collections.push({
        name: collectionName,
        documentCount: count,
      });

      metadata.totalDocuments += count;
    }

    return metadata;
  }
}

