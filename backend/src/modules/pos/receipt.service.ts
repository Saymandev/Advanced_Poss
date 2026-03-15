import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as qrcode from 'qrcode';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { SettingsService } from '../settings/settings.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Table, TableDocument } from '../tables/schemas/table.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { PDFGeneratorService } from './pdf-generator.service';
import { PrinterService, PrintJob } from './printer.service';
import { POSOrder, POSOrderDocument } from './schemas/pos-order.schema';
import { POSSettings, POSSettingsDocument } from './schemas/pos-settings.schema';
@Injectable()
export class ReceiptService {
  constructor(
    @InjectModel(POSOrder.name) private posOrderModel: Model<POSOrderDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(POSSettings.name) private posSettingsModel: Model<POSSettingsDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private pdfGeneratorService: PDFGeneratorService,
    private printerService: PrinterService,
    private companiesService: CompaniesService,
    private branchesService: BranchesService,
    private settingsService: SettingsService,
    private subscriptionsService: SubscriptionsService,
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
    let order = await this.posOrderModel
      .findById(orderId)
      .populate('tableId', 'tableNumber capacity')
      .populate('userId', 'firstName lastName name email')
      .populate('paymentId')
      .exec();

    // Fallback to public Order if POSOrder not found
    let isPublicOrder = false;
    if (!order) {
      const publicOrder = await this.orderModel
        .findById(orderId)
        .populate('tableId', 'tableNumber capacity')
        .populate('waiterId', 'firstName lastName name email')
        .exec();
      
      if (!publicOrder) {
        throw new Error('Order not found');
      }

      // Map public order to a similar structure as POSOrder for the receipt data
      isPublicOrder = true;
      order = {
        _id: publicOrder._id,
        orderNumber: publicOrder.orderNumber,
        branchId: publicOrder.branchId,
        companyId: publicOrder.companyId,
        orderType: publicOrder.type,
        status: publicOrder.status,
        totalAmount: publicOrder.total,
        items: publicOrder.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.unitPrice,
          notes: item.specialInstructions
        })),
        tableId: publicOrder.tableId,
        userId: publicOrder.waiterId,
        customerInfo: publicOrder.deliveryInfo ? {
          name: publicOrder.deliveryInfo.name,
          phone: publicOrder.deliveryInfo.phone,
          addressLine1: publicOrder.deliveryInfo.address,
        } : undefined,
        createdAt: publicOrder.createdAt,
        notes: publicOrder.internalNotes || publicOrder.customerNotes
      } as any;
    }
    const settings = await this.posSettingsModel
      .findOne({ branchId: order.branchId })
      .exec();
    // Get company settings as fallback for receipt settings
    let companySettings: any = null;
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
            // Fetch company once
            company = await this.companiesService.findOne(companyIdStr);

            // OPTIONAL: Check subscription limits for reviews to decide if we should include review QR URL
            try {
              const companyObjectId = new Types.ObjectId(companyIdStr) as any;
              const subscription = await this.subscriptionsService.findByCompany(companyObjectId);
              const limits = (subscription as any)?.limits || {};

              // If reviews are disabled completely, we won't generate a review URL later
              if (limits.reviewsEnabled === false) {
                // Explicitly clear publicUrl related to review experience
                publicUrl = undefined;
              }
            } catch (subError) {
              // If subscription lookup fails, just skip limits-based behavior and continue
              // Receipt itself is still allowed; review creation is separately guarded in ReviewsService
              // console.warn('Could not verify subscription limits for receipt review QR:', subError?.message);
            }

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
            console.error('Error fetching company for logo / subscription:', {
              companyId: companyIdStr,
              error: (companyError as any)?.message || companyError,
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
          companySettings = await this.settingsService.getCompanySettings(companyIdStr);
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
    // Get waiter name if userId is populated
    let waiterName = 'Default Waiter';
    if (order.userId) {
      const userObj = order.userId as any;
      if (typeof userObj === 'object' && userObj !== null) {
        // If it's populated (object), use its properties directly
        waiterName = userObj.name || 
                     `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || 
                     userObj.email || 
                     'Default Waiter';
      } else {
        // If it's NOT populated (string or ObjectId), try to fetch it
        try {
          const userIdStr = userObj.toString();
          if (userIdStr && Types.ObjectId.isValid(userIdStr)) {
            const user: any = await this.userModel.findById(userIdStr).select('firstName lastName name email').lean().exec();
            if (user) {
              waiterName = user.name || 
                           `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                           user.email || 
                           'Default Waiter';
            }
          }
        } catch (error) {
          console.warn('Could not fetch waiter name:', error);
        }
      }
    }
    // Get branch and company info for restaurant details
    let restaurantName = company?.name || 'Restaurant';
    let restaurantAddress = '';
    let restaurantPhone = '';
    let restaurantWifi = '';
    let restaurantWifiPassword = '';
    try {
      const branchData = await this.branchesService.findOne(order.branchId.toString());
      if (branchData) {
        restaurantName = branchData.name || company?.name || restaurantName;
        // Format address - handle both string and object formats
        const addressData = branchData.address || company?.address || '';
        if (typeof addressData === 'object' && addressData !== null) {
          // If address is an object, format it as a string, excluding _id
          const addressParts = [];
          if ((addressData as any).street) addressParts.push((addressData as any).street);
          if ((addressData as any).city) addressParts.push((addressData as any).city);
          if ((addressData as any).state) addressParts.push((addressData as any).state);
          if ((addressData as any).zipCode) addressParts.push((addressData as any).zipCode);
          if ((addressData as any).country) addressParts.push((addressData as any).country);
          restaurantAddress = addressParts.join(', ');
        } else {
          restaurantAddress = addressData || '';
        }
        restaurantPhone = branchData.phone || company?.phone || '';
        // Get WiFi info: branch POS settings > company settings > branch data
        if (settings?.receiptSettings?.wifi) {
          restaurantWifi = settings.receiptSettings.wifi;
        } else if (companySettings?.receiptSettings?.wifi) {
          restaurantWifi = companySettings.receiptSettings.wifi;
        } else if ((branchData as any).wifi) {
          restaurantWifi = (branchData as any).wifi;
        }
        if (settings?.receiptSettings?.wifiPassword) {
          restaurantWifiPassword = settings.receiptSettings.wifiPassword;
        } else if (companySettings?.receiptSettings?.wifiPassword) {
          restaurantWifiPassword = companySettings.receiptSettings.wifiPassword;
        } else if ((branchData as any).wifiPassword) {
          restaurantWifiPassword = (branchData as any).wifiPassword;
        }
      }
    } catch (error) {
      console.warn('Could not fetch branch/company details:', error);
    }
    const receiptData = {
      orderNumber: order.orderNumber,
      orderId: order._id,
      branchId: order.branchId,
      tableNumber: tableNumber,
      orderType: (order as any).orderType || (order as any).type || 'dine-in',
      waiterName: waiterName,
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
      amountReceived: (order as any).amountReceived || (order.paymentId as any)?.amountReceived || 0,
      changeDue: (order as any).changeDue || (order.paymentId as any)?.changeDue || 0,
      createdAt: (order as any)?.createdAt || new Date(),
      completedAt: (order as any)?.completedAt || undefined,
      // Restaurant info
      restaurantName: restaurantName,
      restaurantAddress: restaurantAddress,
      restaurantPhone: restaurantPhone,
      restaurantWifi: restaurantWifi,
      restaurantWifiPassword: restaurantWifiPassword,
      // Company timezone and format settings
      timezone,
      dateFormat,
      timeFormat,
      receiptSettings: {
        header: settings?.receiptSettings?.header || companySettings?.receiptSettings?.header || 'Restaurant Receipt',
        footer: settings?.receiptSettings?.footer || companySettings?.receiptSettings?.footer || 'Thank you for your visit!',
        fontSize: settings?.receiptSettings?.fontSize || companySettings?.receiptSettings?.fontSize || 12,
        paperWidth: settings?.receiptSettings?.paperWidth || companySettings?.receiptSettings?.paperWidth || 80,
        bin: settings?.receiptSettings?.bin || companySettings?.receiptSettings?.bin || undefined,
        mushak: settings?.receiptSettings?.mushak || companySettings?.receiptSettings?.mushak || undefined,
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
      deliveryFee: (order as any).deliveryFee || 0,
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

    // Log receipt data for debugging as requested by user
    console.log('📄 [Receipt Debug] Generated Receipt Data:', JSON.stringify(receiptData, null, 2));

    const itemsHtml = receiptData.items.map(item => {
        const notesHtml = item.notes ? `<tr><td colspan="4" style="font-size: 0.85em; font-style: italic; color: #000; padding: 2px 0 2px 10px; opacity: 0.8;">- ${item.notes}</td></tr>` : '';
        return `
        <tr>
            <td style="width: 12%;">${item.quantity}</td>
            <td style="width: 48%; padding-left: 5px;">${item.name}</td>
            <td style="width: 20%; text-align: right;">${item.price.toFixed(0)}</td>
            <td style="width: 20%; text-align: right;">${(item.quantity * item.price).toFixed(0)}</td>
        </tr>
        ${notesHtml}
      `;
    }).join('');

    const taxHtml = receiptData.taxRate > 0 ? `
    <div class="total-row">
        <span>VAT (${receiptData.taxRate}%) :</span>
        <span>${receiptData.taxAmount.toFixed(2)}</span>
    </div>` : '';

    const serviceChargeHtml = receiptData.serviceCharge > 0 ? `
    <div class="total-row">
        <span>S.C (${receiptData.serviceCharge}%) :</span>
        <span>${receiptData.serviceChargeAmount.toFixed(2)}</span>
    </div>` : '';

    const discountHtml = receiptData.discountAmount > 0 ? `
    <div class="total-row">
        <span>Discount :</span>
        <span>-${receiptData.discountAmount.toFixed(2)}</span>
    </div>` : '';

    const deliveryFeeHtml = receiptData.deliveryFee > 0 ? `
    <div class="total-row">
        <span>Delivery Fee :</span>
        <span>${receiptData.deliveryFee.toFixed(2)}</span>
    </div>` : '';

    const binHtml = receiptData.receiptSettings.bin ? `<p style="margin-top: 5px; font-weight: bold;">BIN: ${receiptData.receiptSettings.bin}</p>` : '';
    const mushakHtml = receiptData.receiptSettings.mushak ? `<p style="margin-top: 2px;">(Mushak ${receiptData.receiptSettings.mushak})</p>` : '';

    const qrHtml = (receiptData.orderReviewUrl && qrCodeImageData) ? `
    <div class="review-qr text-center" style="width: 100%; margin-top: 20px;">
        <p style="font-size: 0.85em; margin-bottom: 8px; color: #000 !important; font-weight: bold;">Scan to review your experience</p>
        <img src="${qrCodeImageData}" alt="Review QR" style="display: block; margin: 0 auto; width: 130px; height: 130px; border: 1px solid #eee;" />
    </div>` : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt - ${receiptData.orderNumber}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: #ffffff !important;
            padding: 0;
            margin: 0;
            display: flex;
            justify-content: center;
        }
        .receipt-container {
            font-family: 'Courier New', Courier, monospace;
            font-size: ${receiptData.receiptSettings.fontSize || 12}px;
            line-height: 1.2;
            padding: 15px;
            width: ${receiptData.receiptSettings.paperWidth || 80}mm;
            background: #ffffff !important;
            color: #000000 !important;
        }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        .font-bold { font-weight: bold !important; }
        .separator-double { 
            margin: 10px 0; 
            text-align: center;
            font-weight: bold;
            color: #000 !important;
            letter-spacing: -1px;
        }
        .separator-dashed { 
            margin: 10px 0; 
            text-align: center;
            color: #000 !important;
            letter-spacing: -1px;
        }
        .header { margin-bottom: 15px; }
        .header h1 { 
            font-size: 1.6em; 
            margin: 8px 0; 
            color: #000 !important;
            font-weight: bold !important;
            line-height: 1.1;
        }
        .header p { 
            font-size: 1em; 
            margin-bottom: 3px;
            color: #000 !important;
        }
        .order-info {
            margin: 15px 0;
            font-size: 1em;
            color: #000 !important;
        }
        .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0; 
            font-size: 1em;
            color: #000 !important;
        }
        .items-table th { 
            padding: 8px 0; 
            text-align: left;
            color: #000 !important;
            font-weight: bold !important;
        }
        .items-table td { 
            padding: 6px 0; 
            vertical-align: top;
            color: #000 !important;
        }
        .totals { 
            margin-top: 10px; 
            color: #000 !important;
        }
        .total-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 5px; 
            font-size: 1.1em;
            color: #000 !important;
        }
        .grand-total { 
            font-size: 1.4em; 
            font-weight: bold !important; 
            margin: 12px 0; 
            color: #000 !important;
        }
        .footer { 
            margin-top: 25px; 
            font-size: 1.1em;
            font-weight: bold !important;
            color: #000 !important;
        }
        .review-qr { margin: 15px 0; }
        .review-qr img { width: 100px; height: 100px; }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header text-center">
            <div class="separator-double">=======================================</div>
            <h1>${receiptData.restaurantName.toUpperCase()}</h1>
            <p style="white-space: pre-wrap;">${receiptData.restaurantAddress}</p>
            <p>Tel: ${receiptData.restaurantPhone}</p>
            ${binHtml}
            ${mushakHtml}
            <div class="separator-double">=======================================</div>
        </div>

        <div class="order-info">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <div style="flex: 1;">Bill No : ${receiptData.orderNumber}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <div>Date : ${this.formatReceiptDate(receiptData.createdAt, receiptData.timezone, receiptData.dateFormat, '24h').split(',')[0]}</div>
                <div>Time : ${this.formatReceiptDate(receiptData.createdAt, receiptData.timezone, receiptData.dateFormat, '12h').split(',')[1].trim()}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <div>Table : ${receiptData.tableNumber}</div>
                <div>Waiter: ${receiptData.waiterName}</div>
            </div>
        </div>

        <div class="separator-dashed">---------------------------------------</div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 12%; text-align: left;">Qty</th>
                    <th style="width: 48%; text-align: left;">Item</th>
                    <th style="width: 20%; text-align: right;">Rate</th>
                    <th style="width: 20%; text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="separator-dashed">---------------------------------------</div>

        <div class="totals">
            <div class="total-row">
                <span>Subtotal :</span>
                <span>${receiptData.subtotal.toFixed(2)}</span>
            </div>
            ${taxHtml}
            ${serviceChargeHtml}
            ${discountHtml}
            ${deliveryFeeHtml}
            
            <div class="separator-double">=======================================</div>
            <div class="total-row grand-total">
                <span>GRAND TOTAL (${receiptData.currency}) :</span>
                <span>${receiptData.totalAmount.toFixed(2)}</span>
            </div>
            <div class="separator-double">=======================================</div>
        </div>

        <div class="payment-details" style="margin: 10px 0; font-size: 1em;">
            <div>Paid by: ${receiptData.paymentMethod ? receiptData.paymentMethod.toUpperCase() : 'N/A'}</div>
            <div>Change: ${receiptData.changeDue.toFixed(2)} (Tendered: ${receiptData.amountReceived.toFixed(0)})</div>
        </div>

        <div class="separator-double" style="margin-top: 15px;">=======================================</div>

        <div class="footer text-center">
            <p>${receiptData.receiptSettings.footer || 'Thank you for your visit!'}</p>
            <p>Please come again.</p>
            <br/>
            <p style="font-size: 0.85em; opacity: 0.9; font-weight: normal;">Powered by Raha Pos Solutions</p>
            <div class="separator-double">=======================================</div>
        </div>

        ${qrHtml}
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