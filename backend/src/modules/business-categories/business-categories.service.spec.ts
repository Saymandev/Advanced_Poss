import { Test, TestingModule } from '@nestjs/testing';
import { BusinessCategoriesService } from './business-categories.service';

import { getModelToken } from '@nestjs/mongoose';
import { BusinessCategory } from './schemas/business-category.schema';

describe('BusinessCategoriesService', () => {
  let service: BusinessCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessCategoriesService,
        {
          provide: getModelToken(BusinessCategory.name),
          useValue: {}, // mock mongoose model
        },
      ],
    }).compile();

    service = module.get<BusinessCategoriesService>(BusinessCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
