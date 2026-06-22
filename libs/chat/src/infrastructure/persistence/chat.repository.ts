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
    body: string;
    messageType: 'TEXT';
  }) {
    const existingMessage = input.clientMessageId
      ? await this.prisma.chatMessage.findFirst({
          where: { threadId: input.threadId, clientMessageId: input.clientMessageId },
        })
      : null;
    if (existingMessage) return this.findChatThreadById(input.threadId);

    const message = await this.prisma.chatMessage.create({
      data: input,
      include: {
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
      body: message.body.length > 120 ? `${message.body.slice(0, 117)}...` : message.body,
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
        include: { sender: { select: { displayName: true, email: true, phone: true } } },
      },
    };
  }
}

