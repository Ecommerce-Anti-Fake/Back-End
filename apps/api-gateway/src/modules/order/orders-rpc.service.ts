import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ActiveCartMessage,
  AddCartItemMessage,
  AdminFinanceReconciliationMessage,
  AdminOrdersLookupMessage,
  AssignAdminDisputeMessage,
  UpdateAdminDisputeCaseMessage,
  ResolveAdminDisputeMessage,
  AdminDisputeDetailMessage,
  AdminDisputeSummaryMessage,
  AdminOpenDisputesLookupMessage,
  AdminOpenDisputeCountMessage,
  AdminModerationCasesLookupMessage,
  AdminRiskScoresLookupMessage,
  AdminReportsLookupMessage,
  CalculateRiskScoreMessage,
  CreateOrderMessage,
  CreateReportMessage,
  CheckoutCartItemMessage,
  CheckoutCartMessage,
  QuoteCartShippingOptionsMessage,
  QuoteCartItemShippingOptionsMessage,
  MarkOrderPaidMessage,
  MyOrdersLookupMessage,
  MyReportsLookupMessage,
  ORDERS_MESSAGE_PATTERNS,
  OrderFulfillmentAuditMessage,
  OrderLookupMessage,
  RetryPayOSPaymentMessage,
  SellerShopDashboardAnalyticsMessage,
  SellerShopDailyMetricsMessage,
  SellerShopSummaryMetricsMessage,
  SellerShopOrderStatusSummaryMessage,
  ShopBestSellingProductsLookupMessage,
  SellerShopOrdersLookupMessage,
  DisputeEvidenceUploadSignaturesMessage,
  AddDisputeEvidenceBatchMessage,
  DisputeEvidenceLookupMessage,
  CompleteOrderMessage,
  CancelOrderMessage,
  OpenOrderDisputeMessage,
  ORDERS_SERVICE_CLIENT,
  PayOSWebhookMessage,
  BookOrderShippingMessage,
  SyncOrderShippingStatusMessage,
  GhnDistrictsLookupMessage,
  GhnServicesLookupMessage,
  GhnWardsLookupMessage,
  ReceiveWholesaleInventoryMessage,
  ResolveOrderDisputeMessage,
  UpdateAdminReportMessage,
  UpdateAdminModerationCaseMessage,
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

  checkoutCart(payload: CheckoutCartMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.checkoutCart, payload);
  }

  quoteCartItemShippingOptions(payload: QuoteCartItemShippingOptionsMessage) {
    return this.send(
      ORDERS_MESSAGE_PATTERNS.quoteCartItemShippingOptions,
      payload,
    );
  }

  quoteCartShippingOptions(payload: QuoteCartShippingOptionsMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.quoteCartShippingOptions, payload);
  }

  create(payload: CreateOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.create, payload);
  }

  findMine(payload: MyOrdersLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findMine, payload);
  }

  findSellerShopOrders(payload: SellerShopOrdersLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findSellerShopOrders, payload);
  }

  getSellerShopDashboardAnalytics(
    payload: SellerShopDashboardAnalyticsMessage,
  ) {
    return this.send(
      ORDERS_MESSAGE_PATTERNS.getSellerShopDashboardAnalytics,
      payload,
    );
  }

  getSellerShopDailyMetrics(payload: SellerShopDailyMetricsMessage) {
    return this.send(
      ORDERS_MESSAGE_PATTERNS.getSellerShopDailyMetrics,
      payload,
    );
  }

  getSellerShopSummaryMetrics(payload: SellerShopSummaryMetricsMessage) {
    return this.send(
      ORDERS_MESSAGE_PATTERNS.getSellerShopSummaryMetrics,
      payload,
    );
  }

  getSellerShopOrderStatusSummary(
    payload: SellerShopOrderStatusSummaryMessage,
  ) {
    return this.send(
      ORDERS_MESSAGE_PATTERNS.getSellerShopOrderStatusSummary,
      payload,
    );
  }

  getShopBestSellingProducts(payload: ShopBestSellingProductsLookupMessage) {
    return this.send(
      ORDERS_MESSAGE_PATTERNS.getShopBestSellingProducts,
      payload,
    );
  }

  findAdminOrders(payload: AdminOrdersLookupMessage = {}) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findAdminOrders, payload);
  }

  getAdminFinanceReconciliation(
    payload: AdminFinanceReconciliationMessage = {},
  ) {
    return this.send(
      ORDERS_MESSAGE_PATTERNS.getAdminFinanceReconciliation,
      payload,
    );
  }

  findById(payload: OrderLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findById, payload);
  }

  getFulfillmentAudit(payload: OrderFulfillmentAuditMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.getFulfillmentAudit, payload);
  }

  getAdminOpenDisputeCount(payload: AdminOpenDisputeCountMessage = {}) {
    return this.send(ORDERS_MESSAGE_PATTERNS.getAdminOpenDisputeCount, payload);
  }

  findAdminOpenDisputes(payload: AdminOpenDisputesLookupMessage = {}) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findAdminOpenDisputes, payload);
  }

  createReport(payload: CreateReportMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.createReport, payload);
  }

  findMyReports(payload: MyReportsLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findMyReports, payload);
  }

  findAdminReports(payload: AdminReportsLookupMessage = {}) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findAdminReports, payload);
  }

  calculateRiskScore(payload: CalculateRiskScoreMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.calculateRiskScore, payload);
  }

  findAdminRiskScores(payload: AdminRiskScoresLookupMessage = {}) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findAdminRiskScores, payload);
  }

  findAdminModerationCases(payload: AdminModerationCasesLookupMessage = {}) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findAdminModerationCases, payload);
  }

  updateAdminModerationCase(payload: UpdateAdminModerationCaseMessage) {
    return this.send(
      ORDERS_MESSAGE_PATTERNS.updateAdminModerationCase,
      payload,
    );
  }

  updateAdminReport(payload: UpdateAdminReportMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.updateAdminReport, payload);
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

  retryPayOSPayment(payload: RetryPayOSPaymentMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.retryPayOSPayment, payload);
  }

  receiveWholesaleInventory(payload: ReceiveWholesaleInventoryMessage) {
    return this.send(
      ORDERS_MESSAGE_PATTERNS.receiveWholesaleInventory,
      payload,
    );
  }

  bookShipping(payload: BookOrderShippingMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.bookShipping, payload);
  }

  syncShippingStatus(payload: SyncOrderShippingStatusMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.syncShippingStatus, payload);
  }

  listGhnProvinces() {
    return this.send(ORDERS_MESSAGE_PATTERNS.listGhnProvinces, {});
  }

  listGhnDistricts(payload: GhnDistrictsLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.listGhnDistricts, payload);
  }

  listGhnWards(payload: GhnWardsLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.listGhnWards, payload);
  }

  listGhnServices(payload: GhnServicesLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.listGhnServices, payload);
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

  getDisputeEvidenceUploadSignatures(
    payload: DisputeEvidenceUploadSignaturesMessage,
  ) {
    return this.send(
      ORDERS_MESSAGE_PATTERNS.getDisputeEvidenceUploadSignatures,
      payload,
    );
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

  private async send<TResult>(
    pattern: string,
    payload: unknown,
  ): Promise<TResult> {
    try {
      return await lastValueFrom(
        this.ordersClient.send<TResult, unknown>(pattern, payload),
      );
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
