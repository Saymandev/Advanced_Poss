const fs = require('fs');
const file = 'backend/src/modules/public/public.controller.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { ReviewsService } from '../reviews/reviews.service';", "import { ReviewsService } from '../reviews/reviews.service';\nimport { POSService } from '../pos/pos.service';");
content = content.replace("private readonly bookingsService: BookingsService,", "private readonly bookingsService: BookingsService,\n    private readonly posService: POSService,");

const insertIndex = content.indexOf("@Public()\n  @Get('companies/:companySlug/branches/:branchSlug/delivery-zones')");

const newMethod = `  @Public()
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

  `;

content = content.slice(0, insertIndex) + newMethod + content.slice(insertIndex);
fs.writeFileSync(file, content);
console.log('patched');
