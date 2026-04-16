import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  AssignAdminDisputeMessage,
  UpdateAdminDisputeCaseMessage,
  ResolveAdminDisputeMessage,
  AdminDisputeDetailMessage,
  AdminOpenDisputesLookupMessage,
  AdminOpenDisputeCountMessage,
  CreateRetailOrderMessage,
  CreateWholesaleOrderMessage,
  MarkOrderPaidMessage,
  ORDERS_MESSAGE_PATTERNS,
  OrderLookupMessage,
  DisputeEvidenceUploadSignaturesMessage,
  AddDisputeEvidenceBatchMessage,
  DisputeEvidenceLookupMessage,
  CompleteOrderMessage,
  CancelOrderMessage,
  OpenOrderDisputeMessage,
  ResolveOrderDisputeMessage,
  RefundOrderMessage,
  USERS_SERVICE_CLIENT,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class OrdersRpcService {
  constructor(
    @Inject(USERS_SERVICE_CLIENT)
    private readonly usersClient: ClientProxy,
  ) {}

  createRetail(payload: CreateRetailOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.createRetail, payload);
  }

  createWholesale(payload: CreateWholesaleOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.createWholesale, payload);
  }

  findById(payload: OrderLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findById, payload);
  }

  getAdminOpenDisputeCount(payload: AdminOpenDisputeCountMessage = {}) {
    return this.send(ORDERS_MESSAGE_PATTERNS.getAdminOpenDisputeCount, payload);
  }

  findAdminOpenDisputes(payload: AdminOpenDisputesLookupMessage = {}) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findAdminOpenDisputes, payload);
  }

  getAdminDisputeDetail(payload: AdminDisputeDetailMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.getAdminDisputeDetail, payload);
  }

  assignAdminDispute(payload: AssignAdminDisputeMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.assignAdminDispute, payload);
  }

  updateAdminDisputeCase(payload: UpdateAdminDisputeCaseMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.updateAdminDisputeCase, payload);
  }

  resolveAdminDispute(payload: ResolveAdminDisputeMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.resolveAdminDispute, payload);
  }

  markPaid(payload: MarkOrderPaidMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.markPaid, payload);
  }

  complete(payload: CompleteOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.complete, payload);
  }

  cancel(payload: CancelOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.cancel, payload);
  }

  openDispute(payload: OpenOrderDisputeMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.openDispute, payload);
  }

  getDisputeEvidenceUploadSignatures(payload: DisputeEvidenceUploadSignaturesMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.getDisputeEvidenceUploadSignatures, payload);
  }

  addDisputeEvidenceBatch(payload: AddDisputeEvidenceBatchMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.addDisputeEvidenceBatch, payload);
  }

  findDisputeEvidence(payload: DisputeEvidenceLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findDisputeEvidence, payload);
  }

  resolveDispute(payload: ResolveOrderDisputeMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.resolveDispute, payload);
  }

  refund(payload: RefundOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.refund, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.usersClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
