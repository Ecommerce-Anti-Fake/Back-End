import { Test } from '@nestjs/testing';
import { MediaService } from '@media';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { UpdateShopProfileUseCase } from './update-shop-profile.use-case';

describe('UpdateShopProfileUseCase', () => {
  const shopsRepository = {
    findOwnedShop: jest.fn(),
    updateProfile: jest.fn(),
  };
  const mediaService = {
    uploadCloudinaryBuffer: jest.fn(),
    createCloudinaryAsset: jest.fn(),
    deleteCloudinaryAsset: jest.fn(),
  };
  let useCase: UpdateShopProfileUseCase;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UpdateShopProfileUseCase,
        { provide: ShopsRepository, useValue: shopsRepository },
        { provide: MediaService, useValue: mediaService },
      ],
    }).compile();
    useCase = module.get(UpdateShopProfileUseCase);
  });

  it('uploads and replaces optional shop avatar and banner', async () => {
    shopsRepository.findOwnedShop.mockResolvedValue({
      id: 'shop-1',
      avatarMedia: { publicId: 'old-avatar' },
      bannerMedia: { publicId: 'old-banner' },
    });
    mediaService.uploadCloudinaryBuffer
      .mockResolvedValueOnce({ publicId: 'new-avatar', secureUrl: 'https://cdn/avatar.jpg' })
      .mockResolvedValueOnce({ publicId: 'new-banner', secureUrl: 'https://cdn/banner.jpg' });
    mediaService.createCloudinaryAsset
      .mockResolvedValueOnce({ id: 'avatar-media' })
      .mockResolvedValueOnce({ id: 'banner-media' });
    shopsRepository.updateProfile.mockResolvedValue({
      id: 'shop-1', ownerUserId: 'user-1', shopName: 'Shop', registrationType: 'NORMAL',
      businessType: 'retail', taxCode: null, shopStatus: 'verified', createdAt: new Date(),
    });

    await useCase.execute({
      shopId: 'shop-1', requesterUserId: 'user-1',
      avatar: image('avatar.png'), banner: image('banner.png'),
    });

    expect(shopsRepository.updateProfile).toHaveBeenCalledWith('shop-1', {
      avatarMediaId: 'avatar-media', bannerMediaId: 'banner-media',
    });
    expect(mediaService.deleteCloudinaryAsset).toHaveBeenCalledWith({ publicId: 'old-avatar', assetType: 'IMAGE' });
    expect(mediaService.deleteCloudinaryAsset).toHaveBeenCalledWith({ publicId: 'old-banner', assetType: 'IMAGE' });
  });
});

function image(originalname: string) {
  return { buffer: Buffer.from('image'), mimetype: 'image/png', originalname, size: 5 };
}
