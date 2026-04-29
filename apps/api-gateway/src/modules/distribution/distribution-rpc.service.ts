import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
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
  DISTRIBUTION_MESSAGE_PATTERNS,
  DistributionNetworksLookupMessage,
  DistributionNodesLookupMessage,
  DistributionPricingPolicyLookupMessage,
  SupplyBatchesLookupMessage,
  SupplyBatchDetailMessage,
  InventorySummaryMessage,
  DistributionShipmentsLookupMessage,
  CancelDistributionShipmentMessage,
  ReceiveDistributionShipmentMessage,
  CATALOG_SERVICE_CLIENT,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class DistributionRpcService {
  constructor(
    @Inject(CATALOG_SERVICE_CLIENT)
    private readonly catalogClient: ClientProxy,
  ) {}

  createNetwork(payload: CreateDistributionNetworkMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.createNetwork, payload);
  }

  getBatchDocumentUploadSignatures(payload: BatchDocumentUploadSignaturesMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.getBatchDocumentUploadSignatures, payload);
  }

  addBatchDocumentsBatch(payload: AddBatchDocumentsBatchMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.addBatchDocumentsBatch, payload);
  }

  findBatchDocuments(payload: BatchDocumentsLookupMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.findBatchDocuments, payload);
  }

  findNetworks(payload: DistributionNetworksLookupMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.findNetworks, payload);
  }

  createNode(payload: CreateDistributionNodeMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.createNode, payload);
  }

  inviteNode(payload: InviteDistributionNodeMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.inviteNode, payload);
  }

  acceptNodeInvitation(payload: AcceptDistributionNodeInvitationMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.acceptNodeInvitation, payload);
  }

  declineNodeInvitation(payload: DeclineDistributionNodeInvitationMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.declineNodeInvitation, payload);
  }

  findMyInvitations(payload: MyDistributionInvitationsLookupMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.findMyInvitations, payload);
  }

  findMyMemberships(payload: MyDistributionMembershipsLookupMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.findMyMemberships, payload);
  }

  updateNodeStatus(payload: UpdateDistributionNodeStatusMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.updateNodeStatus, payload);
  }

  createBatch(payload: CreateSupplyBatchMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.createBatch, payload);
  }

  findBatches(payload: SupplyBatchesLookupMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.findBatches, payload);
  }

  getBatchDetail(payload: SupplyBatchDetailMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.getBatchDetail, payload);
  }

  getInventorySummary(payload: InventorySummaryMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.getInventorySummary, payload);
  }

  findNodesByNetwork(payload: DistributionNodesLookupMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.findNodesByNetwork, payload);
  }

  createPricingPolicy(payload: CreateDistributionPricingPolicyMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.createPricingPolicy, payload);
  }

  findPricingPoliciesByNetwork(payload: DistributionPricingPolicyLookupMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.findPricingPoliciesByNetwork, payload);
  }

  createShipment(payload: CreateDistributionShipmentMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.createShipment, payload);
  }

  dispatchShipment(payload: DispatchDistributionShipmentMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.dispatchShipment, payload);
  }

  findShipmentsByNetwork(payload: DistributionShipmentsLookupMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.findShipmentsByNetwork, payload);
  }

  getShipment(payload: DistributionShipmentDetailMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.getShipment, payload);
  }

  receiveShipment(payload: ReceiveDistributionShipmentMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.receiveShipment, payload);
  }

  cancelShipment(payload: CancelDistributionShipmentMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.cancelShipment, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.catalogClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
