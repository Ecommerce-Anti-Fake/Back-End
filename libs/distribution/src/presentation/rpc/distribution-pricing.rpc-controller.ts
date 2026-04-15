import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DISTRIBUTION_MESSAGE_PATTERNS } from '@contracts';
import type {
  CreateDistributionNetworkMessage,
  CreateDistributionNodeMessage,
  CreateDistributionPricingPolicyMessage,
  CreateDistributionShipmentMessage,
  DispatchDistributionShipmentMessage,
  DistributionNetworksLookupMessage,
  DistributionNodesLookupMessage,
  DistributionPricingPolicyLookupMessage,
  DistributionShipmentsLookupMessage,
  CancelDistributionShipmentMessage,
  ReceiveDistributionShipmentMessage,
} from '@contracts';
import { throwRpcException } from '@common';
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
} from '../../application/use-cases';

@Controller()
export class DistributionPricingRpcController {
  constructor(
    private readonly createDistributionNetworkUseCase: CreateDistributionNetworkUseCase,
    private readonly listDistributionNetworksUseCase: ListDistributionNetworksUseCase,
    private readonly createDistributionNodeUseCase: CreateDistributionNodeUseCase,
    private readonly listDistributionNodesUseCase: ListDistributionNodesUseCase,
    private readonly createDistributionShipmentUseCase: CreateDistributionShipmentUseCase,
    private readonly dispatchDistributionShipmentUseCase: DispatchDistributionShipmentUseCase,
    private readonly listDistributionShipmentsUseCase: ListDistributionShipmentsUseCase,
    private readonly cancelDistributionShipmentUseCase: CancelDistributionShipmentUseCase,
    private readonly receiveDistributionShipmentUseCase: ReceiveDistributionShipmentUseCase,
    private readonly createPricingPolicyUseCase: CreatePricingPolicyUseCase,
    private readonly listPricingPoliciesByNetworkUseCase: ListPricingPoliciesByNetworkUseCase,
  ) {}

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.createNetwork)
  async createNetwork(@Payload() payload: CreateDistributionNetworkMessage) {
    try {
      return await this.createDistributionNetworkUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.findNetworks)
  async findNetworks(@Payload() payload: DistributionNetworksLookupMessage) {
    try {
      return await this.listDistributionNetworksUseCase.execute(payload.requesterUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.createNode)
  async createNode(@Payload() payload: CreateDistributionNodeMessage) {
    try {
      return await this.createDistributionNodeUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.findNodesByNetwork)
  async findNodesByNetwork(@Payload() payload: DistributionNodesLookupMessage) {
    try {
      return await this.listDistributionNodesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.createShipment)
  async createShipment(@Payload() payload: CreateDistributionShipmentMessage) {
    try {
      return await this.createDistributionShipmentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.dispatchShipment)
  async dispatchShipment(@Payload() payload: DispatchDistributionShipmentMessage) {
    try {
      return await this.dispatchDistributionShipmentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.findShipmentsByNetwork)
  async findShipmentsByNetwork(@Payload() payload: DistributionShipmentsLookupMessage) {
    try {
      return await this.listDistributionShipmentsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.receiveShipment)
  async receiveShipment(@Payload() payload: ReceiveDistributionShipmentMessage) {
    try {
      return await this.receiveDistributionShipmentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.cancelShipment)
  async cancelShipment(@Payload() payload: CancelDistributionShipmentMessage) {
    try {
      return await this.cancelDistributionShipmentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.createPricingPolicy)
  async createPricingPolicy(@Payload() payload: CreateDistributionPricingPolicyMessage) {
    try {
      return await this.createPricingPolicyUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.findPricingPoliciesByNetwork)
  async findByNetwork(@Payload() payload: DistributionPricingPolicyLookupMessage) {
    try {
      return await this.listPricingPoliciesByNetworkUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
