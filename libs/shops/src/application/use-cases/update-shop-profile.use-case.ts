import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { MediaService } from '@media';
import { toShopResponse } from './shops.mapper';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
type ImageFile = { buffer: Buffer | { data?: number[] }; mimetype: string; originalname?: string; size: number };

@Injectable()
export class UpdateShopProfileUseCase {
  constructor(
    private readonly shopsRepository: ShopsRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    shopId: string;
    requesterUserId: string;
    shopName?: string;
    businessType?: string;
    phone?: string | null;
    taxCode?: string | null;
    warehouseAddress?: string | null;
    warehouseProvinceCode?: string | null;
    warehouseProvinceName?: string | null;
    warehouseWardCode?: string | null;
    warehouseWardName?: string | null;
    avatar?: ImageFile;
    banner?: ImageFile;
  }) {
    const ownedShop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!ownedShop) {
      throw new ForbiddenException('Shop does not belong to current user');
    }

    const data: {
      shopName?: string;
      businessType?: string;
      phone?: string | null;
      taxCode?: string | null;
      warehouseAddress?: string | null;
      warehouseProvinceCode?: string | null;
      warehouseProvinceName?: string | null;
      warehouseWardCode?: string | null;
      warehouseWardName?: string | null;
      avatarMediaId?: string;
      bannerMediaId?: string;
    } = {};

    if (input.shopName !== undefined) {
      const shopName = input.shopName.trim();
      if (!shopName) {
        throw new BadRequestException('Shop name is required');
      }
      data.shopName = shopName;
    }

    if (input.businessType !== undefined) {
      const businessType = input.businessType.trim();
      if (!businessType) {
        throw new BadRequestException('Business type is required');
      }
      data.businessType = businessType;
    }

    if (input.phone !== undefined) {
      data.phone = input.phone?.trim() || null;
    }

    if (input.taxCode !== undefined) {
      data.taxCode = input.taxCode?.trim() || null;
    }

    if (input.warehouseAddress !== undefined) {
      data.warehouseAddress = input.warehouseAddress?.trim() || null;
    }

    if (input.warehouseProvinceCode !== undefined) {
      data.warehouseProvinceCode = input.warehouseProvinceCode?.trim() || null;
    }

    if (input.warehouseProvinceName !== undefined) {
      data.warehouseProvinceName = input.warehouseProvinceName?.trim() || null;
    }

    if (input.warehouseWardCode !== undefined) {
      data.warehouseWardCode = input.warehouseWardCode?.trim() || null;
    }

    if (input.warehouseWardName !== undefined) {
      data.warehouseWardName = input.warehouseWardName?.trim() || null;
    }

    if (!Object.keys(data).length && !input.avatar && !input.banner) {
      throw new BadRequestException('No shop profile fields to update');
    }

    const uploaded: Array<{ publicId: string; oldPublicId?: string | null }> = [];
    let shop;
    try {
      if (input.avatar) {
        const asset = await this.uploadImage(input.avatar, input.requesterUserId, 'avatar');
        data.avatarMediaId = asset.id;
        uploaded.push({ publicId: asset.publicId, oldPublicId: ownedShop.avatarMedia?.publicId });
      }
      if (input.banner) {
        const asset = await this.uploadImage(input.banner, input.requesterUserId, 'banner');
        data.bannerMediaId = asset.id;
        uploaded.push({ publicId: asset.publicId, oldPublicId: ownedShop.bannerMedia?.publicId });
      }

      shop = await this.shopsRepository.updateProfile(input.shopId, data);
    } catch (error) {
      for (const item of uploaded) {
        await this.mediaService.deleteCloudinaryAsset({ publicId: item.publicId, assetType: 'IMAGE' });
      }
      throw error;
    }

    for (const item of uploaded) {
      if (item.oldPublicId) {
        await this.mediaService.deleteCloudinaryAsset({ publicId: item.oldPublicId, assetType: 'IMAGE' });
      }
    }
    return toShopResponse(shop);
  }

  private async uploadImage(file: ImageFile, ownerUserId: string, kind: 'avatar' | 'banner') {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) throw new BadRequestException(`${kind} must be an image`);
    const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer?.data ?? []);
    if (!buffer.length || file.size <= 0) throw new BadRequestException(`${kind} image is empty`);
    if (file.size > MAX_IMAGE_BYTES || buffer.length > MAX_IMAGE_BYTES) throw new BadRequestException(`${kind} image is too large`);
    const folder = `shops/${kind}s`;
    const upload = await this.mediaService.uploadCloudinaryBuffer({
      buffer, folder, requesterUserId: ownerUserId, assetType: 'IMAGE', mimeType: file.mimetype,
    });
    try {
      const asset = await this.mediaService.createCloudinaryAsset({
        ownerUserId, assetType: 'IMAGE', resourceType: kind === 'avatar' ? 'SHOP_AVATAR' : 'SHOP_BANNER',
        publicId: upload.publicId, secureUrl: upload.secureUrl, mimeType: file.mimetype, folder,
      });
      return { id: asset.id, publicId: upload.publicId };
    } catch (error) {
      await this.mediaService.deleteCloudinaryAsset({ publicId: upload.publicId, assetType: 'IMAGE' });
      throw error;
    }
  }
}
