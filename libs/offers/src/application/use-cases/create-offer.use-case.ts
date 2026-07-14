import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaService } from '@media';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferResponse } from './offers.mapper';

const MAX_PRODUCT_IMAGES = 10;
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const PRODUCT_MEDIA_FOLDER = 'offers/media';
const OPTION_VALUE_MEDIA_FOLDER = 'offers/options';
const PRODUCT_IMAGE_DATA_URL =
  /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

@Injectable()
export class CreateOfferUseCase {
  constructor(
    private readonly productRepository: OffersRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    sellerUserId: string;
    shopId?: string | null;
    categoryId: string;
    brandName?: string | null;
    brandId?: string | null;
    modelName?: string | null;
    gtin?: string | null;
    distributionNodeId?: string | null;
    title: string;
    description: string;
    price?: number;
    currency?: string;
    itemCondition?: string;
    availableQuantity?: number;
    offerStatus?: 'active' | 'inactive' | 'draft';
    parcelWeightGrams?: number | null;
    parcelLengthCm?: number | null;
    parcelWidthCm?: number | null;
    parcelHeightCm?: number | null;
    productImages?: string[];
    optionGroups?: Array<{
      displayName: string;
      values: Array<{
        text: string;
        image?: string | null;
      }>;
    }>;
  }) {
    const productImages = this.validateProductImages(input.productImages ?? []);
    const optionGroups = this.validateOptionGroups(input.optionGroups ?? []);
    const requestedShopId = input.shopId?.trim();
    const ownedShop = requestedShopId
      ? await this.productRepository.findOwnedShop(
          requestedShopId,
          input.sellerUserId,
        )
      : await this.productRepository.findShopByOwnerUserId(input.sellerUserId);
    if (!ownedShop) {
      throw new BadRequestException('Shop does not belong to current user');
    }

    if (ownedShop.shopStatus !== 'verified') {
      throw new BadRequestException(
        'Shop must complete KYC approval before creating offers',
      );
    }

    const title = input.title.trim();
    const description = input.description.trim();

    if (!title || !description) {
      throw new BadRequestException('Title and description are required');
    }

    const category = await this.productRepository.findCategoryById(
      input.categoryId,
    );
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const approvedCategoryRegistration =
      await this.productRepository.findApprovedShopCategoryRegistration(
        ownedShop.id,
        input.categoryId,
      );
    if (!approvedCategoryRegistration) {
      throw new BadRequestException(
        'Shop category must be approved before creating offers in this category',
      );
    }

    const productIdentity = await this.resolveProductIdentity(input, title);

    const distributionNodeId = input.distributionNodeId?.trim() || null;
    if (distributionNodeId) {
      const distributionNode =
        await this.productRepository.findOwnedDistributionNode(
          distributionNodeId,
          ownedShop.id,
          input.sellerUserId,
        );

      if (!distributionNode) {
        throw new BadRequestException(
          'Distribution node is invalid for the selected shop',
        );
      }

      if (distributionNode.relationshipStatus !== 'ACTIVE') {
        throw new BadRequestException(
          'Distribution node must be active before creating offers',
        );
      }
    }

    const currency = input.currency?.trim().toUpperCase() || 'VND';
    const itemCondition = input.itemCondition?.trim() || 'new';
    const offerStatus = input.offerStatus === 'draft' ? 'draft' : 'active';

    const price = input.price ?? 0;
    const availableQuantity = input.availableQuantity ?? 0;
    if (optionGroups.length === 0 && price <= 0) {
      throw new BadRequestException('Price must be greater than 0');
    }
    if (
      !Number.isInteger(availableQuantity) ||
      (optionGroups.length === 0
        ? availableQuantity < 1
        : availableQuantity < 0)
    ) {
      throw new BadRequestException(
        optionGroups.length === 0
          ? 'Available quantity must be at least 1'
          : 'Available quantity must be at least 0',
      );
    }

    if (!['active', 'inactive', 'draft'].includes(offerStatus)) {
      throw new BadRequestException(
        'Offer status must be active, inactive, or draft',
      );
    }

    const offerData = {
      sellerUserId: input.sellerUserId,
      shopId: ownedShop.id,
      categoryId: input.categoryId,
      brandId: productIdentity.brandId,
      modelName: productIdentity.modelName,
      gtin: productIdentity.gtin,
      verificationPolicy: productIdentity.verificationPolicy,
      distributionNodeId,
      title,
      description,
      price,
      currency,
      itemCondition,
      availableQuantity,
      offerStatus,
      ...this.resolveParcelSnapshot(input),
    };
    const persistedProductImages = await this.persistProductImages(
      productImages,
      input.sellerUserId,
    );
    const persistedOptionGroups = await this.persistOptionValueImages(
      optionGroups,
      input.sellerUserId,
    );

    if (persistedOptionGroups.length > 0) {
      const offer = await this.productRepository.createOfferWithSalesOptions({
        offer: offerData,
        productImages: persistedProductImages,
        optionGroups: persistedOptionGroups,
      });
      return toOfferResponse(offer);
    }

    const offer = await this.productRepository.createOffer(offerData);

    for (const [index, image] of persistedProductImages.entries()) {
      await this.productRepository.createOfferMedia({
        offerId: offer.id,
        mediaAssetId: image.mediaAssetId,
        mediaType: index === 0 ? 'thumbnail' : 'gallery',
        fileUrl: image.fileUrl,
        phash: null,
      });
    }

    return toOfferResponse(offer);
  }

  private async persistOptionValueImages(
    groups: Array<{
      displayName: string;
      values: Array<{
        text: string;
        image?: string | null;
      }>;
    }>,
    ownerUserId: string,
  ) {
    return Promise.all(
      groups.map(async (group) => ({
        displayName: group.displayName,
        values: await Promise.all(
          group.values.map(async (value, index) => {
            if (!value.image) {
              return {
                text: value.text,
                mediaAssetId: null,
                sortOrder: index,
              };
            }
            const dataUrl = PRODUCT_IMAGE_DATA_URL.exec(value.image);
            if (!dataUrl) {
              throw new BadRequestException(
                'Option value image Data URL is invalid',
              );
            }
            const buffer = Buffer.from(dataUrl[2], 'base64');
            if (!buffer.length) {
              throw new BadRequestException('Option value image is empty');
            }
            if (buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
              throw new BadRequestException(
                'Option value image must not exceed 5 MB',
              );
            }
            const uploaded = await this.mediaService.uploadCloudinaryBuffer({
              buffer,
              folder: OPTION_VALUE_MEDIA_FOLDER,
              requesterUserId: ownerUserId,
              assetType: 'IMAGE',
              mimeType: dataUrl[1],
              sequence: index + 1,
            });
            const asset = await this.mediaService.createCloudinaryAsset({
              ownerUserId,
              assetType: 'IMAGE',
              resourceType: 'PRODUCT_IMAGE',
              publicId: uploaded.publicId,
              secureUrl: uploaded.secureUrl,
              mimeType: dataUrl[1],
              folder: OPTION_VALUE_MEDIA_FOLDER,
            });
            return {
              text: value.text,
              mediaAssetId: asset.id,
              sortOrder: index,
            };
          }),
        ),
      })),
    );
  }

  private async persistProductImages(imageUrls: string[], ownerUserId: string) {
    const images = imageUrls.map((fileUrl) => {
      const dataUrl = PRODUCT_IMAGE_DATA_URL.exec(fileUrl);
      if (!dataUrl) {
        throw new BadRequestException('Product image Data URL is invalid');
      }

      const buffer = Buffer.from(dataUrl[2], 'base64');
      if (!buffer.length) {
        throw new BadRequestException('Product image is empty');
      }
      if (buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
        throw new BadRequestException('Product image must not exceed 5 MB');
      }

      return {
        fileUrl,
        data: { mimeType: dataUrl[1], buffer },
      };
    });

    return Promise.all(
      images.map(async (image, index) => {
        if (!image.data) {
          return { fileUrl: image.fileUrl, mediaAssetId: null };
        }

        const uploaded = await this.mediaService.uploadCloudinaryBuffer({
          buffer: image.data.buffer,
          folder: PRODUCT_MEDIA_FOLDER,
          requesterUserId: ownerUserId,
          assetType: 'IMAGE',
          mimeType: image.data.mimeType,
          sequence: index + 1,
        });
        const mediaAsset = await this.mediaService.createCloudinaryAsset({
          ownerUserId,
          assetType: 'IMAGE',
          resourceType: 'PRODUCT_IMAGE',
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          mimeType: image.data.mimeType,
          folder: PRODUCT_MEDIA_FOLDER,
        });

        return {
          fileUrl: uploaded.secureUrl,
          mediaAssetId: mediaAsset.id,
        };
      }),
    );
  }

  private async resolveProductIdentity(
    input: {
      categoryId: string;
      brandName?: string | null;
      brandId?: string | null;
      modelName?: string | null;
      gtin?: string | null;
    },
    title: string,
  ) {
    const brandId = input.brandId?.trim();
    if (brandId) {
      const brand = await this.productRepository.findBrandById(brandId);
      if (!brand) {
        throw new NotFoundException('Brand not found');
      }

      return {
        brandId,
        modelName: input.modelName?.trim() || title,
        gtin: input.gtin?.trim() || null,
        verificationPolicy: 'manual_review',
      };
    }

    const brandName = input.brandName?.trim();
    if (!brandName) {
      throw new BadRequestException('Brand ID or brand name is required');
    }
    const existingBrand =
      await this.productRepository.findBrandByName(brandName);
    const brand =
      existingBrand ??
      (await this.productRepository.createBrand({
        name: brandName,
        registryStatus: 'seller_declared',
      }));

    return {
      brandId: brand.id,
      modelName: input.modelName?.trim() || title,
      gtin: input.gtin?.trim() || null,
      verificationPolicy: 'manual_review',
    };
  }

  private resolveParcelSnapshot(input: {
    parcelWeightGrams?: number | null;
    parcelLengthCm?: number | null;
    parcelWidthCm?: number | null;
    parcelHeightCm?: number | null;
  }) {
    return {
      parcelWeightGrams: input.parcelWeightGrams ?? null,
      parcelLengthCm: input.parcelLengthCm ?? null,
      parcelWidthCm: input.parcelWidthCm ?? null,
      parcelHeightCm: input.parcelHeightCm ?? null,
    };
  }

  private validateProductImages(imageUrls: string[]) {
    if (imageUrls.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    if (imageUrls.length > MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(
        `Offer creation supports up to ${MAX_PRODUCT_IMAGES} product images`,
      );
    }

    return imageUrls.map((imageUrl) => {
      const normalizedUrl = imageUrl.trim();
      if (!normalizedUrl) {
        throw new BadRequestException('Product image reference is required');
      }
      return normalizedUrl;
    });
  }

  private validateOptionGroups(
    groups: Array<{
      displayName: string;
      values: Array<{
        text: string;
        image?: string | null;
      }>;
    }>,
  ) {
    const normalizedGroups = groups.map((group) => {
      const displayName = group.displayName.trim();
      if (!displayName) {
        throw new BadRequestException('Option group display name is required');
      }
      if (!group.values?.length) {
        throw new BadRequestException(
          'Each option group must contain at least one value',
        );
      }

      const values = group.values.map((value) => {
        const text = value.text.trim();
        if (!text) {
          throw new BadRequestException('Option value text is required');
        }
        const image = value.image?.trim() || null;
        if (image) {
          const dataUrl = PRODUCT_IMAGE_DATA_URL.exec(image);
          if (!dataUrl) {
            throw new BadRequestException(
              'Option value image Data URL is invalid',
            );
          }
          const imageBytes = Buffer.from(dataUrl[2], 'base64');
          if (
            !imageBytes.length ||
            imageBytes.length > MAX_PRODUCT_IMAGE_BYTES
          ) {
            throw new BadRequestException(
              'Option value image must be non-empty and not exceed 5 MB',
            );
          }
        }
        return {
          text,
          image,
        };
      });
      if (new Set(values.map((value) => value.text)).size !== values.length) {
        throw new BadRequestException(
          'Option value texts must be unique within a group',
        );
      }

      return {
        displayName,
        values,
      };
    });

    if (
      new Set(normalizedGroups.map((group) => group.displayName)).size !==
      normalizedGroups.length
    ) {
      throw new BadRequestException(
        'Option group display names must be unique',
      );
    }
    return normalizedGroups;
  }
}
