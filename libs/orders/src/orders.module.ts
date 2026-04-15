import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  CreateRetailOrderUseCase,
  CreateWholesaleOrderUseCase,
  GetOrderByIdUseCase,
  MarkOrderPaidUseCase,
  CompleteOrderUseCase,
  CancelOrderUseCase,
} from './application/use-cases';
import { OrdersRepository } from './infrastructure/persistence/orders.repository';
import { OrdersRpcController } from './presentation/rpc/orders.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersRpcController],
  providers: [
    OrdersRepository,
    CreateRetailOrderUseCase,
    CreateWholesaleOrderUseCase,
    GetOrderByIdUseCase,
    MarkOrderPaidUseCase,
    CompleteOrderUseCase,
    CancelOrderUseCase,
  ],
  exports: [
    OrdersRepository,
    CreateRetailOrderUseCase,
    CreateWholesaleOrderUseCase,
    GetOrderByIdUseCase,
    MarkOrderPaidUseCase,
    CompleteOrderUseCase,
    CancelOrderUseCase,
  ],
})
export class OrdersModule {}
