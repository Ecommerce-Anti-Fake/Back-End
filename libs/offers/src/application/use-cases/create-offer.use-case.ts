import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferResponse } from './offers.mapper';

const MAX_PRODUCT_IMAGES = 10;

@Injectable()
export class CreateOfferUseCase {
  constructor(private readonly productRepository: OffersRepository) {}

  async execute(input: {
    sellerUserId: string;
    shopId?: string | null;
    categoryId: string;
    brandId?: string | null;
    modelName?: string | null;
    gtin?: string | null;
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
    productImages?: string[];
    optionGroups?: Array<{
      name: string;
      displayName: string;
      sortOrder?: number;
      values: Array<{
        text: string;
        mediaAssetId?: string | null;
        sortOrder?: number;
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

    const mediaAssetIds = [
      ...new Set(
        optionGroups.flatMap((group) =>
          group.values.flatMap((value) =>
            value.mediaAssetId ? [value.mediaAssetId] : [],
          ),
        ),
      ),
    ];
    if (mediaAssetIds.length > 0) {
      const ownedAssets = await this.productRepository.findOwnedMediaAssets(
        mediaAssetIds,
        input.sellerUserId,
      );
      if (ownedAssets.length !== mediaAssetIds.length) {
        throw new BadRequestException(
          'Option media asset is invalid or does not belong to current user',
        );
      }
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
      price: input.price,
      currency,
      itemCondition,
      availableQuantity: input.availableQuantity,
      verificationLevel,
      offerStatus,
      ...this.resolveParcelSnapshot(input),
    };

    if (optionGroups.length > 0) {
      const offer = await this.productRepository.createOfferWithSalesOptions({
        offer: offerData,
        productImages,
        optionGroups,
      });
      return toOfferResponse(offer);
    }

    const offer = await this.productRepository.createOffer(offerData);

    for (const [index, imageUrl] of productImages.entries()) {
      await this.productRepository.createOfferMedia({
        offerId: offer.id,
        mediaAssetId: null,
        mediaType: index === 0 ? 'thumbnail' : 'gallery',
        fileUrl: imageUrl,
        phash: null,
      });
    }

    return toOfferResponse(offer);
  }

  private async resolveProductIdentity(
    input: {
      categoryId: string;
      brandId?: string | null;
      modelName?: string | null;
      gtin?: string | null;
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
      name: string;
      displayName: string;
      sortOrder?: number;
      values: Array<{
        text: string;
        mediaAssetId?: string | null;
        sortOrder?: number;
      }>;
    }>,
  ) {
    const normalizedGroups = groups.map((group, groupIndex) => {
      const name = group.name.trim();
      const displayName = group.displayName.trim();
      if (!name || !displayName) {
        throw new BadRequestException(
          'Option group name and display name are required',
        );
      }
      if (!group.values?.length) {
        throw new BadRequestException(
          'Each option group must contain at least one value',
        );
      }

      const values = group.values.map((value, valueIndex) => {
        const text = value.text.trim();
        if (!text) {
          throw new BadRequestException('Option value text is required');
        }
        return {
          text,
          mediaAssetId: value.mediaAssetId?.trim() || null,
          sortOrder: value.sortOrder ?? valueIndex,
        };
      });
      if (new Set(values.map((value) => value.text)).size !== values.length) {
        throw new BadRequestException(
          'Option value texts must be unique within a group',
        );
      }

      return {
        name,
        displayName,
        sortOrder: group.sortOrder ?? groupIndex,
        values,
      };
    });

    if (
      new Set(normalizedGroups.map((group) => group.name)).size !==
      normalizedGroups.length
    ) {
      throw new BadRequestException('Option group names must be unique');
    }
    return normalizedGroups;
  }
}
