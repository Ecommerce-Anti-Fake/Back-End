import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDERS_MESSAGE_PATTERNS } from '@contracts';
import type {
  AdminDisputeDetailMessage,
  AdminDisputeSummaryMessage,
  AdminOpenDisputeCountMessage,
  AdminOpenDisputesLookupMessage,
  AssignAdminDisputeMessage,
  CreateRetailOrderMessage,
  CreateWholesaleOrderMessage,
  MarkOrderPaidMessage,
  OrderLookupMessage,
  CompleteOrderMessage,
  CancelOrderMessage,
  AddDisputeEvidenceBatchMessage,
  DisputeEvidenceLookupMessage,
  DisputeEvidenceUploadSignaturesMessage,
  OpenOrderDisputeMessage,
  ResolveAdminDisputeMessage,
  ResolveOrderDisputeMessage,
  RefundOrderMessage,
  UpdateAdminDisputeCaseMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  AddDisputeEvidenceBatchUseCase,
  AssignAdminDisputeUseCase,
  CreateRetailOrderUseCase,
  CreateWholesaleOrderUseCase,
  GetAdminDisputeDetailUseCase,
  GetAdminDisputeSummaryUseCase,
  GetAdminOpenDisputeCountUseCase,
  GetOrderByIdUseCase,
  GetDisputeEvidenceUploadSignaturesUseCase,
  ListAdminOpenDisputesUseCase,
  ListDisputeEvidenceUseCase,
  MarkOrderPaidUseCase,
  CompleteOrderUseCase,
  CancelOrderUseCase,
  OpenOrderDisputeUseCase,
  ResolveAdminDisputeUseCase,
  ResolveOrderDisputeUseCase,
  RefundOrderUseCase,
  UpdateAdminDisputeCaseUseCase,
} from '../../application/use-cases';

@Controller()
export class OrdersRpcController {
  constructor(
    private readonly createRetailOrderUseCase: CreateRetailOrderUseCase,
    private readonly createWholesaleOrderUseCase: CreateWholesaleOrderUseCase,
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
    private readonly completeOrderUseCase: CompleteOrderUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly openOrderDisputeUseCase: OpenOrderDisputeUseCase,
    private readonly resolveAdminDisputeUseCase: ResolveAdminDisputeUseCase,
    private readonly resolveOrderDisputeUseCase: ResolveOrderDisputeUseCase,
    private readonly refundOrderUseCase: RefundOrderUseCase,
    private readonly updateAdminDisputeCaseUseCase: UpdateAdminDisputeCaseUseCase,
  ) {}

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
