import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PDFGeneratorService {
  private puppeteer: any = null;

  constructor(private configService: ConfigService) {
    this.initializePuppeteer();
  }

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

  private async initializePuppeteer() {
    try {
      // Dynamically import puppeteer to avoid build issues
      this.puppeteer = await import('puppeteer');
    } catch (error) {
      console.warn('Puppeteer not available, PDF generation will be disabled:', error.message);
    }
  }

  async generateReceiptPDF(htmlContent: string, options?: {
    format?: 'A4' | 'A5' | 'Letter' | 'Legal';
    width?: string;
    height?: string;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    printBackground?: boolean;
    displayHeaderFooter?: boolean;
  }): Promise<Buffer> {
    if (!this.puppeteer) {
      throw new Error('Puppeteer not available. Please install puppeteer package.');
    }

    const browser = await this.puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      // Set content
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options?.format || 'A5',
        width: options?.width || '80mm',
        height: options?.height || 'auto',
        margin: options?.margin || {
          top: '10mm',
          right: '5mm',
          bottom: '10mm',
          left: '5mm',
        },
        printBackground: options?.printBackground || true,
        displayHeaderFooter: options?.displayHeaderFooter || false,
        preferCSSPageSize: true,
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  async generateReceiptPDFFromOrder(orderData: any, settings: any): Promise<Buffer> {
    const htmlContent = this.generateReceiptHTML(orderData, settings);
    return this.generateReceiptPDF(htmlContent, {
      format: 'A5',
      width: '80mm',
      height: 'auto',
      margin: {
        top: '5mm',
        right: '3mm',
        bottom: '5mm',
        left: '3mm',
      },
      printBackground: true,
    });
  }

  private generateReceiptHTML(orderData: any, settings: any): string {
    const { receiptSettings } = settings;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt - ${orderData.orderNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: ${receiptSettings?.fontSize || 12}px;
            line-height: 1.3;
            color: #000;
            background: white;
            max-width: ${receiptSettings?.paperWidth || 80}mm;
            margin: 0 auto;
            padding: 5mm;
        }
        
        .receipt-header {
            text-align: center;
            border-bottom: 2px dotted #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        
        .receipt-header h1 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .receipt-header .logo {
            max-width: 100px;
            max-height: 100px;
            width: 100px;
            height: 100px;
            display: block;
            margin: 0 auto 15px auto;
            object-fit: contain;
            border-radius: 50%;
            border: 2px dotted #e5e7eb;
        }
        
        .order-info {
            margin-bottom: 15px;
            font-size: 11px;
        }
        
        .order-info div {
            margin-bottom: 3px;
        }
        
        .items-table {
            width: 100%;
            margin-bottom: 15px;
            border-collapse: collapse;
        }
        
        .items-table th {
            text-align: left;
            border-bottom: 1px dotted #000;
            padding: 3px 0;
            font-size: 10px;
            font-weight: bold;
        }
        
        .items-table td {
            padding: 2px 0;
            font-size: 10px;
        }
        
        .item-name {
            width: 45%;
        }
        
        .item-qty {
            width: 12%;
            text-align: center;
        }
        
        .item-price {
            width: 21.5%;
            text-align: right;
        }
        
        .totals {
            border-top: 2px dotted #000;
            padding-top: 8px;
            margin-top: 10px;
        }
        
        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 11px;
        }
        
        .total-line.final {
            font-weight: bold;
            font-size: 13px;
            border-top: 1px dotted #000;
            padding-top: 5px;
            margin-top: 5px;
        }
        
        .payment-info {
            margin-top: 15px;
            padding: 8px;
            background-color: #f5f5f5;
            border-radius: 3px;
            font-size: 10px;
        }
        
        .receipt-footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px dotted #000;
            font-size: 10px;
        }
        
        .notes {
            margin-top: 10px;
            font-style: italic;
            font-size: 9px;
            color: #666;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-header">
        ${receiptSettings?.showLogo && receiptSettings?.logoUrl ? 
          `<img src="${receiptSettings.logoUrl}" alt="Logo" class="logo">` : ''}
        ${receiptSettings?.header ? `<div style="font-size: 10px; margin-bottom: 5px; color: #666;">${receiptSettings.header}</div>` : ''}
        <h1>${orderData.restaurantName || receiptSettings?.header || 'Restaurant'}</h1>
        ${orderData.restaurantAddress ? `<div style="font-size: 9px; margin-top: 5px; color: #333; font-weight: 600;">${orderData.restaurantAddress}</div>` : ''}
        ${orderData.restaurantPhone ? `<div style="font-size: 9px; margin-top: 3px; color: #333; font-weight: 600;">Phone: ${orderData.restaurantPhone}</div>` : ''}
        ${orderData.restaurantWifi ? `<div style="font-size: 9px; margin-top: 3px; color: #333;">Wifi: ${orderData.restaurantWifi}${orderData.restaurantWifiPassword ? ` Password: ${orderData.restaurantWifiPassword}` : ''}</div>` : ''}
    </div>

    <div class="order-info">
        <div><strong>Invoice No:</strong> ${orderData.orderNumber}</div>
        <div><strong>Order Type:</strong> ${((orderData.orderType || 'dine-in').toUpperCase().replace('-', ' '))}</div>
        <div><strong>Date:</strong> ${this.formatReceiptDate(orderData.createdAt, orderData.timezone || 'Asia/Dhaka', orderData.dateFormat || 'DD/MM/YYYY', orderData.timeFormat || '12h')}</div>
        <div><strong>Waiter:</strong> ${orderData.waiterName || 'Default Waiter'}</div>
        ${orderData.tableNumber && orderData.tableNumber !== 'N/A' ? `<div><strong>Table:</strong> ${orderData.tableNumber}</div>` : ''}
        ${orderData.customerInfo?.name ? `<div><strong>Customer:</strong> ${orderData.customerInfo.name}</div>` : ''}
        ${orderData.customerInfo?.email ? `<div><strong>Email:</strong> ${orderData.customerInfo.email}</div>` : ''}
        ${orderData.customerInfo?.phone ? `<div><strong>Phone:</strong> ${orderData.customerInfo.phone}</div>` : ''}
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th class="item-name">Item Description</th>
                <th class="item-qty">Qty</th>
                <th class="item-price">Price</th>
                <th class="item-price">T.Price</th>
            </tr>
        </thead>
        <tbody>
            ${orderData.items.map(item => {
              const currency = orderData.currency || 'BDT';
              const itemPrice = this.formatCurrency(item.price, currency);
              const itemTotal = this.formatCurrency(item.quantity * item.price, currency);
              return `
                <tr>
                    <td class="item-name">${item.name || 'Menu Item'}</td>
                    <td class="item-qty">${item.quantity}</td>
                    <td class="item-price">${itemPrice}</td>
                    <td class="item-price">${itemTotal}</td>
                </tr>
                ${item.notes ? `<tr><td colspan="4" class="notes">Note: ${item.notes}</td></tr>` : ''}
            `;
            }).join('')}
        </tbody>
    </table>

    <div class="totals">
        <div class="total-line">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(orderData.subtotal, orderData.currency || 'BDT')}</span>
        </div>
        ${orderData.discountAmount && orderData.discountAmount > 0 ? `
            <div class="total-line" style="color: #dc2626;">
                <span>Discount${orderData.discountPercentage && orderData.discountPercentage > 0 ? ` (${orderData.discountPercentage}%)` : ''}:</span>
                <span>-${this.formatCurrency(orderData.discountAmount, orderData.currency || 'BDT')}</span>
            </div>
        ` : ''}
        ${orderData.taxRate > 0 ? `
            <div class="total-line">
                <span>VAT ${orderData.taxRate}%:</span>
                <span>${this.formatCurrency(orderData.taxAmount, orderData.currency || 'BDT')}</span>
            </div>
        ` : ''}
        ${orderData.serviceCharge > 0 ? `
            <div class="total-line">
                <span>Service Charge (${orderData.serviceCharge}%):</span>
                <span>${this.formatCurrency(orderData.serviceChargeAmount, orderData.currency || 'BDT')}</span>
            </div>
        ` : ''}
        <div class="total-line final">
            <span>Total:</span>
            <span>${orderData.currency || 'BDT'} ${this.formatCurrency(orderData.totalAmount, orderData.currency || 'BDT')}</span>
        </div>
    </div>

    ${orderData.paymentMethod ? `
        <div class="payment-info">
            <div><strong>Payment Method:</strong> ${orderData.paymentMethod.toUpperCase()}</div>
            ${orderData.paymentDetails?.transactionId ? `<div><strong>Transaction ID:</strong> ${orderData.paymentDetails.transactionId}</div>` : ''}
            ${orderData.paymentDetails?.referenceNumber ? `<div><strong>Reference:</strong> ${orderData.paymentDetails.referenceNumber}</div>` : ''}
        </div>
    ` : ''}

    <div class="receipt-footer">
        <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dotted #000;">
            <div style="font-weight: bold; font-size: 10px; text-decoration: underline; margin-bottom: 10px;">GUEST BILL</div>
            ${orderData.orderReviewUrl ? `
                <div style="margin-bottom: 10px;">
                    <div style="font-size: 9px; margin-bottom: 8px; color: #111827;">
                        Please rate our service of this order.
                    </div>
                    ${orderData.publicUrl ? `
                    <div style="font-size: 8px; color: #333; word-break: break-all;">
                        ${orderData.publicUrl}
                    </div>
                    ` : ''}
                </div>
            ` : ''}
            <div style="font-size: 10px; margin-top: 10px; margin-bottom: 8px;">
                ${receiptSettings?.footer || 'Thank you. Come again.'}
            </div>
            <div style="font-size: 8px; color: #666; margin-top: 10px;">
                Powered By: Raha Pos Solutions
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  async isAvailable(): Promise<boolean> {
    return this.puppeteer !== null;
  }
}
