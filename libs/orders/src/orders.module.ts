import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
import { OrderInventoryPort, WholesalePricingPort } from './application/ports';
import {
  OrderInventoryService,
  OrderPlacementService,
  OrderReversalService,
} from './application/services';
import {
  AddDisputeEvidenceBatchUseCase,
  AddCartItemUseCase,
  AssignAdminDisputeUseCase,
  CreateRetailOrderUseCase,
  CreateWholesaleOrderUseCase,
  CheckoutCartItemUseCase,
  GetAdminDisputeDetailUseCase,
  GetAdminOpenDisputeCountUseCase,
  GetAdminDisputeSummaryUseCase,
  GetActiveCartUseCase,
  GetOrderByIdUseCase,
  GetDisputeEvidenceUploadSignaturesUseCase,
  ListAdminOpenDisputesUseCase,
  ListDisputeEvidenceUseCase,
  MarkOrderPaidUseCase,
  RemoveCartItemUseCase,
  CompleteOrderUseCase,
  CancelOrderUseCase,
  OpenOrderDisputeUseCase,
  ResolveAdminDisputeUseCase,
  ResolveOrderDisputeUseCase,
  RefundOrderUseCase,
  UpdateCartItemUseCase,
  UpdateAdminDisputeCaseUseCase,
} from './application/use-cases';
import {
  CatalogWholesalePricingAdapter,
  LocalOrderInventoryAdapter,
  LocalWholesalePricingAdapter,
} from './infrastructure/adapters';
import { OrdersRepository } from './infrastructure/persistence/orders.repository';
import { OrdersRpcController } from './presentation/rpc/orders.rpc-controller';
import { CATALOG_SERVICE_CLIENT } from '@contracts';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MediaModule,
    ClientsModule.registerAsync([
      {
        name: CATALOG_SERVICE_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('CATALOG_SERVICE_HOST')?.trim() ||
              configService.get<string>('USERS_SERVICE_HOST')?.trim() ||
              '127.0.0.1',
            port:
              configService.get<number>('CATALOG_SERVICE_PORT') ??
              configService.get<number>('USERS_SERVICE_PORT') ??
              4002,
          },
        }),
      },
    ]),
  ],
  controllers: [OrdersRpcController],
  providers: [
    OrdersRepository,
    {
      provide: OrderInventoryPort,
      useClass: LocalOrderInventoryAdapter,
    },
    {
      provide: WholesalePricingPort,
      inject: [ConfigService, LocalWholesalePricingAdapter, CatalogWholesalePricingAdapter],
      useFactory: (
        configService: ConfigService,
        localAdapter: LocalWholesalePricingAdapter,
        catalogAdapter: CatalogWholesalePricingAdapter,
      ) => {
        const mode = configService.get<string>('ORDERS_PRICING_ADAPTER')?.trim().toLowerCase() || 'local';
        return mode === 'catalog' ? catalogAdapter : localAdapter;
      },
    },
    OrderInventoryService,
    OrderPlacementService,
    OrderReversalService,
    LocalWholesalePricingAdapter,
    CatalogWholesalePricingAdapter,
    GetActiveCartUseCase,
    AddCartItemUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    CheckoutCartItemUseCase,
    AddDisputeEvidenceBatchUseCase,
    AssignAdminDisputeUseCase,
    CreateRetailOrderUseCase,
    CreateWholesaleOrderUseCase,
    GetAdminDisputeDetailUseCase,
    GetAdminOpenDisputeCountUseCase,
    GetAdminDisputeSummaryUseCase,
    GetOrderByIdUseCase,
    GetDisputeEvidenceUploadSignaturesUseCase,
    ListAdminOpenDisputesUseCase,
    ListDisputeEvidenceUseCase,
    MarkOrderPaidUseCase,
    CompleteOrderUseCase,
    CancelOrderUseCase,
    OpenOrderDisputeUseCase,
    ResolveAdminDisputeUseCase,
    ResolveOrderDisputeUseCase,
    RefundOrderUseCase,
    UpdateAdminDisputeCaseUseCase,
  ],
  exports: [
    OrdersRepository,
    OrderInventoryPort,
    WholesalePricingPort,
    OrderInventoryService,
    OrderPlacementService,
    OrderReversalService,
    GetActiveCartUseCase,
    AddCartItemUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    CheckoutCartItemUseCase,
    AddDisputeEvidenceBatchUseCase,
    AssignAdminDisputeUseCase,
    CreateRetailOrderUseCase,
    CreateWholesaleOrderUseCase,
    GetAdminDisputeDetailUseCase,
    GetAdminOpenDisputeCountUseCase,
    GetAdminDisputeSummaryUseCase,
    GetOrderByIdUseCase,
    GetDisputeEvidenceUploadSignaturesUseCase,
    ListAdminOpenDisputesUseCase,
    ListDisputeEvidenceUseCase,
    MarkOrderPaidUseCase,
    CompleteOrderUseCase,
    CancelOrderUseCase,
    OpenOrderDisputeUseCase,
    ResolveAdminDisputeUseCase,
    ResolveOrderDisputeUseCase,
    RefundOrderUseCase,
    UpdateAdminDisputeCaseUseCase,
  ],
})
export class OrdersModule {}
