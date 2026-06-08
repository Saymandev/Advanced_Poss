const fs = require('fs');
const file = 'backend/src/modules/work-periods/work-periods.service.ts';
let content = fs.readFileSync(file, 'utf8');

// I accidentally corrupted generateWorkPeriodHtml, let me restore it cleanly
// Find the exact boundaries of the function
const startToken = '  private generateWorkPeriodHtml(workPeriod: any, summary: any): string {';
const endToken = '  private async generateWorkPeriodPDF(html: string): Promise<Buffer> {'; // If this exists
const fileLines = content.split('\n');

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < fileLines.length; i++) {
  if (fileLines[i].includes(startToken)) {
    startIndex = i;
  }
  if (startIndex !== -1 && i > startIndex && fileLines[i].trim() === '  }') {
    endIndex = i; // Found the end of generateWorkPeriodHtml (assuming no nested classes with just "  }")
    break;
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  const newFunction = \`  private generateWorkPeriodHtml(workPeriod: any, summary: any): string {
    // Helper to format currency
    const formatCurrency = (amount: number) => {
      try {
        return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(amount);
      } catch (e) {
        return \\\`BDT \\\${amount}\\\`;
      }
    };

    const startTime = new Date(workPeriod.startTime).toLocaleString();
    const endTime = workPeriod.endTime ? new Date(workPeriod.endTime).toLocaleString() : 'Active';
    
    const calculateDuration = (start: string | Date, end?: string | Date) => {
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : new Date();
      const diffMs = endDate.getTime() - startDate.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return \\\`\\\${hours}h \\\${minutes}m\\\`;
    };
    const duration = calculateDuration(workPeriod.startTime, workPeriod.endTime);

    const startedBy = workPeriod.startedBy ? \\\`\\\${workPeriod.startedBy.firstName || ''} \\\${workPeriod.startedBy.lastName || ''}\\\`.trim() : 'Unknown';
    const endedBy = workPeriod.endedBy ? \\\`\\\${workPeriod.endedBy.firstName || ''} \\\${workPeriod.endedBy.lastName || ''}\\\`.trim() : 'N/A';
    
    // Variance calculation
    const cashData = summary.paymentMethods?.find((pm: any) => pm.type.toLowerCase() === 'cash');
    const cashSales = cashData ? cashData.amount : 0;
    const expectedCash = (workPeriod.openingBalance || 0) + cashSales;
    const actualCash = workPeriod.closingBalance || 0;
    const variance = actualCash - expectedCash;
    const isVarianceNegative = variance < 0;
    const varianceColor = variance === 0 ? '#27ae60' : (isVarianceNegative ? '#e74c3c' : '#f39c12');

    return \\\`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Z-Report - Work Period</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; line-height: 1.4; color: #000; max-width: 400px; margin: 0 auto; padding: 20px; font-size: 14px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
          .meta-info { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .meta-item { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .meta-label { font-weight: bold; }
          
          .section-title { font-size: 16px; font-weight: bold; text-align: center; text-transform: uppercase; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin: 20px 0 10px 0; }
          
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .row.bold { font-weight: bold; }
          .row.indent { padding-left: 15px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { text-align: left; border-bottom: 1px dashed #000; padding: 5px 0; font-weight: bold; }
          th.right, td.right { text-align: right; }
          td { padding: 5px 0; border-bottom: 1px dotted #ccc; }
          tr:last-child td { border-bottom: none; }
          
          .footer { margin-top: 30px; text-align: center; font-size: 12px; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Z-Report</h1>
          <p>Serial #\\\${workPeriod.serial}</p>
        </div>
        
        <div class="meta-info">
          <div class="meta-item"><span class="meta-label">Status:</span> <span>\\\${workPeriod.status.toUpperCase()}</span></div>
          <div class="meta-item"><span class="meta-label">Started By:</span> <span>\\\${startedBy}</span></div>
          <div class="meta-item"><span class="meta-label">Ended By:</span> <span>\\\${endedBy}</span></div>
          <div class="meta-item"><span class="meta-label">Start Time:</span> <span>\\\${startTime}</span></div>
          <div class="meta-item"><span class="meta-label">End Time:</span> <span>\\\${endTime}</span></div>
          <div class="meta-item"><span class="meta-label">Duration:</span> <span>\\\${duration}</span></div>
        </div>

        <div class="section-title">Sales Summary</div>
        <div class="row"><span class="meta-label">Total Orders:</span> <span>\\\${summary.totalOrders}</span></div>
        <div class="row"><span class="meta-label">Gross Sales:</span> <span>\\\${formatCurrency(summary.grossSales)}</span></div>
        <div class="row indent"><span>- Refunds:</span> <span>\\\${formatCurrency(summary.refundTotal)}</span></div>
        <div class="row indent"><span>+ Hotel Revenue:</span> <span>\\\${formatCurrency(summary.hotelRevenue)}</span></div>
        <div class="row indent"><span>+ Manual Income:</span> <span>\\\${formatCurrency(summary.manualIncomeTotal || 0)}</span></div>
        <div class="row indent"><span>- Manual Expenses:</span> <span>\\\${formatCurrency(summary.manualExpenseTotal || 0)}</span></div>
        <div class="row indent"><span>- Purchases:</span> <span>\\\${formatCurrency(summary.purchaseTotal || 0)}</span></div>
        <div class="row bold mt-2"><span class="meta-label">Net Revenue:</span> <span>\\\${formatCurrency(summary.netSales)}</span></div>
        
        <div class="section-title">Financials & Cash</div>
        <div class="row"><span class="meta-label">Opening Balance:</span> <span>\\\${formatCurrency(workPeriod.openingBalance || 0)}</span></div>
        <div class="row"><span class="meta-label">Expected Cash:</span> <span>\\\${formatCurrency(expectedCash)}</span></div>
        <div class="row"><span class="meta-label">Actual Cash:</span> <span>\\\${formatCurrency(actualCash)}</span></div>
        \\\${workPeriod.closingBalance !== undefined ? \\\`<div class="row bold"><span class="meta-label">Cash Variance:</span> <span>\\\${variance > 0 ? '+' : ''}\\\${formatCurrency(variance)}</span></div>\\\` : ''}
        
        <div class="section-title">Payment Methods</div>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th class="right">Count</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            \\\${summary.paymentMethods.map((pm: any) => \\\`
              <tr>
                <td>\\\${pm.type}</td>
                <td class="right">\\\${pm.count}</td>
                <td class="right">\\\${formatCurrency(pm.amount)}</td>
              </tr>
            \\\`).join('')}
          </tbody>
        </table>
        
        <div class="section-title">Order Stats</div>
        <div class="row"><span class="meta-label">Voided Orders:</span> <span>\\\${summary.voidCount}</span></div>
        <div class="row"><span class="meta-label">Cancelled Orders:</span> <span>\\\${summary.cancelCount}</span></div>

        <div class="footer">
          End of Report<br>
          Generated on \\\${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    \\\`;
  }\`;

  fileLines.splice(startIndex, endIndex - startIndex + 1, newFunction);
  fs.writeFileSync(file, fileLines.join('\\n'));
  console.log('Fixed generation function!');
} else {
  console.error('Could not find function bounds!');
}
