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
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

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
    brandId?: string | null;
    distributionNodeId?: string | null;
    title: string;
    description: string;
    price: number;
    currency?: string;
    itemCondition?: string;
    availableQuantity: number;
    verificationLevel?: string;
    offerStatus?: 'active' | 'inactive' | 'draft';
    parcelWeightGrams?: number | null;
    parcelLengthCm?: number | null;
    parcelWidthCm?: number | null;
    parcelHeightCm?: number | null;
    productImages?: Array<{
      buffer: Buffer | { data?: number[] };
      mimetype: string;
      originalname?: string;
      size: number;
    }>;
  }) {
    const productImages = this.validateProductImages(input.productImages ?? []);
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
    const verificationLevel = input.verificationLevel?.trim() || 'standard';
    const offerStatus = input.offerStatus === 'draft' ? 'draft' : 'inactive';

    if (input.price <= 0) {
      throw new BadRequestException('Price must be greater than 0');
    }

    if (
      !Number.isInteger(input.availableQuantity) ||
      input.availableQuantity < 1
    ) {
      throw new BadRequestException('Available quantity must be at least 1');
    }

    if (!['active', 'inactive', 'draft'].includes(offerStatus)) {
      throw new BadRequestException(
        'Offer status must be active, inactive, or draft',
      );
    }

    const offer = await this.productRepository.createOffer({
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
      price: input.price,
      currency,
      itemCondition,
      availableQuantity: input.availableQuantity,
      verificationLevel,
      offerStatus,
      ...this.resolveParcelSnapshot(input),
    });

    const uploadedImages: Array<{ publicId: string; assetType: 'IMAGE' }> = [];
    try {
      for (const [index, image] of productImages.entries()) {
        const uploaded = await this.mediaService.uploadCloudinaryBuffer({
          buffer: image.buffer,
          folder: `offers/${offer.id}/media`,
          requesterUserId: input.sellerUserId,
          assetType: 'IMAGE',
          mimeType: image.mimetype,
          sequence: index + 1,
        });
        uploadedImages.push({ publicId: uploaded.publicId, assetType: 'IMAGE' });

        const mediaAsset = await this.mediaService.createCloudinaryAsset({
          ownerUserId: input.sellerUserId,
          assetType: 'IMAGE',
          resourceType: 'PRODUCT_IMAGE',
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          mimeType: image.mimetype,
          folder: `offers/${offer.id}/media`,
        });

        await this.productRepository.createOfferMedia({
          offerId: offer.id,
          mediaAssetId: mediaAsset.id,
          mediaType: index === 0 ? 'thumbnail' : 'gallery',
          fileUrl: uploaded.secureUrl,
          phash: null,
        });
      }
    } catch (error) {
      await Promise.allSettled(
        uploadedImages.map((image) =>
          this.mediaService.deleteCloudinaryAsset(image),
        ),
      );
      throw error;
    }

    return toOfferResponse(offer);
  }

  private async resolveProductIdentity(
    input: {
      categoryId: string;
      brandId?: string | null;
    },
    title: string,
  ) {
    const brandId = input.brandId?.trim();
    if (!brandId) {
      throw new BadRequestException('Brand is required');
    }

    const brand = await this.productRepository.findBrandById(brandId);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return {
      brandId,
      modelName: title,
      gtin: null,
      verificationPolicy: 'manual_review',
    };
  }

  private resolveParcelSnapshot(
    input: {
      parcelWeightGrams?: number | null;
      parcelLengthCm?: number | null;
      parcelWidthCm?: number | null;
      parcelHeightCm?: number | null;
    },
  ) {
    return {
      parcelWeightGrams: input.parcelWeightGrams ?? null,
      parcelLengthCm: input.parcelLengthCm ?? null,
      parcelWidthCm: input.parcelWidthCm ?? null,
      parcelHeightCm: input.parcelHeightCm ?? null,
    };
  }

  private validateProductImages(
    files: Array<{
      buffer: Buffer | { data?: number[] };
      mimetype: string;
      originalname?: string;
      size: number;
    }>,
  ) {
    if (files.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    if (files.length > MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(
        `Offer creation supports up to ${MAX_PRODUCT_IMAGES} product images`,
      );
    }

    return files.map((file) => {
      const buffer = normalizeBuffer(file.buffer);
      const mimetype = file.mimetype.trim().toLowerCase();

      if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(mimetype)) {
        throw new BadRequestException('Product images must be JPG, PNG or WEBP');
      }

      if (!buffer.length || file.size <= 0) {
        throw new BadRequestException('Uploaded product image is empty');
      }

      if (
        file.size > MAX_PRODUCT_IMAGE_BYTES ||
        buffer.length > MAX_PRODUCT_IMAGE_BYTES
      ) {
        throw new BadRequestException(
          'Product image file size must be at most 5MB',
        );
      }

      return {
        buffer,
        mimetype,
        originalname: file.originalname,
        size: file.size,
      };
    });
  }
}

function normalizeBuffer(buffer: Buffer | { data?: number[] }) {
  if (Buffer.isBuffer(buffer)) {
    return buffer;
  }

  if (Array.isArray(buffer?.data)) {
    return Buffer.from(buffer.data);
  }

  throw new BadRequestException('Uploaded product image is invalid');
}
