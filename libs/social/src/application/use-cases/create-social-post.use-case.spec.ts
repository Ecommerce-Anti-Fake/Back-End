import { BadRequestException } from '@nestjs/common';
import { CreateSocialPostUseCase } from './create-social-post.use-case';

describe('CreateSocialPostUseCase in SocialModule', () => {
  const repository = {
    countSocialPostsSince: jest.fn(),
    createSocialPost: jest.fn(),
  };
  const mediaService = {
    uploadCloudinaryBuffer: jest.fn(),
    deleteCloudinaryAsset: jest.fn(),
  };
  const useCase = new CreateSocialPostUseCase(repository as never, mediaService as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.countSocialPostsSince.mockResolvedValue(0);
    repository.createSocialPost.mockResolvedValue(socialPost());
    mediaService.uploadCloudinaryBuffer.mockResolvedValue({
      publicId: 'social/posts/user-1-1',
      secureUrl: 'https://cdn.example.com/social-post.jpg',
    });
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
      media: [],
    });
    expect(result.postType).toBe('QUESTION');
  });

  it('uploads media and passes persisted metadata to the repository', async () => {
    await useCase.execute({
      requesterUserId: 'user-1',
      postType: 'SHARE',
      body: 'Anh that te',
      media: [
        {
          buffer: Buffer.from('image-bytes'),
          mimetype: 'image/png',
          originalname: 'photo.png',
          size: 11,
        },
      ],
    });

    expect(mediaService.uploadCloudinaryBuffer).toHaveBeenCalledWith({
      buffer: Buffer.from('image-bytes'),
      folder: 'social/posts',
      requesterUserId: 'user-1',
      assetType: 'IMAGE',
      mimeType: 'image/png',
      sequence: 1,
    });
    expect(repository.createSocialPost).toHaveBeenCalledWith(
      expect.objectContaining({
        media: [
          {
            assetType: 'IMAGE',
            publicId: 'social/posts/user-1-1',
            secureUrl: 'https://cdn.example.com/social-post.jpg',
            mimeType: 'image/png',
            folder: 'social/posts',
            sortOrder: 0,
          },
        ],
      }),
    );
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

  it('rejects unsupported media file types', async () => {
    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        postType: 'SHARE',
        body: 'File dinh kem',
        media: [
          {
            buffer: Buffer.from('pdf-bytes'),
            mimetype: 'application/pdf',
            originalname: 'file.pdf',
            size: 9,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects more than five media files', async () => {
    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        postType: 'SHARE',
        body: 'Qua nhieu anh',
        media: Array.from({ length: 6 }, (_, index) => ({
          buffer: Buffer.from(`image-${index}`),
          mimetype: 'image/png',
          originalname: `photo-${index}.png`,
          size: 7,
        })),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
    media: [],
    comments: [],
    reactions: [],
    _count: { comments: 0, reactions: 0, shares: 0 },
  };
}
