import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DISTRIBUTION_MESSAGE_PATTERNS } from '@contracts';
import type {
  AddBatchDocumentsBatchMessage,
  BatchDocumentUploadSignaturesMessage,
  BatchDocumentsLookupMessage,
  CreateDistributionNetworkMessage,
  CreateDistributionNodeMessage,
  InviteDistributionNodeMessage,
  AcceptDistributionNodeInvitationMessage,
  DeclineDistributionNodeInvitationMessage,
  MyDistributionInvitationsLookupMessage,
  MyDistributionMembershipsLookupMessage,
  UpdateDistributionNodeStatusMessage,
  CreateDistributionPricingPolicyMessage,
  CreateSupplyBatchMessage,
  CreateDistributionShipmentMessage,
  DispatchDistributionShipmentMessage,
  DistributionShipmentDetailMessage,
  DistributionNetworksLookupMessage,
  DistributionNodesLookupMessage,
  DistributionPricingPolicyLookupMessage,
  SupplyBatchesLookupMessage,
  SupplyBatchDetailMessage,
  InventorySummaryMessage,
  DistributionShipmentsLookupMessage,
  CancelDistributionShipmentMessage,
  ReceiveDistributionShipmentMessage,
  ResolveWholesalePricingMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  AddBatchDocumentsBatchUseCase,
  GetBatchDocumentUploadSignaturesUseCase,
  CreateDistributionNetworkUseCase,
  CreateDistributionNodeUseCase,
  InviteDistributionNodeUseCase,
  AcceptDistributionNodeInvitationUseCase,
  DeclineDistributionNodeInvitationUseCase,
  ListMyDistributionInvitationsUseCase,
  ListMyDistributionMembershipsUseCase,
  UpdateDistributionNodeStatusUseCase,
  CreateSupplyBatchUseCase,
  GetInventorySummaryUseCase,
  GetSupplyBatchDetailUseCase,
  CreateDistributionShipmentUseCase,
  DispatchDistributionShipmentUseCase,
  GetDistributionShipmentUseCase,
  CreatePricingPolicyUseCase,
  ListDistributionNetworksUseCase,
  ListDistributionNodesUseCase,
  ListSupplyBatchesUseCase,
  ListDistributionShipmentsUseCase,
  ListPricingPoliciesByNetworkUseCase,
  CancelDistributionShipmentUseCase,
  ListBatchDocumentsUseCase,
  ReceiveDistributionShipmentUseCase,
  ResolveWholesalePricingUseCase,
} from '../../application/use-cases';

@Controller()
export class DistributionPricingRpcController {
  constructor(
    private readonly createDistributionNetworkUseCase: CreateDistributionNetworkUseCase,
    private readonly getBatchDocumentUploadSignaturesUseCase: GetBatchDocumentUploadSignaturesUseCase,
    private readonly addBatchDocumentsBatchUseCase: AddBatchDocumentsBatchUseCase,
    private readonly listBatchDocumentsUseCase: ListBatchDocumentsUseCase,
    private readonly listDistributionNetworksUseCase: ListDistributionNetworksUseCase,
    private readonly createDistributionNodeUseCase: CreateDistributionNodeUseCase,
    private readonly inviteDistributionNodeUseCase: InviteDistributionNodeUseCase,
    private readonly acceptDistributionNodeInvitationUseCase: AcceptDistributionNodeInvitationUseCase,
    private readonly declineDistributionNodeInvitationUseCase: DeclineDistributionNodeInvitationUseCase,
    private readonly listMyDistributionInvitationsUseCase: ListMyDistributionInvitationsUseCase,
    private readonly listMyDistributionMembershipsUseCase: ListMyDistributionMembershipsUseCase,
    private readonly updateDistributionNodeStatusUseCase: UpdateDistributionNodeStatusUseCase,
    private readonly listDistributionNodesUseCase: ListDistributionNodesUseCase,
    private readonly createSupplyBatchUseCase: CreateSupplyBatchUseCase,
    private readonly listSupplyBatchesUseCase: ListSupplyBatchesUseCase,
    private readonly getSupplyBatchDetailUseCase: GetSupplyBatchDetailUseCase,
    private readonly getInventorySummaryUseCase: GetInventorySummaryUseCase,
    private readonly createDistributionShipmentUseCase: CreateDistributionShipmentUseCase,
    private readonly dispatchDistributionShipmentUseCase: DispatchDistributionShipmentUseCase,
    private readonly getDistributionShipmentUseCase: GetDistributionShipmentUseCase,
    private readonly listDistributionShipmentsUseCase: ListDistributionShipmentsUseCase,
    private readonly cancelDistributionShipmentUseCase: CancelDistributionShipmentUseCase,
    private readonly receiveDistributionShipmentUseCase: ReceiveDistributionShipmentUseCase,
    private readonly createPricingPolicyUseCase: CreatePricingPolicyUseCase,
    private readonly listPricingPoliciesByNetworkUseCase: ListPricingPoliciesByNetworkUseCase,
    private readonly resolveWholesalePricingUseCase: ResolveWholesalePricingUseCase,
  ) {}

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.createNetwork)
  async createNetwork(@Payload() payload: CreateDistributionNetworkMessage) {
    try {
      return await this.createDistributionNetworkUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.getBatchDocumentUploadSignatures)
  async getBatchDocumentUploadSignatures(@Payload() payload: BatchDocumentUploadSignaturesMessage) {
    try {
      return await this.getBatchDocumentUploadSignaturesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.addBatchDocumentsBatch)
  async addBatchDocumentsBatch(@Payload() payload: AddBatchDocumentsBatchMessage) {
    try {
      return await this.addBatchDocumentsBatchUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.findBatchDocuments)
  async findBatchDocuments(@Payload() payload: BatchDocumentsLookupMessage) {
    try {
      return await this.listBatchDocumentsUseCase.execute(payload);
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

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.inviteNode)
  async inviteNode(@Payload() payload: InviteDistributionNodeMessage) {
    try {
      return await this.inviteDistributionNodeUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.acceptNodeInvitation)
  async acceptNodeInvitation(@Payload() payload: AcceptDistributionNodeInvitationMessage) {
    try {
      return await this.acceptDistributionNodeInvitationUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.declineNodeInvitation)
  async declineNodeInvitation(@Payload() payload: DeclineDistributionNodeInvitationMessage) {
    try {
      return await this.declineDistributionNodeInvitationUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.findMyInvitations)
  async findMyInvitations(@Payload() payload: MyDistributionInvitationsLookupMessage) {
    try {
      return await this.listMyDistributionInvitationsUseCase.execute(payload.requesterUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.findMyMemberships)
  async findMyMemberships(@Payload() payload: MyDistributionMembershipsLookupMessage) {
    try {
      return await this.listMyDistributionMembershipsUseCase.execute(payload.requesterUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.updateNodeStatus)
  async updateNodeStatus(@Payload() payload: UpdateDistributionNodeStatusMessage) {
    try {
      return await this.updateDistributionNodeStatusUseCase.execute(payload);
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

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.createBatch)
  async createBatch(@Payload() payload: CreateSupplyBatchMessage) {
    try {
      return await this.createSupplyBatchUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.findBatches)
  async findBatches(@Payload() payload: SupplyBatchesLookupMessage) {
    try {
      return await this.listSupplyBatchesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.getBatchDetail)
  async getBatchDetail(@Payload() payload: SupplyBatchDetailMessage) {
    try {
      return await this.getSupplyBatchDetailUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.getInventorySummary)
  async getInventorySummary(@Payload() payload: InventorySummaryMessage) {
    try {
      return await this.getInventorySummaryUseCase.execute(payload);
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

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.getShipment)
  async getShipment(@Payload() payload: DistributionShipmentDetailMessage) {
    try {
      return await this.getDistributionShipmentUseCase.execute(payload);
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

  @MessagePattern(DISTRIBUTION_MESSAGE_PATTERNS.resolveWholesalePricing)
  async resolveWholesalePricing(@Payload() payload: ResolveWholesalePricingMessage) {
    try {
      return await this.resolveWholesalePricingUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
