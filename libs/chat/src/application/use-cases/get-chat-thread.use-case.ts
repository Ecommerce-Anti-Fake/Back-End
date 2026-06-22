import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import { toChatThreadResponse } from '../chat.mapper';

@Injectable()
export class GetChatThreadUseCase {
  constructor(private readonly chatRepository: ChatRepository) {}

  async execute(input: { threadId: string; requesterUserId: string; requesterRole?: string | null }) {
    const thread = await this.chatRepository.findChatThreadById(input.threadId);
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
