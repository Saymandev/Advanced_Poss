import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';

import { TransactionsService } from './transactions.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleFeatureGuard } from '../../common/guards/role-feature.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';

describe('TransactionsController', () => {
  let controller: TransactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: {}, // mock service methods
        },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(RoleFeatureGuard).useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionFeatureGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
