import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toChatThreadResponse } from './products.mapper';

@Injectable()
export class GetChatThreadUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { threadId: string; requesterUserId: string; requesterRole?: string | null }) {
    const thread = await this.productRepository.findChatThreadById(input.threadId);
    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }
    if (!canAccessThread(thread, input.requesterUserId, input.requesterRole)) {
      throw new ForbiddenException('Only chat participants can view this thread');
    }

    return toChatThreadResponse(thread);
  }
}

export function canAccessThread(
  thread: { buyerUserId: string; sellerUserId: string },
  requesterUserId: string,
  requesterRole?: string | null,
) {
  return requesterRole === 'admin' || thread.buyerUserId === requesterUserId || thread.sellerUserId === requesterUserId;
}
