import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CreateDistributionNetworkMessage,
  CreateDistributionNodeMessage,
  CreateDistributionPricingPolicyMessage,
  CreateDistributionShipmentMessage,
  DispatchDistributionShipmentMessage,
  DISTRIBUTION_MESSAGE_PATTERNS,
  DistributionNetworksLookupMessage,
  DistributionNodesLookupMessage,
  DistributionPricingPolicyLookupMessage,
  DistributionShipmentsLookupMessage,
  CancelDistributionShipmentMessage,
  ReceiveDistributionShipmentMessage,
  USERS_SERVICE_CLIENT,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class DistributionRpcService {
  constructor(
    @Inject(USERS_SERVICE_CLIENT)
    private readonly usersClient: ClientProxy,
  ) {}

  createNetwork(payload: CreateDistributionNetworkMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.createNetwork, payload);
  }

  findNetworks(payload: DistributionNetworksLookupMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.findNetworks, payload);
  }

  createNode(payload: CreateDistributionNodeMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.createNode, payload);
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

  receiveShipment(payload: ReceiveDistributionShipmentMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.receiveShipment, payload);
  }

  cancelShipment(payload: CancelDistributionShipmentMessage) {
    return this.send(DISTRIBUTION_MESSAGE_PATTERNS.cancelShipment, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.usersClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
