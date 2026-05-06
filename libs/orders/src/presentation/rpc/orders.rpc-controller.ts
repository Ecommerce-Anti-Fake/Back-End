import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDERS_MESSAGE_PATTERNS } from '@contracts';
import type {
  ActiveCartMessage,
  AddCartItemMessage,
  AdminDisputeDetailMessage,
  AdminDisputeSummaryMessage,
  AdminOpenDisputeCountMessage,
  AdminOpenDisputesLookupMessage,
  AssignAdminDisputeMessage,
  CheckoutCartItemMessage,
  CreateRetailOrderMessage,
  CreateWholesaleOrderMessage,
  MarkOrderPaidMessage,
  MyOrdersLookupMessage,
  OrderLookupMessage,
  PayOSWebhookMessage,
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
  UpdateCartItemMessage,
  UpdateAdminDisputeCaseMessage,
  UpdateOrderFulfillmentMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  AddDisputeEvidenceBatchUseCase,
  AddCartItemUseCase,
  AssignAdminDisputeUseCase,
  CheckoutCartItemUseCase,
  CreateRetailOrderUseCase,
  CreateWholesaleOrderUseCase,
  GetAdminDisputeDetailUseCase,
  GetAdminDisputeSummaryUseCase,
  GetAdminOpenDisputeCountUseCase,
  GetActiveCartUseCase,
  GetOrderByIdUseCase,
  GetDisputeEvidenceUploadSignaturesUseCase,
  ListAdminOpenDisputesUseCase,
  ListDisputeEvidenceUseCase,
  ListMyOrdersUseCase,
  ListSellerShopOrdersUseCase,
  MarkOrderPaidUseCase,
  HandlePayOSWebhookUseCase,
  RemoveCartItemUseCase,
  CompleteOrderUseCase,
  CancelOrderUseCase,
  OpenOrderDisputeUseCase,
  ResolveAdminDisputeUseCase,
  ResolveOrderDisputeUseCase,
  RefundOrderUseCase,
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
    private readonly createRetailOrderUseCase: CreateRetailOrderUseCase,
    private readonly createWholesaleOrderUseCase: CreateWholesaleOrderUseCase,
    private readonly listMyOrdersUseCase: ListMyOrdersUseCase,
    private readonly listSellerShopOrdersUseCase: ListSellerShopOrdersUseCase,
    private readonly getAdminDisputeDetailUseCase: GetAdminDisputeDetailUseCase,
    private readonly getAdminDisputeSummaryUseCase: GetAdminDisputeSummaryUseCase,
    private readonly getAdminOpenDisputeCountUseCase: GetAdminOpenDisputeCountUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
    private readonly getDisputeEvidenceUploadSignaturesUseCase: GetDisputeEvidenceUploadSignaturesUseCase,
    private readonly listAdminOpenDisputesUseCase: ListAdminOpenDisputesUseCase,
    private readonly addDisputeEvidenceBatchUseCase: AddDisputeEvidenceBatchUseCase,
    private readonly assignAdminDisputeUseCase: AssignAdminDisputeUseCase,
    private readonly listDisputeEvidenceUseCase: ListDisputeEvidenceUseCase,
    private readonly markOrderPaidUseCase: MarkOrderPaidUseCase,
    private readonly handlePayOSWebhookUseCase: HandlePayOSWebhookUseCase,
    private readonly completeOrderUseCase: CompleteOrderUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly openOrderDisputeUseCase: OpenOrderDisputeUseCase,
    private readonly resolveAdminDisputeUseCase: ResolveAdminDisputeUseCase,
    private readonly resolveOrderDisputeUseCase: ResolveOrderDisputeUseCase,
    private readonly refundOrderUseCase: RefundOrderUseCase,
    private readonly updateAdminDisputeCaseUseCase: UpdateAdminDisputeCaseUseCase,
    private readonly updateOrderFulfillmentUseCase: UpdateOrderFulfillmentUseCase,
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

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.createRetail)
  async createRetail(@Payload() payload: CreateRetailOrderMessage) {
    try {
      return await this.createRetailOrderUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.createWholesale)
  async createWholesale(@Payload() payload: CreateWholesaleOrderMessage) {
    try {
      return await this.createWholesaleOrderUseCase.execute(payload);
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

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findById)
  async findById(@Payload() payload: OrderLookupMessage) {
    try {
      return await this.getOrderByIdUseCase.execute(payload.id, payload.requesterUserId);
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

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.updateFulfillment)
  async updateFulfillment(@Payload() payload: UpdateOrderFulfillmentMessage) {
    try {
      return await this.updateOrderFulfillmentUseCase.execute(payload);
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
