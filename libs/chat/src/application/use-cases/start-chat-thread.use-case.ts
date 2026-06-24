import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';

@Injectable()
export class StartChatThreadUseCase {
  constructor(private readonly chatRepository: ChatRepository) {}

  async execute(input: { requesterUserId: string; shopId: string }) {
    const shop = await this.chatRepository.findShopForChat(input.shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.ownerUserId === input.requesterUserId) {
      throw new BadRequestException('Seller cannot start a buyer chat with own shop');
    }

    const existing = await this.chatRepository.findChatThreadByShopAndBuyer(
      input.shopId,
      input.requesterUserId,
    );

    const thread =
      existing ??
      (await this.chatRepository.createChatThread({
        shopId: input.shopId,
        buyerUserId: input.requesterUserId,
        sellerUserId: shop.ownerUserId,
      }));

    return {
      success: true,
      threadId: thread.id,
    };
  }
}