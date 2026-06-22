type ChatUserRecord = {
  displayName: string | null;
  email: string | null;
  phone: string | null;
};

type ChatMessageWithSender = {
  id: string;
  threadId: string;
  senderUserId: string;
  clientMessageId?: string | null;
  messageType: string;
  body: string;
  sentAt: Date;
  sender?: ChatUserRecord;
};

type ChatThreadWithRelations = {
  id: string;
  shopId: string;
  buyerUserId: string;
  sellerUserId: string;
  createdAt: Date;
  shop: { shopName: string };
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
    body: message.body,
    sentAt: message.sentAt,
  };
}

export function toChatThreadResponse(thread: ChatThreadWithRelations) {
  const messages = (thread.messages ?? []).map(toChatMessageResponse);

  return {
    id: thread.id,
    shopId: thread.shopId,
    shopName: thread.shop.shopName,
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
  const isBuyer = thread.buyerUserId === requesterUserId;

  return {
    id: thread.id,
    chatUserID: isBuyer ? thread.shopId : thread.buyerUserId,
    chatUserName: isBuyer ? thread.shop.shopName : chatDisplayName(thread.buyer),
    messages: messagesPage.messages.map((message) => ({
      id: message.id,
      senderUserId: message.senderUserId,
      clientMessageId: message.clientMessageId ?? null,
      messageType: message.messageType,
      body: message.body,
      sentAt: message.sentAt,
    })),
    pageInfo: messagesPage.pageInfo,
    createdAt: thread.createdAt,
  };
}

export function toChatThreadListItemResponse(thread: ChatThreadWithRelations, requesterUserId: string) {
  const lastMessage = (thread.messages ?? [])[0];
  const isBuyer = thread.buyerUserId === requesterUserId;
  return {
    id: thread.id,
    chatUserID: isBuyer ? thread.shopId : thread.buyerUserId,
    chatUserName: isBuyer ? thread.shop.shopName : chatDisplayName(thread.buyer),
    lastMessage: lastMessage
      ? [{
          id: lastMessage.id,
          clientMessageId: lastMessage.clientMessageId ?? null,
          messageType: lastMessage.messageType,
          body: lastMessage.body,
          sentAt: lastMessage.sentAt,
        }]
      : [],
    createdAt: thread.createdAt,
  };
}

function chatDisplayName(user: ChatUserRecord) {
  return user.displayName || user.email || user.phone || 'Nguoi dung';
}

