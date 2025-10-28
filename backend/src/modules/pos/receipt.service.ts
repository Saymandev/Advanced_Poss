import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PDFGeneratorService } from './pdf-generator.service';
import { PrinterService, PrintJob } from './printer.service';
import { POSOrder, POSOrderDocument } from './schemas/pos-order.schema';
import { POSSettings, POSSettingsDocument } from './schemas/pos-settings.schema';

@Injectable()
export class ReceiptService {
  constructor(
    @InjectModel(POSOrder.name) private posOrderModel: Model<POSOrderDocument>,
    @InjectModel(POSSettings.name) private posSettingsModel: Model<POSSettingsDocument>,
    private pdfGeneratorService: PDFGeneratorService,
    private printerService: PrinterService,
  ) {}

  // Generate receipt data
  async generateReceiptData(orderId: string): Promise<any> {
    const order = await this.posOrderModel
      .findById(orderId)
      .populate('tableId', 'number capacity')
      .populate('userId', 'name email')
      .populate('paymentId')
      .exec();

    if (!order) {
      throw new Error('Order not found');
    }

    const settings = await this.posSettingsModel
      .findOne({ branchId: order.branchId })
      .exec();

    const receiptData = {
      orderNumber: order.orderNumber,
      orderId: order._id,
      tableNumber: (order.tableId as any)?.number || 'N/A',
      customerInfo: order.customerInfo,
      items: order.items,
      subtotal: this.calculateSubtotal(order.items),
      taxRate: settings?.taxRate || 0,
      serviceCharge: settings?.serviceCharge || 0,
      taxAmount: this.calculateTax(order.items, settings?.taxRate || 0),
      serviceChargeAmount: this.calculateServiceCharge(order.items, settings?.serviceCharge || 0),
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentDetails: order.paymentId,
      createdAt: (order as any).createdAt,
      completedAt: (order as any).completedAt,
      receiptSettings: settings?.receiptSettings || {
        header: 'Restaurant Receipt',
        footer: 'Thank you for your visit!',
        showLogo: false,
      },
      printerSettings: settings?.printerSettings || {
        enabled: false,
        printerId: '',
        autoPrint: false,
      },
    };

    return receiptData;
  }

  // Generate receipt HTML
  async generateReceiptHTML(orderId: string): Promise<string> {
    const receiptData = await this.generateReceiptData(orderId);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt - ${receiptData.orderNumber}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            font-size: ${receiptData.receiptSettings.fontSize || 12}px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            max-width: ${receiptData.receiptSettings.paperWidth || 80}mm;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: bold;
        }
        .order-info {
            margin-bottom: 20px;
        }
        .order-info div {
            margin-bottom: 5px;
        }
        .items {
            margin-bottom: 20px;
        }
        .item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px dotted #ccc;
        }
        .item-name {
            flex: 1;
        }
        .item-quantity {
            margin: 0 10px;
        }
        .item-price {
            font-weight: bold;
        }
        .totals {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 20px;
        }
        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .total-line.final {
            font-weight: bold;
            font-size: 16px;
            border-top: 1px solid #000;
            padding-top: 10px;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #000;
        }
        .payment-info {
            margin-top: 20px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        .notes {
            margin-top: 15px;
            font-style: italic;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${receiptData.receiptSettings.header}</h1>
        ${receiptData.receiptSettings.showLogo && receiptData.receiptSettings.logoUrl ? 
          `<img src="${receiptData.receiptSettings.logoUrl}" alt="Logo" style="max-width: 100px; max-height: 50px;">` : ''}
    </div>

    <div class="order-info">
        <div><strong>Order #:</strong> ${receiptData.orderNumber}</div>
        <div><strong>Table #:</strong> ${receiptData.tableNumber}</div>
        <div><strong>Date:</strong> ${new Date(receiptData.createdAt).toLocaleString()}</div>
        ${receiptData.customerInfo?.name ? `<div><strong>Customer:</strong> ${receiptData.customerInfo.name}</div>` : ''}
        ${receiptData.customerInfo?.phone ? `<div><strong>Phone:</strong> ${receiptData.customerInfo.phone}</div>` : ''}
    </div>

    <div class="items">
        <div style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">
            <span>Item</span>
            <span style="float: right;">Qty × Price</span>
        </div>
        ${receiptData.items.map(item => `
            <div class="item">
                <div class="item-name">${item.name || 'Menu Item'}</div>
                <div class="item-quantity">${item.quantity} × $${item.price.toFixed(2)}</div>
                <div class="item-price">$${(item.quantity * item.price).toFixed(2)}</div>
            </div>
            ${item.notes ? `<div style="font-size: 10px; color: #666; margin-left: 10px; margin-bottom: 5px;">Note: ${item.notes}</div>` : ''}
        `).join('')}
    </div>

    <div class="totals">
        <div class="total-line">
            <span>Subtotal:</span>
            <span>$${receiptData.subtotal.toFixed(2)}</span>
        </div>
        ${receiptData.taxRate > 0 ? `
            <div class="total-line">
                <span>Tax (${receiptData.taxRate}%):</span>
                <span>$${receiptData.taxAmount.toFixed(2)}</span>
            </div>
        ` : ''}
        ${receiptData.serviceCharge > 0 ? `
            <div class="total-line">
                <span>Service Charge (${receiptData.serviceCharge}%):</span>
                <span>$${receiptData.serviceChargeAmount.toFixed(2)}</span>
            </div>
        ` : ''}
        <div class="total-line final">
            <span>TOTAL:</span>
            <span>$${receiptData.totalAmount.toFixed(2)}</span>
        </div>
    </div>

    ${receiptData.paymentMethod ? `
        <div class="payment-info">
            <div><strong>Payment Method:</strong> ${receiptData.paymentMethod.toUpperCase()}</div>
            ${receiptData.paymentDetails?.transactionId ? `<div><strong>Transaction ID:</strong> ${receiptData.paymentDetails.transactionId}</div>` : ''}
            ${receiptData.paymentDetails?.referenceNumber ? `<div><strong>Reference:</strong> ${receiptData.paymentDetails.referenceNumber}</div>` : ''}
        </div>
    ` : ''}

    ${receiptData.order.notes ? `
        <div class="notes">
            <strong>Order Notes:</strong> ${receiptData.order.notes}
        </div>
    ` : ''}

    <div class="footer">
        <div>${receiptData.receiptSettings.footer}</div>
        <div style="margin-top: 10px; font-size: 10px;">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  // Generate receipt PDF using Puppeteer
  async generateReceiptPDF(orderId: string): Promise<Buffer> {
    try {
      const receiptData = await this.generateReceiptData(orderId);
      const settings = await this.posSettingsModel
        .findOne({ branchId: receiptData.branchId })
        .exec();

      return await this.pdfGeneratorService.generateReceiptPDFFromOrder(receiptData, settings);
    } catch (error) {
      // Fallback to HTML if PDF generation fails
      const html = await this.generateReceiptHTML(orderId);
      return Buffer.from(html, 'utf-8');
    }
  }

  // Print receipt to printer
  async printReceipt(orderId: string, printerId?: string): Promise<{ success: boolean; message: string; jobId?: string }> {
    try {
      const receiptData = await this.generateReceiptData(orderId);
      
      if (!receiptData.printerSettings.enabled) {
        return {
          success: false,
          message: 'Printing is not enabled for this branch'
        };
      }

      // Generate receipt content
      const htmlContent = await this.generateReceiptHTML(orderId);
      
      // Send to printer
      const printJob = await this.printerService.printReceipt(
        htmlContent,
        printerId || receiptData.printerSettings.printerId,
        {
          copies: receiptData.printerSettings.copies || 1,
          priority: receiptData.printerSettings.priority || 'normal'
        }
      );

      return {
        success: true,
        message: `Receipt sent to printer successfully`,
        jobId: printJob.id
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to print receipt: ${error.message}`
      };
    }
  }

  // Print receipt as PDF
  async printReceiptPDF(orderId: string, printerId?: string): Promise<{ success: boolean; message: string; jobId?: string }> {
    try {
      const receiptData = await this.generateReceiptData(orderId);
      
      if (!receiptData.printerSettings.enabled) {
        return {
          success: false,
          message: 'Printing is not enabled for this branch'
        };
      }

      // Generate PDF
      const pdfBuffer = await this.generateReceiptPDF(orderId);
      
      // Send PDF to printer
      const printJob = await this.printerService.printPDF(
        pdfBuffer,
        printerId || receiptData.printerSettings.printerId,
        {
          copies: receiptData.printerSettings.copies || 1,
          priority: receiptData.printerSettings.priority || 'normal'
        }
      );

      return {
        success: true,
        message: `PDF receipt sent to printer successfully`,
        jobId: printJob.id
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to print PDF receipt: ${error.message}`
      };
    }
  }

  // Get print job status
  async getPrintJobStatus(jobId: string): Promise<PrintJob | null> {
    return await this.printerService.getPrintJob(jobId);
  }

  // Cancel print job
  async cancelPrintJob(jobId: string): Promise<boolean> {
    return await this.printerService.cancelPrintJob(jobId);
  }

  // Get available printers
  async getAvailablePrinters(): Promise<any[]> {
    return await this.printerService.getAvailablePrinters();
  }

  // Test printer
  async testPrinter(printerName: string): Promise<boolean> {
    return await this.printerService.testPrinter(printerName);
  }

  async getPrintQueue(): Promise<PrintJob[]> {
    return await this.printerService.getPrintQueue();
  }

  // Calculate subtotal
  private calculateSubtotal(items: any[]): number {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  }

  // Calculate tax amount
  private calculateTax(items: any[], taxRate: number): number {
    const subtotal = this.calculateSubtotal(items);
    return (subtotal * taxRate) / 100;
  }

  // Calculate service charge
  private calculateServiceCharge(items: any[], serviceCharge: number): number {
    const subtotal = this.calculateSubtotal(items);
    return (subtotal * serviceCharge) / 100;
  }

  // Get receipt settings for a branch
  async getReceiptSettings(branchId: string): Promise<any> {
    const settings = await this.posSettingsModel
      .findOne({ branchId })
      .exec();

    return settings?.receiptSettings || {
      header: 'Restaurant Receipt',
      footer: 'Thank you for your visit!',
      showLogo: false,
      fontSize: 12,
      paperWidth: 80,
    };
  }

  // Update receipt settings
  async updateReceiptSettings(branchId: string, receiptSettings: any): Promise<any> {
    return this.posSettingsModel.findOneAndUpdate(
      { branchId },
      { $set: { receiptSettings } },
      { new: true, upsert: true }
    ).exec();
  }
}