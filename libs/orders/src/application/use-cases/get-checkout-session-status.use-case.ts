import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class GetCheckoutSessionStatusUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { buyerUserId: string; checkoutSessionId: string }) {
    const session = await this.ordersRepository.findCheckoutSessionByIdForBuyer(input);
    if (!session) {
      throw new NotFoundException('Checkout session not found');
    }

    return {
      status: session.paymentStatus,
    };
  }
}
