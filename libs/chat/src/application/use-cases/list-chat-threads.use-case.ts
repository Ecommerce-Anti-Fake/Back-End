import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../../infrastructure/persistence/chat.repository';
import { toChatThreadListItemResponse } from '../chat.mapper';

@Injectable()
export class ListChatThreadsUseCase {
  constructor(private readonly chatRepository: ChatRepository) {}

  async execute(input: { requesterUserId: string; requesterRole?: string | null }) {
    const threads = await this.chatRepository.findChatThreadsForUser(input);

    return threads.map((thread) => toChatThreadListItemResponse(thread, input.requesterUserId));
  }
}
