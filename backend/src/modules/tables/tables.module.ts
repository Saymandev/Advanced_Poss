import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchesModule } from '../branches/branches.module';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { WebsocketsModule } from '../websockets/websockets.module';
import { Table, TableSchema } from './schemas/table.schema';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Table.name, schema: TableSchema },
      { name: POSOrder.name, schema: POSOrderSchema },
    ]),
    forwardRef(() => BranchesModule),
    forwardRef(() => WebsocketsModule),
  ],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}

