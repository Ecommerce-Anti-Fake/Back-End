import { NotFoundException } from '@nestjs/common';
import { GetSocialPostUseCase } from './get-social-post.use-case';

describe('GetSocialPostUseCase', () => {
  const repository = {
    findSocialPostById: jest.fn(),
  };
  const useCase = new GetSocialPostUseCase(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findSocialPostById.mockResolvedValue(socialPost());
  });

  it('returns a compact public post detail by id', async () => {
    const result = await useCase.execute({
      postId: 'post-1',
      requesterUserId: 'viewer-1',
    });

    expect(repository.findSocialPostById).toHaveBeenCalledWith(
      'post-1',
      'viewer-1',
    );
    expect(result).toEqual({
      id: 'post-1',
      author: {
        id: 'user-1',
        name: 'Cong ty An Phat',
        avatar: 'https://cdn.example.com/shop.jpg',
        shopName: 'Masan Consumer Store',
      },
      postType: 'PRODUCT_SHARE',
      body: 'Kham pha san pham chinh hang',
      media: [
        {
          id: 'post-media-1',
          assetType: 'IMAGE',
          url: 'https://cdn.example.com/social-post.jpg',
          mimeType: 'image/jpeg',
          sortOrder: 0,
        },
      ],
      createdAt: new Date('2026-06-23T04:08:46.691Z'),
      stats: {
        reactions: 1,
        comments: 5,
        shares: 1,
      },
      viewer: {
        liked: true,
      },
    });
  });

  it('hides hidden posts from non-authors', async () => {
    repository.findSocialPostById.mockResolvedValue(
      socialPost({ visibility: 'HIDDEN' }),
    );

    await expect(
      useCase.execute({
        postId: 'post-1',
        requesterUserId: 'viewer-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function socialPost(input: { visibility?: string } = {}) {
  return {
    id: 'post-1',
    authorUserId: 'user-1',
    authorShopId: 'shop-1',
    offerId: 'offer-1',
    postType: 'PRODUCT_SHARE',
    body: 'Kham pha san pham chinh hang',
    visibility: input.visibility ?? 'PUBLIC',
    createdAt: new Date('2026-06-23T04:08:46.691Z'),
    author: {
      id: 'user-1',
      displayName: 'Cong ty An Phat',
      email: null,
      phone: null,
      avatarMedia: { secureUrl: 'https://cdn.example.com/user.jpg' },
    },
    authorShop: {
      shopName: 'Masan Consumer Store',
      avatarMedia: { secureUrl: 'https://cdn.example.com/shop.jpg' },
    },
    offer: {
      media: [
        {
          fileUrl: 'https://fallback.example.com/offer.jpg',
          mediaAsset: { secureUrl: 'https://cdn.example.com/offer.jpg' },
        },
      ],
    },
    media: [
      {
        id: 'post-media-1',
        sortOrder: 0,
        mediaAsset: {
          assetType: 'IMAGE',
          secureUrl: 'https://cdn.example.com/social-post.jpg',
          mimeType: 'image/jpeg',
        },
      },
    ],
    comments: [],
    reactions: [{ userId: 'viewer-1', reactionType: 'LIKE' }],
    _count: { comments: 5, reactions: 1, shares: 1 },
  };
}
