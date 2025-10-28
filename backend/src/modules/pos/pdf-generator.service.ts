import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PDFGeneratorService {
  private puppeteer: any = null;

  constructor(private configService: ConfigService) {
    this.initializePuppeteer();
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
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        
        .receipt-header h1 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .receipt-header .logo {
            max-width: 60px;
            max-height: 40px;
            margin-bottom: 5px;
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
            border-bottom: 1px solid #000;
            padding: 3px 0;
            font-size: 10px;
            font-weight: bold;
        }
        
        .items-table td {
            padding: 2px 0;
            font-size: 10px;
        }
        
        .item-name {
            width: 60%;
        }
        
        .item-qty {
            width: 15%;
            text-align: center;
        }
        
        .item-price {
            width: 25%;
            text-align: right;
        }
        
        .totals {
            border-top: 2px solid #000;
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
            border-top: 1px solid #000;
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
            border-top: 1px solid #000;
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
        <h1>${receiptSettings?.header || 'Restaurant Receipt'}</h1>
    </div>

    <div class="order-info">
        <div><strong>Order #:</strong> ${orderData.orderNumber}</div>
        <div><strong>Table #:</strong> ${orderData.tableNumber}</div>
        <div><strong>Date:</strong> ${new Date(orderData.createdAt).toLocaleString()}</div>
        <div><strong>Time:</strong> ${new Date(orderData.createdAt).toLocaleTimeString()}</div>
        ${orderData.customerInfo?.name ? `<div><strong>Customer:</strong> ${orderData.customerInfo.name}</div>` : ''}
        ${orderData.customerInfo?.phone ? `<div><strong>Phone:</strong> ${orderData.customerInfo.phone}</div>` : ''}
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th class="item-name">Item</th>
                <th class="item-qty">Qty</th>
                <th class="item-price">Price</th>
            </tr>
        </thead>
        <tbody>
            ${orderData.items.map(item => `
                <tr>
                    <td class="item-name">${item.name || 'Menu Item'}</td>
                    <td class="item-qty">${item.quantity}</td>
                    <td class="item-price">$${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
                ${item.notes ? `<tr><td colspan="3" class="notes">Note: ${item.notes}</td></tr>` : ''}
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <div class="total-line">
            <span>Subtotal:</span>
            <span>$${orderData.subtotal.toFixed(2)}</span>
        </div>
        ${orderData.taxRate > 0 ? `
            <div class="total-line">
                <span>Tax (${orderData.taxRate}%):</span>
                <span>$${orderData.taxAmount.toFixed(2)}</span>
            </div>
        ` : ''}
        ${orderData.serviceCharge > 0 ? `
            <div class="total-line">
                <span>Service Charge (${orderData.serviceCharge}%):</span>
                <span>$${orderData.serviceChargeAmount.toFixed(2)}</span>
            </div>
        ` : ''}
        <div class="total-line final">
            <span>TOTAL:</span>
            <span>$${orderData.totalAmount.toFixed(2)}</span>
        </div>
    </div>

    ${orderData.paymentMethod ? `
        <div class="payment-info">
            <div><strong>Payment Method:</strong> ${orderData.paymentMethod.toUpperCase()}</div>
            ${orderData.paymentDetails?.transactionId ? `<div><strong>Transaction ID:</strong> ${orderData.paymentDetails.transactionId}</div>` : ''}
            ${orderData.paymentDetails?.referenceNumber ? `<div><strong>Reference:</strong> ${orderData.paymentDetails.referenceNumber}</div>` : ''}
        </div>
    ` : ''}

    ${orderData.notes ? `
        <div class="notes">
            <strong>Order Notes:</strong> ${orderData.notes}
        </div>
    ` : ''}

    <div class="receipt-footer">
        <div>${receiptSettings?.footer || 'Thank you for your visit!'}</div>
        <div style="margin-top: 5px; font-size: 8px;">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;
  }

  async isAvailable(): Promise<boolean> {
    return this.puppeteer !== null;
  }
}
