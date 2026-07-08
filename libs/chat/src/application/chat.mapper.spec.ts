import {
  toChatThreadDetailResponse,
  toChatThreadListItemResponse,
} from './chat.mapper';

describe('chat thread mapper', () => {
  const thread = {
    id: 'thread-1',
    shopId: 'shop-1',
    buyerUserId: 'buyer-1',
    sellerUserId: 'seller-1',
    createdAt: new Date('2026-07-06T00:00:00.000Z'),
    shop: {
      shopName: 'Shop A',
      avatarMedia: { secureUrl: 'https://cdn.test/shop.jpg' },
    },
    buyer: {
      displayName: 'Buyer A',
      email: null,
      phone: null,
      avatarMedia: { secureUrl: 'https://cdn.test/buyer.jpg' },
    },
    seller: {
      displayName: 'Seller A',
      email: null,
      phone: null,
      avatarMedia: null,
    },
  };

  it('maps the shop avatar for a buyer thread list item', () => {
    expect(toChatThreadListItemResponse(thread, 'buyer-1')).toMatchObject({
      chatUserID: 'shop-1',
      chatUserAvatar: 'https://cdn.test/shop.jpg',
    });
  });

  it('maps the buyer avatar for a seller thread detail', () => {
    expect(toChatThreadDetailResponse(thread, emptyMessagesPage, 'seller-1')).toMatchObject({
      chatUserID: 'buyer-1',
      chatUserAvatar: 'https://cdn.test/buyer.jpg',
    });
  });

  it('maps the other user for a direct admin-user thread', () => {
    const directThread = {
      ...thread,
      shopId: null,
      shop: null,
      sellerUserId: 'admin-1',
      seller: { displayName: 'Admin A', email: null, phone: null, avatarMedia: null },
    };

    expect(toChatThreadListItemResponse(directThread, 'admin-1')).toMatchObject({
      chatUserID: 'buyer-1',
      chatUserName: 'Buyer A',
      chatUserAvatar: 'https://cdn.test/buyer.jpg',
    });
    expect(toChatThreadListItemResponse(directThread, 'buyer-1')).toMatchObject({
      chatUserID: 'admin-1',
      chatUserName: 'Admin A',
      chatUserAvatar: null,
    });
  });
});

const emptyMessagesPage = {
  messages: [],
  pageInfo: {
    limit: 50,
    hasMoreBefore: false,
    beforeCursor: null,
  },
};
