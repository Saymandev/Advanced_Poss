import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BusinessCategoriesService } from './business-categories.service';

@ApiTags('Public Data')
@Controller('public/business-categories')
export class BusinessCategoriesController {
  constructor(private readonly businessCategoriesService: BusinessCategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active business categories' })
  @ApiResponse({ status: 200, description: 'Return all active business categories.' })
  async findAll() {
    const categories = await this.businessCategoriesService.findAllActive();
    return { success: true, data: categories };
  }
}
