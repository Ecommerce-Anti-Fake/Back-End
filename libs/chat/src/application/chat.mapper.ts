type ChatUserRecord = {
  displayName: string | null;
  email: string | null;
  phone: string | null;
  avatarMedia?: { secureUrl: string } | null;
};

type ChatMessageWithSender = {
  id: string;
  threadId: string;
  senderUserId: string;
  clientMessageId?: string | null;
  messageType: string;
  body: string | null;
  sentAt: Date;
  sender?: ChatUserRecord;
  attachments?: ChatMessageAttachmentRecord[];
};

type ChatMessageAttachmentRecord = {
  id: string;
  type: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type ChatThreadWithRelations = {
  id: string;
  shopId: string | null;
  buyerUserId: string;
  sellerUserId: string;
  createdAt: Date;
  shop: { shopName: string; avatarMedia?: { secureUrl: string } | null } | null;
  buyer: ChatUserRecord;
  seller: ChatUserRecord;
  messages?: ChatMessageWithSender[];
};

export function toChatMessageResponse(message: ChatMessageWithSender) {
  return {
    id: message.id,
    threadId: message.threadId,
    senderUserId: message.senderUserId,
    clientMessageId: message.clientMessageId ?? null,
    senderName: message.sender ? chatDisplayName(message.sender) : null,
    messageType: message.messageType,
    body: message.body ?? null,
    attachments: (message.attachments ?? []).map(toChatMessageAttachmentResponse),
    sentAt: message.sentAt,
  };
}

export function toChatThreadResponse(thread: ChatThreadWithRelations) {
  const messages = (thread.messages ?? []).map(toChatMessageResponse);

  return {
    id: thread.id,
    shopId: thread.shopId,
    shopName: thread.shop?.shopName ?? null,
    buyerUserId: thread.buyerUserId,
    buyerName: chatDisplayName(thread.buyer),
    sellerUserId: thread.sellerUserId,
    sellerName: chatDisplayName(thread.seller),
    lastMessage: messages.at(-1) ?? null,
    messages,
    createdAt: thread.createdAt,
  };
}

export function toChatThreadDetailResponse(
  thread: Omit<ChatThreadWithRelations, 'messages'>,
  messagesPage: {
    messages: ChatMessageWithSender[];
    pageInfo: {
      limit: number;
      hasMoreBefore: boolean;
      beforeCursor: string | null;
    };
  },
  requesterUserId: string,
) {
  const counterpart = chatCounterpart(thread, requesterUserId);

  return {
    id: thread.id,
    chatUserID: counterpart.id,
    chatUserName: counterpart.name,
    chatUserAvatar: counterpart.avatar,
    messages: messagesPage.messages.map((message) => ({
      id: message.id,
      senderUserId: message.senderUserId,
      clientMessageId: message.clientMessageId ?? null,
      messageType: message.messageType,
      body: message.body ?? null,
      attachments: (message.attachments ?? []).map(toChatMessageAttachmentResponse),
      sentAt: message.sentAt,
    })),
    pageInfo: messagesPage.pageInfo,
    createdAt: thread.createdAt,
  };
}

export function toChatThreadListItemResponse(thread: ChatThreadWithRelations, requesterUserId: string) {
  const lastMessage = (thread.messages ?? [])[0];
  const counterpart = chatCounterpart(thread, requesterUserId);
  return {
    id: thread.id,
    chatUserID: counterpart.id,
    chatUserName: counterpart.name,
    chatUserAvatar: counterpart.avatar,
    lastMessage: lastMessage
      ? [{
          id: lastMessage.id,
          clientMessageId: lastMessage.clientMessageId ?? null,
          messageType: lastMessage.messageType,
          body: lastMessage.body ?? null,
          attachments: (lastMessage.attachments ?? []).map(toChatMessageAttachmentResponse),
          sentAt: lastMessage.sentAt,
        }]
      : [],
    createdAt: thread.createdAt,
  };
}

function chatCounterpart(thread: ChatThreadWithRelations, requesterUserId: string) {
  if (thread.buyerUserId !== requesterUserId) {
    return {
      id: thread.buyerUserId,
      name: chatDisplayName(thread.buyer),
      avatar: thread.buyer.avatarMedia?.secureUrl ?? null,
    };
  }

  if (thread.shop) {
    return {
      id: thread.shopId as string,
      name: thread.shop.shopName,
      avatar: thread.shop.avatarMedia?.secureUrl ?? null,
    };
  }

  return {
    id: thread.sellerUserId,
    name: chatDisplayName(thread.seller),
    avatar: thread.seller.avatarMedia?.secureUrl ?? null,
  };
}

function chatDisplayName(user: ChatUserRecord) {
  return user.displayName || user.email || user.phone || 'Nguoi dung';
}

function toChatMessageAttachmentResponse(attachment: ChatMessageAttachmentRecord) {
  return {
    id: attachment.id,
    type: attachment.type,
    url: attachment.url,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
  };
}
