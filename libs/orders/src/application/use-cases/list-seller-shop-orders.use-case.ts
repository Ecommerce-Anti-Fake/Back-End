import { Injectable } from '@nestjs/common';
import { OrdersRepository, SellerShopOrderRecord } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class ListSellerShopOrdersUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { requesterUserId: string; shopId: string; orderStatus?: string; page?: number; pageSize?: number }) {
    const result = await this.ordersRepository.findSellerShopOrders(input);

    return {
      ...result,
      items: result.items.map(toSellerShopOrderListItem),
    };
  }
}

function toSellerShopOrderListItem(order: SellerShopOrderRecord) {
  return {
    orderId: order.id,
    customer: {
      id: order.buyer?.id ?? order.buyerUserId ?? null,
      name: order.buyer?.displayName ?? order.shippingName ?? null,
      email: order.buyer?.email ?? null,
    },
    orderAmount: decimalToNumber(order.buyerPayableAmount),
    orderStatus: order.orderStatus,
  };
}

function decimalToNumber(value: { toString(): string } | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value.toString());
}
