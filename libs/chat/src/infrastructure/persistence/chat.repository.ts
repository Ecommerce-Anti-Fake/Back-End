import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findShopForChat(shopId: string) {
    return this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, shopName: true, ownerUserId: true },
    });
  }

  findChatThreadByShopAndBuyer(shopId: string, buyerUserId: string) {
    return this.prisma.chatThread.findFirst({ where: { shopId, buyerUserId }, include: this.chatThreadInclude() });
  }

  findChatThreadById(threadId: string) {
    return this.prisma.chatThread.findUnique({ where: { id: threadId }, include: this.chatThreadInclude() });
  }

  findChatThreadMetaById(threadId: string) {
  return this.prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      shop: {
        select: {
          shopName: true,
        },
      },
      buyer: {
        select: {
          displayName: true,
          email: true,
          phone: true,
        },
      },
      seller: {
        select: {
          displayName: true,
          email: true,
          phone: true,
          },
        },
      },
    });
  }

  async findChatMessagesPage(input: {
  threadId: string;
  before?: string | null;
  limit?: number | null;
  }) {
  const limit = Math.min(50, Math.max(1, input.limit ?? 50));
  const cursor = parseChatMessageCursor(input.before);

  const messagesDesc = await this.prisma.chatMessage.findMany({
    where: {
      threadId: input.threadId,
        ...(cursor
          ? {
              OR: [
                {
                  sentAt: {
                    lt: cursor.sentAt,
                  },
                },
                {
                  sentAt: cursor.sentAt,
                  id: {
                    lt: cursor.id,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [
        {
          sentAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: limit + 1,
      include: {
        attachments: true,
      },
    });

    const hasMoreBefore = messagesDesc.length > limit;
    const pageDesc = messagesDesc.slice(0, limit);

    // Quan trọng:
    // DB lấy newest trước, nhưng trả về frontend theo thứ tự cũ -> mới.
    const messagesAsc = [...pageDesc].reverse();

    const oldestMessage = messagesAsc[0] ?? null;

    return {
      messages: messagesAsc,
      pageInfo: {
        limit,
        hasMoreBefore,
        beforeCursor: oldestMessage ? buildChatMessageCursor(oldestMessage) : null,
      },
    };
  }

  findChatThreadsForUser(input: { requesterUserId: string; requesterRole?: string | null }) {
    return this.prisma.chatThread.findMany({
      where: input.requesterRole === 'admin'
        ? {}
        : { OR: [{ buyerUserId: input.requesterUserId }, { sellerUserId: input.requesterUserId }] },
      include: this.chatThreadInclude(1),
      orderBy: { createdAt: 'desc' },
    });
  }

  createChatThread(input: { shopId: string; buyerUserId: string; sellerUserId: string }) {
    return this.prisma.chatThread.create({ data: input, include: this.chatThreadInclude() });
  }

  async createChatMessage(input: {
    threadId: string;
    senderUserId: string;
    clientMessageId?: string | null;
    body: string | null;
    attachments?: Array<{
      type: 'IMAGE' | 'FILE';
      url: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }>;
    messageType: 'TEXT';
  }) {
    const existingMessage = input.clientMessageId
      ? await this.prisma.chatMessage.findFirst({
          where: { threadId: input.threadId, clientMessageId: input.clientMessageId },
        })
      : null;
    if (existingMessage) return this.findChatThreadById(input.threadId);

    const message = await this.prisma.chatMessage.create({
      data: {
        threadId: input.threadId,
        senderUserId: input.senderUserId,
        clientMessageId: input.clientMessageId,
        body: input.body,
        messageType: input.messageType,
        attachments: input.attachments?.length
          ? {
              create: input.attachments.map((attachment) => ({
                type: attachment.type,
                url: attachment.url,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
              })),
            }
          : undefined,
      },
      include: {
        attachments: true,
        sender: { select: { displayName: true, email: true, phone: true } },
        thread: { select: { buyerUserId: true, sellerUserId: true } },
      },
    });
    const recipientUserId = message.senderUserId === message.thread.buyerUserId
      ? message.thread.sellerUserId
      : message.thread.buyerUserId;
    await this.createNotification({
      userId: recipientUserId,
      notificationType: 'CHAT_MESSAGE',
      title: `Tin nhan moi tu ${message.sender.displayName || message.sender.email || message.sender.phone || 'nguoi dung'}`,
      body: notificationBody(message.body, message.attachments.length),
      targetType: 'CHAT_THREAD',
      targetId: input.threadId,
      dedupeKey: `CHAT_MESSAGE:${message.id}:${recipientUserId}`,
    });
    return this.findChatThreadById(input.threadId);
  }

  private createNotification(input: {
    userId: string;
    notificationType: string;
    title: string;
    body: string;
    targetType: string;
    targetId: string;
    dedupeKey: string;
  }) {
    return this.prisma.notification.upsert({ where: { dedupeKey: input.dedupeKey }, create: input, update: {} });
  }

  private chatThreadInclude(messageTake?: number): Prisma.ChatThreadInclude {
    const messageOrderBy: Prisma.ChatMessageOrderByWithRelationInput = {
      sentAt: messageTake === 1 ? 'desc' : 'asc',
    };
    return {
      shop: { select: { shopName: true } },
      buyer: { select: { displayName: true, email: true, phone: true } },
      seller: { select: { displayName: true, email: true, phone: true } },
      messages: {
        ...(messageTake ? { take: messageTake } : {}),
        orderBy: messageOrderBy,
        include: {
          attachments: true,
          sender: { select: { displayName: true, email: true, phone: true } },
        },
      },
    };
  }
}

function notificationBody(body: string | null, attachmentCount: number) {
  if (body) {
    return body.length > 120 ? `${body.slice(0, 117)}...` : body;
  }
  return attachmentCount > 1 ? `${attachmentCount} tep dinh kem` : 'Tep dinh kem';
}

function parseChatMessageCursor(cursor?: string | null) {
    if (!cursor) return null;

    const [sentAtRaw, id] = cursor.split('|');
    if (!sentAtRaw || !id) return null;

    const sentAt = new Date(sentAtRaw);
    if (Number.isNaN(sentAt.getTime())) return null;

    return {
      sentAt,
      id,
    };
  }

  function buildChatMessageCursor(message: { sentAt: Date; id: string }) {
    return `${message.sentAt.toISOString()}|${message.id}`;
  }
