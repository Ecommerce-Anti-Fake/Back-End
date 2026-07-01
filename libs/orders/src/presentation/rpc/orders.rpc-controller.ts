import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDERS_MESSAGE_PATTERNS } from '@contracts';
import type {
  ActiveCartMessage,
  AddCartItemMessage,
  AdminDisputeDetailMessage,
  AdminDisputeSummaryMessage,
  AdminFinanceReconciliationMessage,
  AdminOrdersLookupMessage,
  AdminOpenDisputeCountMessage,
  AdminOpenDisputesLookupMessage,
  AdminModerationCasesLookupMessage,
  AdminReportsLookupMessage,
  AdminRiskScoresLookupMessage,
  AssignAdminDisputeMessage,
  CalculateRiskScoreMessage,
  CheckoutCartItemMessage,
  QuoteCartShippingOptionsMessage,
  QuoteCartItemShippingOptionsMessage,
  CreateOrderMessage,
  CreateReportMessage,
  MarkOrderPaidMessage,
  MyOrdersLookupMessage,
  MyReportsLookupMessage,
  OrderFulfillmentAuditMessage,
  OrderLookupMessage,
  PayOSWebhookMessage,
  ReceiveWholesaleInventoryMessage,
  RetryPayOSPaymentMessage,
  SellerShopOrdersLookupMessage,
  CompleteOrderMessage,
  CancelOrderMessage,
  AddDisputeEvidenceBatchMessage,
  DisputeEvidenceLookupMessage,
  DisputeEvidenceUploadSignaturesMessage,
  OpenOrderDisputeMessage,
  ResolveAdminDisputeMessage,
  ResolveOrderDisputeMessage,
  RefundOrderMessage,
  RemoveCartItemMessage,
  UpdateAdminReportMessage,
  UpdateAdminModerationCaseMessage,
  UpdateCartItemMessage,
  UpdateAdminDisputeCaseMessage,
  UpdateOrderFulfillmentMessage,
  BookOrderShippingMessage,
  SyncOrderShippingStatusMessage,
  GhnDistrictsLookupMessage,
  GhnServicesLookupMessage,
  GhnWardsLookupMessage,
  SellerShopDashboardAnalyticsMessage,
  SellerShopSummaryMetricsMessage,
  SellerShopOrderStatusSummaryMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  AddDisputeEvidenceBatchUseCase,
  AddCartItemUseCase,
  BookOrderShippingUseCase,
  SyncOrderShippingStatusUseCase,
  AssignAdminDisputeUseCase,
  CheckoutCartItemUseCase,
  QuoteCartShippingOptionsUseCase,
  QuoteCartItemShippingOptionsUseCase,
  CalculateRiskScoreUseCase,
  CreateOrderUseCase,
  CreateReportUseCase,
  GetAdminDisputeDetailUseCase,
  GetAdminDisputeSummaryUseCase,
  ListGhnShippingLocationsUseCase,
  GetAdminFinanceReconciliationUseCase,
  GetAdminOpenDisputeCountUseCase,
  GetActiveCartUseCase,
  GetOrderByIdUseCase,
  GetOrderFulfillmentAuditUseCase,
  GetDisputeEvidenceUploadSignaturesUseCase,
  ListAdminOpenDisputesUseCase,
  ListAdminModerationCasesUseCase,
  ListAdminReportsUseCase,
  ListAdminRiskScoresUseCase,
  ListDisputeEvidenceUseCase,
  ListMyOrdersUseCase,
  ListMyReportsUseCase,
  ListAdminOrdersUseCase,
  ListSellerShopOrdersUseCase,
  GetSellerShopDashboardAnalyticsUseCase,
  GetSellerShopSummaryMetricsUseCase,
  GetSellerShopOrderStatusSummaryUseCase,
  MarkOrderPaidUseCase,
  HandlePayOSWebhookUseCase,
  ReceiveWholesaleOrderInventoryUseCase,
  RetryPayOSPaymentUseCase,
  RemoveCartItemUseCase,
  CompleteOrderUseCase,
  CancelOrderUseCase,
  OpenOrderDisputeUseCase,
  ResolveAdminDisputeUseCase,
  ResolveOrderDisputeUseCase,
  RefundOrderUseCase,
  UpdateAdminReportUseCase,
  UpdateAdminModerationCaseUseCase,
  UpdateCartItemUseCase,
  UpdateAdminDisputeCaseUseCase,
  UpdateOrderFulfillmentUseCase,
} from '../../application/use-cases';

@Controller()
export class OrdersRpcController {
  constructor(
    private readonly getActiveCartUseCase: GetActiveCartUseCase,
    private readonly addCartItemUseCase: AddCartItemUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly checkoutCartItemUseCase: CheckoutCartItemUseCase,
    private readonly quoteCartItemShippingOptionsUseCase: QuoteCartItemShippingOptionsUseCase,
    private readonly quoteCartShippingOptionsUseCase: QuoteCartShippingOptionsUseCase,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly listMyOrdersUseCase: ListMyOrdersUseCase,
    private readonly listAdminOrdersUseCase: ListAdminOrdersUseCase,
    private readonly getAdminFinanceReconciliationUseCase: GetAdminFinanceReconciliationUseCase,
    private readonly listSellerShopOrdersUseCase: ListSellerShopOrdersUseCase,
    private readonly getSellerShopDashboardAnalyticsUseCase: GetSellerShopDashboardAnalyticsUseCase,
    private readonly getSellerShopSummaryMetricsUseCase: GetSellerShopSummaryMetricsUseCase,
    private readonly getSellerShopOrderStatusSummaryUseCase: GetSellerShopOrderStatusSummaryUseCase,
    private readonly getAdminDisputeDetailUseCase: GetAdminDisputeDetailUseCase,
    private readonly getAdminDisputeSummaryUseCase: GetAdminDisputeSummaryUseCase,
    private readonly getAdminOpenDisputeCountUseCase: GetAdminOpenDisputeCountUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
    private readonly getOrderFulfillmentAuditUseCase: GetOrderFulfillmentAuditUseCase,
    private readonly getDisputeEvidenceUploadSignaturesUseCase: GetDisputeEvidenceUploadSignaturesUseCase,
    private readonly listAdminOpenDisputesUseCase: ListAdminOpenDisputesUseCase,
    private readonly addDisputeEvidenceBatchUseCase: AddDisputeEvidenceBatchUseCase,
    private readonly assignAdminDisputeUseCase: AssignAdminDisputeUseCase,
    private readonly listDisputeEvidenceUseCase: ListDisputeEvidenceUseCase,
    private readonly markOrderPaidUseCase: MarkOrderPaidUseCase,
    private readonly handlePayOSWebhookUseCase: HandlePayOSWebhookUseCase,
    private readonly receiveWholesaleOrderInventoryUseCase: ReceiveWholesaleOrderInventoryUseCase,
    private readonly retryPayOSPaymentUseCase: RetryPayOSPaymentUseCase,
    private readonly completeOrderUseCase: CompleteOrderUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly calculateRiskScoreUseCase: CalculateRiskScoreUseCase,
    private readonly createReportUseCase: CreateReportUseCase,
    private readonly listAdminRiskScoresUseCase: ListAdminRiskScoresUseCase,
    private readonly listAdminModerationCasesUseCase: ListAdminModerationCasesUseCase,
    private readonly listAdminReportsUseCase: ListAdminReportsUseCase,
    private readonly listMyReportsUseCase: ListMyReportsUseCase,
    private readonly openOrderDisputeUseCase: OpenOrderDisputeUseCase,
    private readonly resolveAdminDisputeUseCase: ResolveAdminDisputeUseCase,
    private readonly resolveOrderDisputeUseCase: ResolveOrderDisputeUseCase,
    private readonly refundOrderUseCase: RefundOrderUseCase,
    private readonly updateAdminReportUseCase: UpdateAdminReportUseCase,
    private readonly updateAdminModerationCaseUseCase: UpdateAdminModerationCaseUseCase,
    private readonly updateAdminDisputeCaseUseCase: UpdateAdminDisputeCaseUseCase,
    private readonly bookOrderShippingUseCase: BookOrderShippingUseCase,
    private readonly syncOrderShippingStatusUseCase: SyncOrderShippingStatusUseCase,
    private readonly updateOrderFulfillmentUseCase: UpdateOrderFulfillmentUseCase,
    private readonly listGhnShippingLocationsUseCase: ListGhnShippingLocationsUseCase,
  ) {}

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.getActiveCart)
  async getActiveCart(@Payload() payload: ActiveCartMessage) {
    try {
      return await this.getActiveCartUseCase.execute(payload.buyerUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.addCartItem)
  async addCartItem(@Payload() payload: AddCartItemMessage) {
    try {
      return await this.addCartItemUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.updateCartItem)
  async updateCartItem(@Payload() payload: UpdateCartItemMessage) {
    try {
      return await this.updateCartItemUseCase.execute({
        buyerUserId: payload.buyerUserId,
        cartItemId: payload.cartItemId,
        quantity: payload.quantity,
      });
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.removeCartItem)
  async removeCartItem(@Payload() payload: RemoveCartItemMessage) {
    try {
      return await this.removeCartItemUseCase.execute({
        buyerUserId: payload.buyerUserId,
        cartItemId: payload.cartItemId,
      });
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.checkoutCartItem)
  async checkoutCartItem(@Payload() payload: CheckoutCartItemMessage) {
    try {
      return await this.checkoutCartItemUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.quoteCartItemShippingOptions)
  async quoteCartItemShippingOptions(@Payload() payload: QuoteCartItemShippingOptionsMessage) {
    try {
      return await this.quoteCartItemShippingOptionsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.quoteCartShippingOptions)
  async quoteCartShippingOptions(@Payload() payload: QuoteCartShippingOptionsMessage) {
    try {
      return await this.quoteCartShippingOptionsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.create)
  async create(@Payload() payload: CreateOrderMessage) {
    try {
      return await this.createOrderUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findMine)
  async findMine(@Payload() payload: MyOrdersLookupMessage) {
    try {
      return await this.listMyOrdersUseCase.execute(payload.requesterUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findSellerShopOrders)
  async findSellerShopOrders(@Payload() payload: SellerShopOrdersLookupMessage) {
    try {
      return await this.listSellerShopOrdersUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.getSellerShopDashboardAnalytics)
  async getSellerShopDashboardAnalytics(@Payload() payload: SellerShopDashboardAnalyticsMessage) {
    try {
      return await this.getSellerShopDashboardAnalyticsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.getSellerShopSummaryMetrics)
  async getSellerShopSummaryMetrics(@Payload() payload: SellerShopSummaryMetricsMessage) {
    try {
      return await this.getSellerShopSummaryMetricsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.getSellerShopOrderStatusSummary)
  async getSellerShopOrderStatusSummary(@Payload() payload: SellerShopOrderStatusSummaryMessage) {
    try {
      return await this.getSellerShopOrderStatusSummaryUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findAdminOrders)
  async findAdminOrders(@Payload() payload?: AdminOrdersLookupMessage) {
    try {
      return await this.listAdminOrdersUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.getAdminFinanceReconciliation)
  async getAdminFinanceReconciliation(@Payload() payload?: AdminFinanceReconciliationMessage) {
    try {
      return await this.getAdminFinanceReconciliationUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findById)
  async findById(@Payload() payload: OrderLookupMessage) {
    try {
      return await this.getOrderByIdUseCase.execute(payload.id, payload.requesterUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.getFulfillmentAudit)
  async getFulfillmentAudit(@Payload() payload: OrderFulfillmentAuditMessage) {
    try {
      return await this.getOrderFulfillmentAuditUseCase.execute(payload.id, payload.requesterUserId, payload.requesterRole);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.getAdminOpenDisputeCount)
  async getAdminOpenDisputeCount(@Payload() _payload?: AdminOpenDisputeCountMessage) {
    try {
      return await this.getAdminOpenDisputeCountUseCase.execute();
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findAdminOpenDisputes)
  async findAdminOpenDisputes(@Payload() payload?: AdminOpenDisputesLookupMessage) {
    try {
      return await this.listAdminOpenDisputesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.getAdminDisputeSummary)
  async getAdminDisputeSummary(@Payload() _payload?: AdminDisputeSummaryMessage) {
    try {
      return await this.getAdminDisputeSummaryUseCase.execute();
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.getAdminDisputeDetail)
  async getAdminDisputeDetail(@Payload() payload: AdminDisputeDetailMessage) {
    try {
      return await this.getAdminDisputeDetailUseCase.execute(payload.disputeId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.assignAdminDispute)
  async assignAdminDispute(@Payload() payload: AssignAdminDisputeMessage) {
    try {
      return await this.assignAdminDisputeUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.updateAdminDisputeCase)
  async updateAdminDisputeCase(@Payload() payload: UpdateAdminDisputeCaseMessage) {
    try {
      return await this.updateAdminDisputeCaseUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.resolveAdminDispute)
  async resolveAdminDispute(@Payload() payload: ResolveAdminDisputeMessage) {
    try {
      return await this.resolveAdminDisputeUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.markPaid)
  async markPaid(@Payload() payload: MarkOrderPaidMessage) {
    try {
      return await this.markOrderPaidUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.handlePayOSWebhook)
  async handlePayOSWebhook(@Payload() payload: PayOSWebhookMessage) {
    try {
      return await this.handlePayOSWebhookUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.retryPayOSPayment)
  async retryPayOSPayment(@Payload() payload: RetryPayOSPaymentMessage) {
    try {
      return await this.retryPayOSPaymentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.receiveWholesaleInventory)
  async receiveWholesaleInventory(@Payload() payload: ReceiveWholesaleInventoryMessage) {
    try {
      return await this.receiveWholesaleOrderInventoryUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.updateFulfillment)
  async updateFulfillment(@Payload() payload: UpdateOrderFulfillmentMessage) {
    try {
      return await this.updateOrderFulfillmentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.bookShipping)
  async bookShipping(@Payload() payload: BookOrderShippingMessage) {
    try {
      return await this.bookOrderShippingUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.syncShippingStatus)
  async syncShippingStatus(@Payload() payload: SyncOrderShippingStatusMessage) {
    try {
      return await this.syncOrderShippingStatusUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.listGhnProvinces)
  async listGhnProvinces() {
    try {
      return await this.listGhnShippingLocationsUseCase.listProvinces();
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.listGhnDistricts)
  async listGhnDistricts(@Payload() payload: GhnDistrictsLookupMessage) {
    try {
      return await this.listGhnShippingLocationsUseCase.listDistricts(payload.provinceId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.listGhnWards)
  async listGhnWards(@Payload() payload: GhnWardsLookupMessage) {
    try {
      return await this.listGhnShippingLocationsUseCase.listWards(payload.districtId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.listGhnServices)
  async listGhnServices(@Payload() payload: GhnServicesLookupMessage) {
    try {
      return await this.listGhnShippingLocationsUseCase.listServices(payload.districtId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.complete)
  async complete(@Payload() payload: CompleteOrderMessage) {
    try {
      return await this.completeOrderUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.cancel)
  async cancel(@Payload() payload: CancelOrderMessage) {
    try {
      return await this.cancelOrderUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.openDispute)
  async openDispute(@Payload() payload: OpenOrderDisputeMessage) {
    try {
      return await this.openOrderDisputeUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.createReport)
  async createReport(@Payload() payload: CreateReportMessage) {
    try {
      return await this.createReportUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.calculateRiskScore)
  async calculateRiskScore(@Payload() payload: CalculateRiskScoreMessage) {
    try {
      return await this.calculateRiskScoreUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findAdminRiskScores)
  async findAdminRiskScores(@Payload() payload?: AdminRiskScoresLookupMessage) {
    try {
      return await this.listAdminRiskScoresUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findAdminModerationCases)
  async findAdminModerationCases(@Payload() payload?: AdminModerationCasesLookupMessage) {
    try {
      return await this.listAdminModerationCasesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.updateAdminModerationCase)
  async updateAdminModerationCase(@Payload() payload: UpdateAdminModerationCaseMessage) {
    try {
      return await this.updateAdminModerationCaseUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findMyReports)
  async findMyReports(@Payload() payload: MyReportsLookupMessage) {
    try {
      return await this.listMyReportsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findAdminReports)
  async findAdminReports(@Payload() payload?: AdminReportsLookupMessage) {
    try {
      return await this.listAdminReportsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.updateAdminReport)
  async updateAdminReport(@Payload() payload: UpdateAdminReportMessage) {
    try {
      return await this.updateAdminReportUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.getDisputeEvidenceUploadSignatures)
  async getDisputeEvidenceUploadSignatures(@Payload() payload: DisputeEvidenceUploadSignaturesMessage) {
    try {
      return await this.getDisputeEvidenceUploadSignaturesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.addDisputeEvidenceBatch)
  async addDisputeEvidenceBatch(@Payload() payload: AddDisputeEvidenceBatchMessage) {
    try {
      return await this.addDisputeEvidenceBatchUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findDisputeEvidence)
  async findDisputeEvidence(@Payload() payload: DisputeEvidenceLookupMessage) {
    try {
      return await this.listDisputeEvidenceUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.resolveDispute)
  async resolveDispute(@Payload() payload: ResolveOrderDisputeMessage) {
    try {
      return await this.resolveOrderDisputeUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.refund)
  async refund(@Payload() payload: RefundOrderMessage) {
    try {
      return await this.refundOrderUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
