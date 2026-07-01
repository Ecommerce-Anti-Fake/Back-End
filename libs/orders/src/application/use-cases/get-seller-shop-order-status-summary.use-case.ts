import { Injectable } from '@nestjs/common';
import { SellerShopOrderStatusSummaryMessage } from '@contracts';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class GetSellerShopOrderStatusSummaryUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  execute(input: SellerShopOrderStatusSummaryMessage) {
    return this.ordersRepository.getSellerShopOrderStatusSummary(input);
  }
}
