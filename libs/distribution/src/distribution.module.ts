import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  CreateDistributionNetworkUseCase,
  CreateDistributionNodeUseCase,
  CreateDistributionShipmentUseCase,
  DispatchDistributionShipmentUseCase,
  CreatePricingPolicyUseCase,
  ListDistributionNetworksUseCase,
  ListDistributionNodesUseCase,
  ListDistributionShipmentsUseCase,
  ListPricingPoliciesByNetworkUseCase,
  CancelDistributionShipmentUseCase,
  ReceiveDistributionShipmentUseCase,
} from './application/use-cases';
import { DistributionPricingRepository } from './infrastructure/persistence/distribution-pricing.repository';
import { DistributionPricingRpcController } from './presentation/rpc/distribution-pricing.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [DistributionPricingRpcController],
  providers: [
    DistributionPricingRepository,
    CreateDistributionNetworkUseCase,
    ListDistributionNetworksUseCase,
    CreateDistributionNodeUseCase,
    CreateDistributionShipmentUseCase,
    DispatchDistributionShipmentUseCase,
    ListDistributionNodesUseCase,
    ListDistributionShipmentsUseCase,
    CancelDistributionShipmentUseCase,
    ReceiveDistributionShipmentUseCase,
    CreatePricingPolicyUseCase,
    ListPricingPoliciesByNetworkUseCase,
  ],
  exports: [
    DistributionPricingRepository,
    CreateDistributionNetworkUseCase,
    ListDistributionNetworksUseCase,
    CreateDistributionNodeUseCase,
    CreateDistributionShipmentUseCase,
    DispatchDistributionShipmentUseCase,
    ListDistributionNodesUseCase,
    ListDistributionShipmentsUseCase,
    CancelDistributionShipmentUseCase,
    ReceiveDistributionShipmentUseCase,
    CreatePricingPolicyUseCase,
    ListPricingPoliciesByNetworkUseCase,
  ],
})
export class DistributionModule {}
