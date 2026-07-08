import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';

@Injectable()
export class StartShopChatThreadUseCase {
  constructor(private readonly chatRepository: ChatRepository) {}

  async execute(input: { requesterUserId: string; requesterRole?: string | null; userId: string }) {
    if (input.userId === input.requesterUserId) {
      throw new BadRequestException('Shop owner cannot start a chat with themself');
    }

    if (input.requesterRole === 'admin') {
      const directParticipantKey = `${input.requesterUserId}:${input.userId}`;
      const existing = await this.chatRepository.findDirectChatThread(directParticipantKey);
      const thread = existing ?? await this.chatRepository.createChatThread({
        shopId: null,
        buyerUserId: input.userId,
        sellerUserId: input.requesterUserId,
        directParticipantKey,
      });

      return { success: true, threadId: thread.id };
    }

    const shop = await this.chatRepository.findShopByOwnerUserId(input.requesterUserId);
    if (!shop) {
      throw new NotFoundException('Shop not found for requester');
    }

    const existing = await this.chatRepository.findChatThreadByShopAndBuyer(
      shop.id,
      input.userId,
    );
    const thread = existing ?? await this.chatRepository.createChatThread({
      shopId: shop.id,
      buyerUserId: input.userId,
      sellerUserId: input.requesterUserId,
    });

    return { success: true, threadId: thread.id };
  }
}
