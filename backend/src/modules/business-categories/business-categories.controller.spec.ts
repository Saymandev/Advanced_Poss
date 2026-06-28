import { Test, TestingModule } from '@nestjs/testing';
import { BusinessCategoriesController } from './business-categories.controller';

import { BusinessCategoriesService } from './business-categories.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

describe('BusinessCategoriesController', () => {
  let controller: BusinessCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessCategoriesController],
      providers: [
        {
          provide: BusinessCategoriesService,
          useValue: {}, // mock service methods
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BusinessCategoriesController>(BusinessCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
