const fs = require('fs');
const file = 'backend/src/modules/public/public.controller.ts';
let content = fs.readFileSync(file, 'utf8');

// I will just use regex to clean up everything from @Public() @Get('companies/:companySlug/branches/:branchSlug/orders/:orderId/live-tracking') down to the end

const match = content.match(/@Public\(\)[\s\S]*@Get\('companies\/:companySlug\/branches\/:branchSlug\/orders\/:orderId\/live-tracking'\)/);
if (match) {
    const splitIndex = match.index;
    content = content.slice(0, splitIndex);
    
    // Check if } is missing at the end of the file
    if (!content.trim().endsWith('}')) {
        content += '\n}\n';
    }
}

fs.writeFileSync(file, content);

const newMethod = `
  @Public()
  @Get('companies/:companySlug/branches/:branchSlug/orders/:orderId/live-tracking')
  @ApiOperation({ summary: 'Live tracking data for order (public, scoped to branch)' })
  async getLiveTracking(
    @Param('companySlug') companySlug: string,
    @Param('branchSlug') branchSlug: string,
    @Param('orderId') orderId: string,
  ) {
    const company = await this.companiesService.findBySlug(companySlug);
    const companyId = (company as any)._id?.toString() || (company as any).id;
    const branch = await this.branchesService.findBySlug(companyId, branchSlug);
    
    return {
      success: true,
      data: await this.posService.getTrackingData(orderId),
    };
  }
}
`;

content = fs.readFileSync(file, 'utf8');
content = content.trim().slice(0, -1) + newMethod;
fs.writeFileSync(file, content);

console.log('publicController patched');
