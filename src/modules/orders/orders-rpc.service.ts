import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ActiveCartMessage,
  AddCartItemMessage,
  AssignAdminDisputeMessage,
  UpdateAdminDisputeCaseMessage,
  ResolveAdminDisputeMessage,
  AdminDisputeDetailMessage,
  AdminDisputeSummaryMessage,
  AdminOpenDisputesLookupMessage,
  AdminOpenDisputeCountMessage,
  CreateRetailOrderMessage,
  CreateWholesaleOrderMessage,
  CheckoutCartItemMessage,
  MarkOrderPaidMessage,
  MyOrdersLookupMessage,
  ORDERS_MESSAGE_PATTERNS,
  OrderLookupMessage,
  SellerShopOrdersLookupMessage,
  DisputeEvidenceUploadSignaturesMessage,
  AddDisputeEvidenceBatchMessage,
  DisputeEvidenceLookupMessage,
  CompleteOrderMessage,
  CancelOrderMessage,
  OpenOrderDisputeMessage,
  ORDERS_SERVICE_CLIENT,
  PayOSWebhookMessage,
  ResolveOrderDisputeMessage,
  RefundOrderMessage,
  RemoveCartItemMessage,
  UpdateCartItemMessage,
  UpdateOrderFulfillmentMessage,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class OrdersRpcService {
  constructor(
    @Inject(ORDERS_SERVICE_CLIENT)
    private readonly ordersClient: ClientProxy,
  ) {}

  getActiveCart(payload: ActiveCartMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.getActiveCart, payload);
  }

  addCartItem(payload: AddCartItemMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.addCartItem, payload);
  }

  updateCartItem(payload: UpdateCartItemMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.updateCartItem, payload);
  }

  removeCartItem(payload: RemoveCartItemMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.removeCartItem, payload);
  }

  checkoutCartItem(payload: CheckoutCartItemMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.checkoutCartItem, payload);
  }

  createRetail(payload: CreateRetailOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.createRetail, payload);
  }

  createWholesale(payload: CreateWholesaleOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.createWholesale, payload);
  }

  findMine(payload: MyOrdersLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findMine, payload);
  }

  findSellerShopOrders(payload: SellerShopOrdersLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findSellerShopOrders, payload);
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

  getAdminDisputeSummary(payload: AdminDisputeSummaryMessage = {}) {
    return this.send(ORDERS_MESSAGE_PATTERNS.getAdminDisputeSummary, payload);
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

  handlePayOSWebhook(payload: PayOSWebhookMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.handlePayOSWebhook, payload);
  }

  updateFulfillment(payload: UpdateOrderFulfillmentMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.updateFulfillment, payload);
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
      return await lastValueFrom(this.ordersClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
