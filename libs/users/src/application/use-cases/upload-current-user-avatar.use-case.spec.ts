import { BadRequestException } from '@nestjs/common';
import { MediaService } from '@media';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { UploadCurrentUserAvatarUseCase } from './upload-current-user-avatar.use-case';

describe('UploadCurrentUserAvatarUseCase', () => {
  let useCase: UploadCurrentUserAvatarUseCase;

  const usersRepositoryMock = {
    findById: jest.fn(),
    replaceUserAvatar: jest.fn(),
  };
  const mediaServiceMock = {
    uploadCloudinaryBuffer: jest.fn(),
    createCloudinaryAsset: jest.fn(),
    deleteCloudinaryAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadCurrentUserAvatarUseCase,
        { provide: UsersRepository, useValue: usersRepositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<UploadCurrentUserAvatarUseCase>(UploadCurrentUserAvatarUseCase);
    usersRepositoryMock.findById.mockResolvedValue(createUser());
    usersRepositoryMock.replaceUserAvatar.mockResolvedValue({
      user: createUser({ avatarMediaId: 'media-new' }),
      previousAvatar: { id: 'media-old', publicId: 'users/avatars/old-avatar' },
    });
    mediaServiceMock.uploadCloudinaryBuffer.mockResolvedValue({
      publicId: 'users/avatars/user-1-1',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/users/avatars/user-1-1.jpg',
    });
    mediaServiceMock.createCloudinaryAsset.mockResolvedValue({ id: 'media-new' });
  });

  it('uploads one avatar image and deletes the old Cloudinary image', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      avatar: {
        buffer: Buffer.from('image-bytes'),
        mimetype: 'image/png',
        originalname: 'avatar.png',
        size: 11,
      },
    });

    expect(mediaServiceMock.uploadCloudinaryBuffer).toHaveBeenCalledWith({
      buffer: Buffer.from('image-bytes'),
      folder: 'users/avatars',
      requesterUserId: 'user-1',
      assetType: 'IMAGE',
      mimeType: 'image/png',
    });
    expect(mediaServiceMock.createCloudinaryAsset).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      assetType: 'IMAGE',
      resourceType: 'USER_AVATAR',
      publicId: 'users/avatars/user-1-1',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/users/avatars/user-1-1.jpg',
      mimeType: 'image/png',
      folder: 'users/avatars',
    });
    expect(usersRepositoryMock.replaceUserAvatar).toHaveBeenCalledWith('user-1', 'media-new');
    expect(mediaServiceMock.deleteCloudinaryAsset).toHaveBeenCalledWith({
      publicId: 'users/avatars/old-avatar',
      assetType: 'IMAGE',
    });
    expect(result).toEqual({
      success: true,
      message: 'Tải ảnh đại diện thành công.',
      mediaAssetId: 'media-new',
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/v1/users/avatars/user-1-1.jpg',
    });
  });

  it('rejects unsupported avatar file types', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        avatar: {
          buffer: Buffer.from('pdf-bytes'),
          mimetype: 'application/pdf',
          originalname: 'avatar.pdf',
          size: 9,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mediaServiceMock.uploadCloudinaryBuffer).not.toHaveBeenCalled();
  });

  it('deletes the newly uploaded Cloudinary image when persistence fails', async () => {
    usersRepositoryMock.replaceUserAvatar.mockRejectedValueOnce(new Error('db failed'));

    await expect(
      useCase.execute({
        userId: 'user-1',
        avatar: {
          buffer: Buffer.from('image-bytes'),
          mimetype: 'image/png',
          originalname: 'avatar.png',
          size: 11,
        },
      }),
    ).rejects.toThrow('db failed');

    expect(mediaServiceMock.deleteCloudinaryAsset).toHaveBeenCalledWith({
      publicId: 'users/avatars/user-1-1',
      assetType: 'IMAGE',
    });
  });
});

function createUser(overrides?: { avatarMediaId?: string | null }) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    phone: null,
    displayName: 'User',
    password: null,
    role: 'user',
    accountStatus: 'active',
    avatarMediaId: overrides?.avatarMediaId ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
