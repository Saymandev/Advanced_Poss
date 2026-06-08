const fs = require('fs');
const file = 'backend/src/modules/work-periods/work-periods.service.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix duration calculation
const oldDurationLine = "const duration = workPeriod.duration || 'N/A';";
const newDurationCode = `const calculateDuration = (start, end) => {
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : new Date();
      const diffMs = endDate.getTime() - startDate.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return \`\${hours}h \${minutes}m\`;
    };
    const duration = calculateDuration(workPeriod.startTime, workPeriod.endTime);`;
content = content.replace(oldDurationLine, newDurationCode);

// 2. Fix actual cash display
const oldActualCashLine = "const actualCash = workPeriod.closingBalance || 0;";
const newActualCashLine = "const actualCash = workPeriod.closingBalance || 0;";
// Actual cash calculation is already fine. We need to fix the display in the HTML string:
const oldHtmlActualCash = `<div class="row"><span class="meta-label">Actual Cash:</span> <span>\${workPeriod.closingBalance !== undefined ? formatCurrency(workPeriod.closingBalance) : 'N/A'}</span></div>`;
const newHtmlActualCash = `<div class="row"><span class="meta-label">Actual Cash:</span> <span>\${formatCurrency(actualCash)}</span></div>`;
content = content.replace(oldHtmlActualCash, newHtmlActualCash);

fs.writeFileSync(file, content);
console.log('Fixed exactly!');
