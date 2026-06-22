import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import { canAccessThread } from './get-chat-thread.use-case';
import { toChatThreadResponse } from '../chat.mapper';

@Injectable()
export class SendChatMessageUseCase {
  constructor(private readonly chatRepository: ChatRepository) {}

  async execute(input: {
    threadId: string;
    requesterUserId: string;
    requesterRole?: string | null;
    body: string;
    clientMessageId?: string | null;
  }) {
    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException('Message body is required');
    }

    const thread = await this.chatRepository.findChatThreadById(input.threadId);
    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }
    if (!canAccessThread(thread, input.requesterUserId, input.requesterRole)) {
      throw new ForbiddenException('Only chat participants can send messages');
    }

    const updatedThread = await this.chatRepository.createChatMessage({
      threadId: input.threadId,
      senderUserId: input.requesterUserId,
      clientMessageId: input.clientMessageId?.trim() || null,
      body,
      messageType: 'TEXT',
    });
    if (!updatedThread) {
      throw new NotFoundException('Chat thread not found');
    }

    return toChatThreadResponse(updatedThread);
  }
}
