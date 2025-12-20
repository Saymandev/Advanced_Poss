import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PrinterConfig {
  name: string;
  type: 'thermal' | 'laser' | 'inkjet' | 'network';
  width: number; // in mm
  height?: number; // in mm
  networkUrl?: string;
  driver?: string;
  enabled: boolean;
}

export interface PrintJob {
  id: string;
  content: string | Buffer;
  printerName: string;
  copies: number;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'printing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);
  private printers: PrinterConfig[] = [];
  private printQueue: PrintJob[] = [];
  private isProcessing = false;

  constructor(private configService: ConfigService) {
    this.initializePrinters();
    this.startPrintQueueProcessor();
  }

  private initializePrinters() {
    // Load printer configurations from environment or config file
    const defaultPrinters: PrinterConfig[] = [
      {
        name: 'Thermal Receipt Printer',
        type: 'thermal',
        width: 80,
        enabled: true,
      },
      {
        name: 'Laser Printer',
        type: 'laser',
        width: 210,
        height: 297,
        enabled: true,
      },
      {
        name: 'Network Printer',
        type: 'network',
        width: 80,
        networkUrl: 'http://192.168.1.100:631/printers/receipt',
        enabled: false,
      },
    ];

    this.printers = this.configService.get('PRINTERS', defaultPrinters);
    this.logger.log(`Initialized ${this.printers.length} printers`);
  }

  async getAvailablePrinters(): Promise<PrinterConfig[]> {
    return this.printers.filter(p => p.enabled);
  }

  async getPrinterByName(name: string): Promise<PrinterConfig | null> {
    return this.printers.find(p => p.name === name && p.enabled) || null;
  }

  async addPrinter(printer: PrinterConfig): Promise<void> {
    this.printers.push(printer);
    this.logger.log(`Added printer: ${printer.name}`);
  }

  async updatePrinter(name: string, updates: Partial<PrinterConfig>): Promise<void> {
    const index = this.printers.findIndex(p => p.name === name);
    if (index !== -1) {
      this.printers[index] = { ...this.printers[index], ...updates };
      this.logger.log(`Updated printer: ${name}`);
    }
  }

  async removePrinter(name: string): Promise<void> {
    this.printers = this.printers.filter(p => p.name !== name);
    this.logger.log(`Removed printer: ${name}`);
  }

  async printReceipt(
    content: string | Buffer,
    printerName?: string,
    options?: {
      copies?: number;
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<PrintJob> {
    const printer = printerName 
      ? await this.getPrinterByName(printerName)
      : this.printers.find(p => p.enabled && p.type === 'thermal');

    if (!printer) {
      throw new Error(`Printer not found: ${printerName || 'default thermal printer'}`);
    }

    const job: PrintJob = {
      id: this.generateJobId(),
      content,
      printerName: printer.name,
      copies: options?.copies || 1,
      priority: options?.priority || 'normal',
      status: 'pending',
      createdAt: new Date(),
    };

    this.printQueue.push(job);
    this.logger.log(`Added print job ${job.id} to queue for printer ${printer.name}`);

    return job;
  }

  async printPDF(
    pdfBuffer: Buffer,
    printerName?: string,
    options?: {
      copies?: number;
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<PrintJob> {
    const printer = printerName 
      ? await this.getPrinterByName(printerName)
      : this.printers.find(p => p.enabled && p.type === 'laser');

    if (!printer) {
      throw new Error(`Printer not found: ${printerName || 'default laser printer'}`);
    }

    const job: PrintJob = {
      id: this.generateJobId(),
      content: pdfBuffer,
      printerName: printer.name,
      copies: options?.copies || 1,
      priority: options?.priority || 'normal',
      status: 'pending',
      createdAt: new Date(),
    };

    this.printQueue.push(job);
    this.logger.log(`Added PDF print job ${job.id} to queue for printer ${printer.name}`);

    return job;
  }

  async getPrintQueue(): Promise<PrintJob[]> {
    return [...this.printQueue];
  }

  async getPrintJob(jobId: string): Promise<PrintJob | null> {
    return this.printQueue.find(job => job.id === jobId) || null;
  }

  async cancelPrintJob(jobId: string): Promise<boolean> {
    const job = this.printQueue.find(j => j.id === jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      this.logger.log(`Cancelled print job ${jobId}`);
      return true;
    }
    return false;
  }

  private async startPrintQueueProcessor() {
    setInterval(async () => {
      if (!this.isProcessing && this.printQueue.length > 0) {
        await this.processPrintQueue();
      }
    }, 1000); // Check every second
  }

  private async processPrintQueue() {
    this.isProcessing = true;

    try {
      // Sort by priority and creation time
      const sortedJobs = this.printQueue
        .filter(job => job.status === 'pending')
        .sort((a, b) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

      for (const job of sortedJobs) {
        try {
          await this.executePrintJob(job);
        } catch (error) {
          this.logger.error(`Failed to print job ${job.id}:`, error);
          job.status = 'failed';
          job.error = error.message;
        }
      }

      // Remove completed and failed jobs older than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.printQueue = this.printQueue.filter(job => 
        job.status === 'pending' || 
        job.status === 'printing' || 
        (job.completedAt && job.completedAt > oneHourAgo)
      );

    } finally {
      this.isProcessing = false;
    }
  }

  private async executePrintJob(job: PrintJob) {
    job.status = 'printing';
    this.logger.log(`Processing print job ${job.id} on ${job.printerName}`);

    const printer = await this.getPrinterByName(job.printerName);
    if (!printer) {
      throw new Error(`Printer ${job.printerName} not found`);
    }

    try {
      switch (printer.type) {
        case 'thermal':
          await this.printToThermalPrinter(job, printer);
          break;
        case 'laser':
        case 'inkjet':
          await this.printToLaserPrinter(job, printer);
          break;
        case 'network':
          await this.printToNetworkPrinter(job, printer);
          break;
        default:
          throw new Error(`Unsupported printer type: ${printer.type}`);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      this.logger.log(`Completed print job ${job.id}`);

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      this.logger.error(`Print job ${job.id} failed:`, error);
    }
  }

  private async printToThermalPrinter(job: PrintJob, printer: PrinterConfig) {
    // For thermal printers, we typically print raw text
    const content = job.content instanceof Buffer ? job.content.toString() : job.content;
    
    // Create a temporary file for the content
    const tempFile = path.join(process.cwd(), 'temp', `receipt_${job.id}.txt`);
    await fs.promises.mkdir(path.dirname(tempFile), { recursive: true });
    await fs.promises.writeFile(tempFile, content, 'utf8');

    try {
      // Use system print command (Windows)
      if (process.platform === 'win32') {
        await execAsync(`type "${tempFile}" | prn /D:"${printer.name}"`);
      } else {
        // Linux/Mac
        await execAsync(`lp -d "${printer.name}" "${tempFile}"`);
      }
    } finally {
      // Clean up temp file
      try {
        await fs.promises.unlink(tempFile);
      } catch (error) {
        this.logger.warn(`Failed to delete temp file ${tempFile}:`, error);
      }
    }
  }

  private async printToLaserPrinter(job: PrintJob, printer: PrinterConfig) {
    if (job.content instanceof Buffer) {
      // PDF content
      const tempFile = path.join(process.cwd(), 'temp', `document_${job.id}.pdf`);
      await fs.promises.mkdir(path.dirname(tempFile), { recursive: true });
      await fs.promises.writeFile(tempFile, job.content);

      try {
        if (process.platform === 'win32') {
          await execAsync(`"${tempFile}" /t`);
        } else {
          await execAsync(`lp -d "${printer.name}" "${tempFile}"`);
        }
      } finally {
        try {
          await fs.promises.unlink(tempFile);
        } catch (error) {
          this.logger.warn(`Failed to delete temp file ${tempFile}:`, error);
        }
      }
    } else {
      // Text content - convert to PDF first or print directly
      await this.printToThermalPrinter(job, printer);
    }
  }

  private async printToNetworkPrinter(job: PrintJob, printer: PrinterConfig) {
    if (!printer.networkUrl) {
      throw new Error('Network printer URL not configured');
    }

    const content = job.content instanceof Buffer ? job.content : Buffer.from(job.content);
    
    // Send HTTP POST request to network printer
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(printer.networkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': content.length.toString(),
      },
      body: content,
    });

    if (!response.ok) {
      throw new Error(`Network printer error: ${response.status} ${response.statusText}`);
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getPrinterStatus(printerName: string): Promise<{
    online: boolean;
    jobs: number;
    lastJob?: Date;
  }> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`wmic printer where name="${printerName}" get workoffline`);
        const online = !stdout.includes('TRUE');
        return { online, jobs: 0 };
      } else {
        const { stdout } = await execAsync(`lpstat -p "${printerName}"`);
        const online = !stdout.includes('disabled');
        return { online, jobs: 0 };
      }
    } catch (error) {
      this.logger.warn(`Failed to get printer status for ${printerName}:`, error);
      return { online: false, jobs: 0 };
    }
  }

  async testPrinter(printerName: string): Promise<boolean> {
    try {
      const now = new Date();
      const formattedDate = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}, ${String(now.getHours() % 12 || 12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
      const testContent = `
=== PRINTER TEST ===
Date: ${formattedDate}
Printer: ${printerName}
Status: Working
==================
      `.trim();

      const job = await this.printReceipt(testContent, printerName);
      
      // Wait a bit for the job to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalJob = await this.getPrintJob(job.id);
      return finalJob?.status === 'completed';
    } catch (error) {
      this.logger.error(`Printer test failed for ${printerName}:`, error);
      return false;
    }
  }
}
