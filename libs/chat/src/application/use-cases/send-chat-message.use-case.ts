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
    body?: string | null;
    clientMessageId?: string | null;
    attachments?: Array<{
      type: 'IMAGE' | 'FILE';
      url: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }>;
  }) {
    const body = input.body?.trim() || null;
    const attachments = input.attachments ?? [];
    if (!isValidAttachmentBatch(attachments)) {
      throw new BadRequestException('Invalid attachment metadata');
    }
    if (!body && attachments.length === 0) {
      throw new BadRequestException('Message body or attachment is required');
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
      attachments,
      messageType: 'TEXT',
    });
    if (!updatedThread) {
      throw new NotFoundException('Chat thread not found');
    }

    return toChatThreadResponse(updatedThread);
  }
}

function isValidAttachmentBatch(
  attachments: Array<{
    type: 'IMAGE' | 'FILE';
    url: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>,
) {
  return attachments.length <= 10 && attachments.every((attachment) =>
    ['IMAGE', 'FILE'].includes(attachment.type) &&
    Boolean(attachment.url?.trim()) &&
    Boolean(attachment.fileName?.trim()) &&
    Boolean(attachment.mimeType?.trim()) &&
    Number.isInteger(attachment.sizeBytes) &&
    attachment.sizeBytes > 0 &&
    attachment.sizeBytes <= 50 * 1024 * 1024,
  );
}
