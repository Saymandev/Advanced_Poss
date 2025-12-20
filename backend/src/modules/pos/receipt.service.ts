import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as qrcode from 'qrcode';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
import { SettingsService } from '../settings/settings.service';
import { Table, TableDocument } from '../tables/schemas/table.schema';
import { PDFGeneratorService } from './pdf-generator.service';
import { PrinterService, PrintJob } from './printer.service';
import { POSOrder, POSOrderDocument } from './schemas/pos-order.schema';
import { POSSettings, POSSettingsDocument } from './schemas/pos-settings.schema';
@Injectable()
export class ReceiptService {
  constructor(
    @InjectModel(POSOrder.name) private posOrderModel: Model<POSOrderDocument>,
    @InjectModel(POSSettings.name) private posSettingsModel: Model<POSSettingsDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    private pdfGeneratorService: PDFGeneratorService,
    private printerService: PrinterService,
    private companiesService: CompaniesService,
    private branchesService: BranchesService,
    private settingsService: SettingsService,
    private configService: ConfigService,
  ) {}
  // Helper function to format currency
  private formatCurrency(amount: number, currency: string = 'BDT'): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch (error) {
      // Fallback to simple format if currency code is invalid
      return `${currency} ${amount.toFixed(2)}`;
    }
  }
  // Helper function to format receipt date with company timezone and format
  private formatReceiptDate(
    date: Date | string | undefined,
    timezone: string = 'Asia/Dhaka',
    dateFormat: string = 'DD/MM/YYYY',
    timeFormat: '12h' | '24h' = '12h',
  ): string {
    try {
      const dateObj = date ? new Date(date) : new Date();
      
      // Use Intl.DateTimeFormat to format in the company's timezone
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: timeFormat === '12h',
      };
      
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(dateObj);
      
      // Extract parts
      const year = parts.find(p => p.type === 'year')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      const hour = parts.find(p => p.type === 'hour')?.value || '';
      const minute = parts.find(p => p.type === 'minute')?.value || '';
      const second = parts.find(p => p.type === 'second')?.value || '';
      const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || '';
      
      // Format date based on company's dateFormat preference
      let formattedDate: string;
      switch (dateFormat) {
        case 'DD/MM/YYYY':
          formattedDate = `${day}/${month}/${year}`;
          break;
        case 'MM/DD/YYYY':
          formattedDate = `${month}/${day}/${year}`;
          break;
        case 'YYYY-MM-DD':
          formattedDate = `${year}-${month}-${day}`;
          break;
        case 'YYYY/MM/DD':
          formattedDate = `${year}/${month}/${day}`;
          break;
        default:
          formattedDate = `${day}/${month}/${year}`; // Default to DD/MM/YYYY
      }
      
      // Format time
      const formattedTime = timeFormat === '12h' 
        ? `${hour}:${minute}:${second} ${dayPeriod}`
        : `${hour}:${minute}:${second}`;
      
      return `${formattedDate}, ${formattedTime}`;
    } catch (error) {
      // Fallback to simple format if timezone conversion fails
      try {
        const dateObj = date ? new Date(date) : new Date();
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = dateObj.getHours();
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        
        // Apply date format
        let formattedDate: string;
        switch (dateFormat) {
          case 'DD/MM/YYYY':
            formattedDate = `${day}/${month}/${year}`;
            break;
          case 'MM/DD/YYYY':
            formattedDate = `${month}/${day}/${year}`;
            break;
          default:
            formattedDate = `${day}/${month}/${year}`;
        }
        
        const formattedTime = timeFormat === '12h'
          ? `${displayHours}:${minutes}:${seconds} ${ampm}`
          : `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
        
        return `${formattedDate}, ${formattedTime}`;
      } catch (fallbackError) {
        return date ? new Date(date).toISOString() : new Date().toISOString();
      }
    }
  }
  // Generate receipt data
  async generateReceiptData(orderId: string): Promise<any> {
    const order = await this.posOrderModel
      .findById(orderId)
      .populate('tableId', 'tableNumber capacity')
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
    let company: any = null; // Store company for later use
    try {
      const branch = await this.branchesService.findOne(order.branchId.toString());
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
            company = await this.companiesService.findOne(companyIdStr);
            // Get company logo
            if (company?.logo) {
              companyLogo = company.logo;
            }
            // Generate public URL - always use current APP_URL, don't use stored branch.publicUrl
            // Prioritize custom domain, then slug-based
            if (company?.customDomain && company?.domainVerified) {
              // Use custom domain
              const protocol = 'https://';
              if (branch.slug) {
                publicUrl = `${protocol}${company.customDomain}/${branch.slug}`;
              } else {
                publicUrl = `${protocol}${company.customDomain}`;
              }
            } else if (company?.slug) {
              // Fallback to slug-based URL - use company landing page (not branch)
              // Prioritize APP_URL environment variable
              const baseUrl =
                process.env.APP_URL ||
                this.configService.get<string>('frontend.url') ||
                process.env.FRONTEND_URL ||
                'http://localhost:3000';
              // Use company landing page URL so customers can select branch
              publicUrl = `${baseUrl.replace(/\/$/, '')}/${company.slug}`;
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
    // Get currency, timezone, dateFormat, and timeFormat from company settings
    let currency = 'BDT'; // Default
    let timezone = 'Asia/Dhaka'; // Default to Bangladesh
    let dateFormat = 'DD/MM/YYYY'; // Default
    let timeFormat: '12h' | '24h' = '12h'; // Default
    try {
      const branch = await this.branchesService.findOne(order.branchId.toString());
      if (branch?.companyId) {
        let companyIdStr: string | undefined;
        if (typeof branch.companyId === 'object' && branch.companyId !== null) {
          companyIdStr = (branch.companyId as any)._id?.toString() || (branch.companyId as any).id?.toString() || branch.companyId.toString();
        } else {
          companyIdStr = branch.companyId.toString();
        }
        if (companyIdStr && /^[0-9a-fA-F]{24}$/.test(companyIdStr)) {
          const companySettings = await this.settingsService.getCompanySettings(companyIdStr);
          currency = companySettings?.currency || 'BDT';
          timezone = companySettings?.timezone || 'Asia/Dhaka';
          dateFormat = companySettings?.dateFormat || 'DD/MM/YYYY';
          timeFormat = companySettings?.timeFormat || '12h';
        }
      }
    } catch (error) {
      console.warn('Could not retrieve company settings, using defaults:', error);
    }
    // Extract table number - prioritize stored tableNumber (works even after table release)
    // If tableNumber is stored in order, use it (this persists even after tableId is cleared)
    let tableNumber = 'N/A';
    // First, check if tableNumber is directly stored in the order (for released tables)
    if ((order as any).tableNumber) {
      tableNumber = (order as any).tableNumber;
      } else if (order.tableId) {
      // Fallback: Check if tableId is populated (object with tableNumber) or just an ObjectId
      const tableIdValue = order.tableId as any;
      // If it's a populated object (has tableNumber property), use it directly
      if (tableIdValue && typeof tableIdValue === 'object' && !(tableIdValue instanceof Types.ObjectId) && tableIdValue.tableNumber) {
        tableNumber = tableIdValue.tableNumber || 'N/A';
      } else {
        // tableId is an ObjectId (not populated), fetch the table
        try {
          const tableIdStr = tableIdValue instanceof Types.ObjectId 
            ? tableIdValue.toString() 
            : String(tableIdValue);
          const table = await this.tableModel.findById(tableIdStr).lean().exec();
          if (table) {
            tableNumber = (table as any).tableNumber || 'N/A';
          }
        } catch (error) {
          console.warn('Could not fetch table for receipt:', error);
        }
      }
    } else if (order.orderType === 'dine-in') {
      // For dine-in orders without tableId or tableNumber, log a warning
      console.warn(`⚠️ [Receipt] Dine-in order ${order.orderNumber} has no tableId or tableNumber`);
    }
    // Calculate discount amount
    // The discount can be applied before tax (on subtotal) or after tax (on total)
    // We need to reverse-engineer the discount from the actual total
    const subtotal = this.calculateSubtotal(safeItems);
    const actualTotal = Number(order.totalAmount || 0);
    // Try to find discount - it could be:
    // 1. loyaltyDiscount field on the order
    // 2. Calculated from the difference
    let discountAmount = 0;
    let discountPercentage = 0;
    if ((order as any).loyaltyDiscount && (order as any).loyaltyDiscount > 0) {
      // Use loyalty discount if available
      discountAmount = (order as any).loyaltyDiscount;
    } else {
      // Try to reverse-engineer the discount
      // If discount is applied before tax: subtotal - discount, then tax on (subtotal - discount)
      // If discount is applied after tax: (subtotal + tax) - discount
      // First, try discount on subtotal (before tax)
      const taxRate = settings?.taxRate || 0;
      const serviceChargeRate = settings?.serviceCharge || 0;
      // Calculate what the total would be with different discount scenarios
      // Scenario 1: Discount on subtotal, then tax on discounted amount
      // Let d = discount amount on subtotal
      // (subtotal - d) * (1 + taxRate/100) * (1 + serviceChargeRate/100) = actualTotal
      // Solving for d: d = subtotal - (actualTotal / ((1 + taxRate/100) * (1 + serviceChargeRate/100)))
      const taxMultiplier = 1 + (taxRate / 100);
      const serviceChargeMultiplier = 1 + (serviceChargeRate / 100);
      const totalMultiplier = taxMultiplier * serviceChargeMultiplier;
      const expectedSubtotalAfterDiscount = actualTotal / totalMultiplier;
      const discountOnSubtotal = subtotal - expectedSubtotalAfterDiscount;
      // Scenario 2: Discount on total (after tax)
      const subtotalWithTaxAndService = subtotal * totalMultiplier;
      const discountOnTotal = subtotalWithTaxAndService - actualTotal;
      // Use the discount that makes more sense (positive and reasonable)
      if (discountOnSubtotal > 0 && discountOnSubtotal <= subtotal) {
        discountAmount = Math.round(discountOnSubtotal * 100) / 100;
        discountPercentage = subtotal > 0 ? Math.round((discountAmount / subtotal) * 100 * 100) / 100 : 0;
      } else if (discountOnTotal > 0 && discountOnTotal <= subtotalWithTaxAndService) {
        discountAmount = Math.round(discountOnTotal * 100) / 100;
        discountPercentage = subtotalWithTaxAndService > 0 ? Math.round((discountAmount / subtotalWithTaxAndService) * 100 * 100) / 100 : 0;
      }
    }
    // Recalculate tax and service charge based on discounted subtotal (if discount is on subtotal)
    // For now, we'll calculate tax on the original subtotal and show discount separately
    // This matches the payment screen behavior where discount is shown separately
    const taxAmount = this.calculateTax(safeItems, settings?.taxRate || 0);
    const serviceChargeAmount = this.calculateServiceCharge(
      safeItems,
      settings?.serviceCharge || 0,
    );
    // If discount is on subtotal, recalculate tax on discounted amount
    let finalTaxAmount = taxAmount;
    let finalServiceChargeAmount = serviceChargeAmount;
    if (discountAmount > 0 && discountAmount <= subtotal) {
      // Discount is likely on subtotal, recalculate tax on discounted amount
      const discountedSubtotal = subtotal - discountAmount;
      finalTaxAmount = Math.round(discountedSubtotal * (settings?.taxRate || 0) / 100 * 100) / 100;
      finalServiceChargeAmount = Math.round(discountedSubtotal * (settings?.serviceCharge || 0) / 100 * 100) / 100;
    }
    const receiptData = {
      orderNumber: order.orderNumber,
      orderId: order._id,
      branchId: order.branchId,
      tableNumber: tableNumber,
      customerInfo: order.customerInfo || undefined,
      items: safeItems,
      subtotal: subtotal,
      taxRate: settings?.taxRate || 0,
      serviceCharge: settings?.serviceCharge || 0,
      taxAmount: finalTaxAmount,
      serviceChargeAmount: finalServiceChargeAmount,
      discountAmount: discountAmount,
      discountPercentage: discountPercentage,
      totalAmount: actualTotal,
      paymentMethod: order.paymentMethod,
      paymentDetails: order.paymentId || undefined,
      createdAt: (order as any)?.createdAt || new Date(),
      completedAt: (order as any)?.completedAt || undefined,
      // Company timezone and format settings
      timezone,
      dateFormat,
      timeFormat,
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
            return customLogoUrl.trim();
          }
          // If showLogo is enabled and company logo exists, use company logo
          if (showLogoEnabled && companyLogo) {
            return companyLogo;
          }
          // If showLogo is not explicitly false and company logo exists, use it
          if (settings?.receiptSettings?.showLogo !== false && companyLogo) {
            return companyLogo;
          }
          return undefined;
        })(),
        // Show logo if explicitly enabled in POS settings, or if company logo exists and not disabled
        showLogo: (() => {
          const posShowLogo = settings?.receiptSettings?.showLogo;
          const shouldShow = posShowLogo === true || 
                           (companyLogo && posShowLogo !== false);
          if (shouldShow) {
            const customLogoUrl = settings?.receiptSettings?.logoUrl;
            if (customLogoUrl && typeof customLogoUrl === 'string' && customLogoUrl.trim() !== '') {
              return customLogoUrl.trim();
            }
            return companyLogo || undefined;
          }
          return undefined;
        })(),
      },
      printerSettings: settings?.printerSettings || {
        enabled: false,
        printerId: '',
        autoPrint: false,
      },
      notes: order?.notes || undefined,
      publicUrl,
      currency, // Add currency to receipt data
      // Generate order review URL for QR code - use custom domain if available
      orderReviewUrl: (() => {
        const orderId = (order as any)._id?.toString() || (order as any).id?.toString();
        if (!orderId) return null;
        // Use the company we already fetched earlier
        // Use custom domain if available and verified
        if (company?.customDomain && company?.domainVerified) {
          return `https://${company.customDomain}/display/customerreview/${orderId}`;
        }
        // Fallback to base URL - prioritize APP_URL
        const baseUrl =
          process.env.APP_URL ||
          this.configService.get<string>('frontend.url') ||
          process.env.FRONTEND_URL ||
          'http://localhost:3000';
        return `${baseUrl}/display/customerreview/${orderId}`;
      })(),
    };
    return receiptData;
  }
  // Generate receipt HTML
  async generateReceiptHTML(orderId: string): Promise<string> {
    const receiptData = await this.generateReceiptData(orderId);
    // Generate QR code image if order review URL exists
    let qrCodeImageData = '';
    if (receiptData.orderReviewUrl) {
      try {
        qrCodeImageData = await this.generateQRCodeImage(receiptData.orderReviewUrl);
      } catch (error) {
        console.error('Failed to generate QR code for receipt:', error);
      }
    }
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
        <div><strong>Date:</strong> ${this.formatReceiptDate(receiptData.createdAt, receiptData.timezone, receiptData.dateFormat, receiptData.timeFormat)}</div>
        ${receiptData.customerInfo?.name ? `<div><strong>Customer:</strong> ${receiptData.customerInfo.name}</div>` : ''}
        ${receiptData.customerInfo?.phone ? `<div><strong>Phone:</strong> ${receiptData.customerInfo.phone}</div>` : ''}
    </div>
    <div class="items">
        <div style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">
            <span>Item</span>
            <span style="float: right;">Qty × Price</span>
        </div>
        ${receiptData.items.map(item => {
          const itemPrice = this.formatCurrency(item.price, receiptData.currency);
          const itemTotal = this.formatCurrency(item.quantity * item.price, receiptData.currency);
          return `
            <div class="item">
                <div class="item-name">${item.name || 'Menu Item'}</div>
                <div class="item-quantity">${item.quantity} × ${itemPrice}</div>
                <div class="item-price">${itemTotal}</div>
            </div>
            ${item.notes ? `<div style="font-size: 10px; color: #666; margin-left: 10px; margin-bottom: 5px;">Note: ${item.notes}</div>` : ''}
        `;
        }).join('')}
    </div>
    <div class="totals">
        <div class="total-line">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(receiptData.subtotal, receiptData.currency)}</span>
        </div>
        ${receiptData.taxRate > 0 ? `
            <div class="total-line">
                <span>Tax (${receiptData.taxRate}%):</span>
                <span>${this.formatCurrency(receiptData.taxAmount, receiptData.currency)}</span>
            </div>
        ` : ''}
        ${receiptData.serviceCharge > 0 ? `
            <div class="total-line">
                <span>Service Charge (${receiptData.serviceCharge}%):</span>
                <span>${this.formatCurrency(receiptData.serviceChargeAmount, receiptData.currency)}</span>
            </div>
        ` : ''}
        <div class="total-line final">
            <span>TOTAL:</span>
            <span>${this.formatCurrency(receiptData.totalAmount, receiptData.currency)}</span>
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
    ${receiptData.orderReviewUrl && qrCodeImageData ? `
        <div style="margin-top: 20px; text-align: center; padding: 15px; border-top: 1px solid #ddd;">
            <div style="font-size: 11px; margin-bottom: 10px; color: #111827;">
                <strong>Scan to review your order:</strong>
            </div>
            <div style="display: flex; justify-content: center; padding: 10px; background: white; border: 2px solid #e5e7eb; border-radius: 5px; margin: 0 auto; width: fit-content;">
                <img src="${qrCodeImageData}" alt="Order Review QR Code" style="width: 150px; height: 150px;" />
            </div>
            <div style="font-size: 9px; margin-top: 8px; color: #666; word-break: break-all;">
                ${receiptData.orderReviewUrl}
            </div>
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
            Generated on ${this.formatReceiptDate(receiptData.createdAt, receiptData.timezone, receiptData.dateFormat, receiptData.timeFormat)}
        </div>
    </div>
</body>
</html>`;
    return html;
  }
  // Generate QR code image as data URL
  private async generateQRCodeImage(url: string): Promise<string> {
    try {
      return await qrcode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 150,
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      return '';
    }
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