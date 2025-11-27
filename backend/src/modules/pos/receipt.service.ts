import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
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
    private companiesService: CompaniesService,
    private branchesService: BranchesService,
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

    // Get branch and company to find public URL and logo
    let publicUrl: string | undefined;
    let companyLogo: string | undefined;
    try {
      const branch = await this.branchesService.findOne(order.branchId.toString());
      // Use branch's publicUrl if available, otherwise fallback to company slug
      if (branch?.publicUrl) {
        publicUrl = branch.publicUrl;
      }
      
      // Get company for logo and slug
      // branch.companyId might be populated (object) or ObjectId
      let companyIdStr: string | undefined;
      if (branch?.companyId) {
        // If populated, it's an object with _id
        if (typeof branch.companyId === 'object' && branch.companyId !== null) {
          // Check if it's a populated object with _id
          if ((branch.companyId as any)._id) {
            companyIdStr = (branch.companyId as any)._id.toString();
          } else if ((branch.companyId as any).id) {
            companyIdStr = (branch.companyId as any).id.toString();
          } else {
            // Try to get the ID from the object itself
            const branchCompanyId = branch.companyId as any;
            companyIdStr = branchCompanyId.toString ? branchCompanyId.toString() : String(branchCompanyId);
          }
        } else if (typeof branch.companyId === 'string') {
          companyIdStr = branch.companyId;
        } else {
          companyIdStr = branch.companyId.toString();
        }
        
        // Validate ObjectId format before calling findOne
        if (companyIdStr && /^[0-9a-fA-F]{24}$/.test(companyIdStr)) {
          try {
            const company = await this.companiesService.findOne(companyIdStr);
            // Get company logo
            if (company?.logo) {
              companyLogo = company.logo;
              console.log('Company logo found for receipt:', {
                companyId: companyIdStr,
                hasLogo: !!company.logo,
                logoUrl: company.logo?.substring(0, 50) + '...',
              });
            } else {
              console.log('No company logo found:', {
                companyId: companyIdStr,
                hasCompany: !!company,
                companyKeys: company ? Object.keys(company) : [],
              });
            }
            // Fallback: generate from company slug if branch doesn't have publicUrl
            if (!publicUrl && company?.slug) {
              const baseUrl = process.env.APP_URL || 'http://localhost:3000';
              publicUrl = `${baseUrl}/${company.slug}`;
              // If branch has slug, use it too
              if (branch.slug) {
                publicUrl = `${baseUrl}/${company.slug}/${branch.slug}`;
              }
            }
          } catch (companyError) {
            console.error('Error fetching company for logo:', {
              companyId: companyIdStr,
              error: companyError.message,
              branchCompanyId: branch.companyId,
              branchCompanyIdType: typeof branch.companyId,
              branchCompanyIdKeys: typeof branch.companyId === 'object' ? Object.keys(branch.companyId) : [],
            });
          }
        } else {
          console.warn('Invalid company ID format:', {
            companyId: companyIdStr,
            branchCompanyId: branch.companyId,
            branchCompanyIdType: typeof branch.companyId,
          });
        }
      }
    } catch (error) {
      // If we can't get the URL, continue without it
      console.warn('Could not retrieve public URL or logo for receipt:', error);
    }

    const safeItems = Array.isArray(order.items)
      ? order.items.map((item: any) => ({
          name: item?.name ?? '',
          quantity: Number(item?.quantity ?? 0),
          price: Number(item?.price ?? 0),
          notes: item?.notes ?? '',
        }))
      : [];

    const receiptData = {
      orderNumber: order.orderNumber,
      orderId: order._id,
      branchId: order.branchId,
      tableNumber: (order.tableId as any)?.number || 'N/A',
      customerInfo: order.customerInfo || undefined,
      items: safeItems,
      subtotal: this.calculateSubtotal(safeItems),
      taxRate: settings?.taxRate || 0,
      serviceCharge: settings?.serviceCharge || 0,
      taxAmount: this.calculateTax(safeItems, settings?.taxRate || 0),
      serviceChargeAmount: this.calculateServiceCharge(
        safeItems,
        settings?.serviceCharge || 0,
      ),
      totalAmount: Number(order.totalAmount || 0),
      paymentMethod: order.paymentMethod,
      paymentDetails: order.paymentId || undefined,
      createdAt: (order as any)?.createdAt || new Date(),
      completedAt: (order as any)?.completedAt || undefined,
      receiptSettings: {
        header: settings?.receiptSettings?.header || 'Restaurant Receipt',
        footer: settings?.receiptSettings?.footer || 'Thank you for your visit!',
        fontSize: settings?.receiptSettings?.fontSize || 12,
        paperWidth: settings?.receiptSettings?.paperWidth || 80,
        // Determine logo URL: use custom logoUrl if provided, otherwise use company logo if showLogo is enabled
        logoUrl: (() => {
          const customLogoUrl = settings?.receiptSettings?.logoUrl;
          const showLogoEnabled = settings?.receiptSettings?.showLogo === true;
          
          // If custom logo URL exists and is not empty, use it
          if (customLogoUrl && typeof customLogoUrl === 'string' && customLogoUrl.trim() !== '') {
            console.log('Receipt: Using custom logo URL from POS settings');
            return customLogoUrl.trim();
          }
          
          // If showLogo is enabled and company logo exists, use company logo
          if (showLogoEnabled && companyLogo) {
            console.log('Receipt: Using company logo (showLogo enabled)');
            return companyLogo;
          }
          
          // If showLogo is not explicitly false and company logo exists, use it
          if (settings?.receiptSettings?.showLogo !== false && companyLogo) {
            console.log('Receipt: Using company logo (showLogo not disabled)');
            return companyLogo;
          }
          
          console.log('Receipt: No logo URL set', {
            customLogoUrl: customLogoUrl || 'none',
            showLogoEnabled,
            hasCompanyLogo: !!companyLogo,
            posShowLogo: settings?.receiptSettings?.showLogo,
          });
          return undefined;
        })(),
        // Show logo if explicitly enabled in POS settings, or if company logo exists and not disabled
        showLogo: (() => {
          const posShowLogo = settings?.receiptSettings?.showLogo;
          const shouldShow = posShowLogo === true || 
                           (companyLogo && posShowLogo !== false);
          console.log('Receipt showLogo decision:', {
            posShowLogo,
            hasCompanyLogo: !!companyLogo,
            finalShowLogo: shouldShow,
            logoUrl: (() => {
              const customLogoUrl = settings?.receiptSettings?.logoUrl;
              if (customLogoUrl && typeof customLogoUrl === 'string' && customLogoUrl.trim() !== '') {
                return customLogoUrl.trim();
              }
              return companyLogo || undefined;
            })(),
          });
          return shouldShow;
        })(),
      },
      printerSettings: settings?.printerSettings || {
        enabled: false,
        printerId: '',
        autoPrint: false,
      },
      notes: order?.notes || undefined,
      publicUrl,
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
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'Courier New', monospace;
            font-size: ${receiptData.receiptSettings.fontSize || 12}px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            max-width: ${receiptData.receiptSettings.paperWidth || 80}mm;
            margin: 0 auto;
            background: #ffffff;
            color: #1f2937;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
            color: #111827;
        }
        .header .logo {
            max-width: 150px;
            max-height: 150px;
            width: 150px;
            height: 150px;
            display: block;
            margin: 0 auto 15px auto;
            object-fit: contain;
            border-radius: 50%;
            border: 2px solid #e5e7eb;
        }
        .header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: bold;
            color: #111827;
        }
        .order-info {
            margin-bottom: 20px;
            color: #111827;
        }
        .order-info div {
            margin-bottom: 5px;
        }
        .items {
            margin-bottom: 20px;
            color: #111827;
        }
        .item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px dotted #ccc;
            color: #111827;
        }
        .item-name {
            flex: 1;
        }
        .item-quantity {
            margin: 0 10px;
        }
        .item-price {
            font-weight: bold;
            color: #111827;
        }
        .totals {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 20px;
            color: #111827;
        }
        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            color: #111827;
        }
        .total-line.final {
            font-weight: bold;
            font-size: 16px;
            border-top: 1px solid #000;
            padding-top: 10px;
            margin-top: 10px;
            color: #0f172a;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #000;
            color: #111827;
        }
        .payment-info {
            margin-top: 20px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
            color: #111827;
        }
        .notes {
            margin-top: 15px;
            font-style: italic;
            color: #111827;
        }
    </style>
</head>
<body>
    <div class="header">
        ${receiptData.receiptSettings.showLogo && receiptData.receiptSettings.logoUrl ? 
          `<img src="${receiptData.receiptSettings.logoUrl}" alt="Logo" class="logo">` : ''}
        <h1>${receiptData.receiptSettings.header}</h1>
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

    ${receiptData.notes ? `
        <div class="notes">
            <strong>Order Notes:</strong> ${receiptData.notes}
        </div>
    ` : ''}

    <div class="footer">
        <div>${receiptData.receiptSettings.footer}</div>
        ${receiptData.publicUrl ? `
        <div style="margin-top: 10px; font-size: 11px; color: #0066cc;">
            <strong>Visit us online:</strong><br>
            <a href="${receiptData.publicUrl}" style="color: #0066cc; text-decoration: underline;">
                ${receiptData.publicUrl}
            </a>
        </div>
        ` : ''}
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
      // Use receiptSettings from receiptData which already includes company logo
      const settings = {
        receiptSettings: receiptData.receiptSettings,
      };

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