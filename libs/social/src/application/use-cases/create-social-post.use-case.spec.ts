import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSocialPostUseCase } from './create-social-post.use-case';

describe('CreateSocialPostUseCase in SocialModule', () => {
  const repository = {
    findShopForSocialPost: jest.fn(),
    findOfferForSocialPost: jest.fn(),
    countSocialPostsSince: jest.fn(),
    createSocialPost: jest.fn(),
  };
  const useCase = new CreateSocialPostUseCase(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.countSocialPostsSince.mockResolvedValue(0);
    repository.createSocialPost.mockResolvedValue(socialPost());
  });

  it('creates a normal question post within the 3 per 7 days quota', async () => {
    const result = await useCase.execute({
      requesterUserId: 'user-1',
      postType: 'QUESTION',
      body: ' Kiem tra QR nhu the nao? ',
    });

    expect(repository.countSocialPostsSince).toHaveBeenCalledWith(
      expect.objectContaining({
        authorUserId: 'user-1',
        authorShopId: null,
      }),
    );
    expect(repository.createSocialPost).toHaveBeenCalledWith({
      authorUserId: 'user-1',
      authorShopId: null,
      offerId: null,
      postType: 'QUESTION',
      body: 'Kiem tra QR nhu the nao?',
    });
    expect(result.postType).toBe('QUESTION');
  });

  it('enforces normal user post quota', async () => {
    repository.countSocialPostsSince.mockResolvedValue(3);

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        postType: 'SHARE',
        body: 'Trai nghiem mua hang',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows active shop owner to use the shop quota', async () => {
    repository.findShopForSocialPost.mockResolvedValue({
      id: 'shop-1',
      ownerUserId: 'user-1',
      shopStatus: 'verified',
      shopName: 'Shop A',
    });
    repository.countSocialPostsSince.mockResolvedValue(29);
    repository.createSocialPost.mockResolvedValue(
      socialPost({ authorShopId: 'shop-1' }),
    );

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      authorShopId: 'shop-1',
      postType: 'SHARE',
      body: 'Hang moi ve',
    });

    expect(repository.createSocialPost).toHaveBeenCalledWith(
      expect.objectContaining({
        authorShopId: 'shop-1',
      }),
    );
    expect(result.authorShopId).toBe('shop-1');
  });

  it('blocks posting as another user shop', async () => {
    repository.findShopForSocialPost.mockResolvedValue({
      id: 'shop-1',
      ownerUserId: 'other-user',
      shopStatus: 'verified',
      shopName: 'Shop A',
    });

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        authorShopId: 'shop-1',
        postType: 'SHARE',
        body: 'Hang moi ve',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires an active offer for product-share posts', async () => {
    repository.findOfferForSocialPost.mockResolvedValue({
      id: 'offer-1',
      offerStatus: 'inactive',
    });

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        postType: 'PRODUCT_SHARE',
        offerId: 'offer-1',
        body: 'San pham dang quan tam',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found for missing product-share offer', async () => {
    repository.findOfferForSocialPost.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        postType: 'PRODUCT_SHARE',
        offerId: 'missing',
        body: 'San pham dang quan tam',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function socialPost(input: { authorShopId?: string | null } = {}) {
  return {
    id: 'post-1',
    authorUserId: 'user-1',
    authorShopId: input.authorShopId ?? null,
    offerId: null,
    postType: 'QUESTION',
    body: 'Kiem tra QR nhu the nao?',
    visibility: 'PUBLIC',
    createdAt: new Date('2026-05-31T01:00:00.000Z'),
    author: { displayName: 'User A', email: null, phone: null },
    authorShop: input.authorShopId ? { shopName: 'Shop A' } : null,
    comments: [],
    reactions: [],
    _count: { comments: 0, reactions: 0, shares: 0 },
  };
}
