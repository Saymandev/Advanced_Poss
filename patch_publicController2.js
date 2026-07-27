const fs = require('fs');
const file = 'backend/src/modules/public/public.controller.ts';
let content = fs.readFileSync(file, 'utf8');

// Inject import
content = content.replace("import { ReviewsService } from '../reviews/reviews.service';", "import { ReviewsService } from '../reviews/reviews.service';\nimport { POSService } from '../pos/pos.service';");

// Inject constructor
content = content.replace(
"    private readonly reviewsService: ReviewsService,\n    private readonly bookingsService: BookingsService,\n  ) {}",
"    private readonly reviewsService: ReviewsService,\n    private readonly bookingsService: BookingsService,\n    private readonly posService: POSService,\n  ) {}"
);

// Inject method
const method = `  @Public()
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

// Insert before the last closing brace
const pos = content.lastIndexOf('}');
content = content.slice(0, pos) + method + content.slice(pos);

fs.writeFileSync(file, content);
console.log('patched successfully');
