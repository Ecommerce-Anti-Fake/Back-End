import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toChatThreadResponse } from './products.mapper';

@Injectable()
export class StartChatThreadUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { requesterUserId: string; shopId: string; initialMessage?: string | null }) {
    const shop = await this.productRepository.findShopForChat(input.shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (shop.ownerUserId === input.requesterUserId) {
      throw new BadRequestException('Seller cannot start a buyer chat with own shop');
    }

    const existing = await this.productRepository.findChatThreadByShopAndBuyer(input.shopId, input.requesterUserId);
    const thread =
      existing ??
      (await this.productRepository.createChatThread({
        shopId: input.shopId,
        buyerUserId: input.requesterUserId,
        sellerUserId: shop.ownerUserId,
      }));

    const body = input.initialMessage?.trim();
    if (body) {
      await this.assertParticipant(thread, input.requesterUserId);
      const updatedThread = await this.productRepository.createChatMessage({
        threadId: thread.id,
        senderUserId: input.requesterUserId,
        body,
        messageType: 'TEXT',
      });
      if (!updatedThread) {
        throw new NotFoundException('Chat thread not found');
      }
      return toChatThreadResponse(updatedThread);
    }

    return toChatThreadResponse(thread);
  }

  private async assertParticipant(thread: { buyerUserId: string; sellerUserId: string }, requesterUserId: string) {
    if (thread.buyerUserId !== requesterUserId && thread.sellerUserId !== requesterUserId) {
      throw new ForbiddenException('Only chat participants can send messages');
    }
  }
}
