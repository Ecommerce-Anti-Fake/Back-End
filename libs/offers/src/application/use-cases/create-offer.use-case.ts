import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferResponse } from './offers.mapper';

@Injectable()
export class CreateOfferUseCase {
  constructor(private readonly productRepository: OffersRepository) {}

  async execute(input: {
    sellerUserId: string;
    shopId: string;
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
    shippingProviderCodes?: string[];
    parcelWeightGrams?: number | null;
    parcelLengthCm?: number | null;
    parcelWidthCm?: number | null;
    parcelHeightCm?: number | null;
  }) {
    const ownedShop = await this.productRepository.findOwnedShop(
      input.shopId,
      input.sellerUserId,
    );
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
        input.shopId,
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
          input.shopId,
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
    const offerStatus = input.offerStatus ?? 'active';

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

    const shippingProviderCodes = this.normalizeShippingProviderCodes(
      input.shippingProviderCodes,
    );
    await this.assertShippingProvidersExist(shippingProviderCodes);
    const parcel = this.resolveParcelSnapshot(input, shippingProviderCodes);

    const offer = await this.productRepository.createOffer({
      sellerUserId: input.sellerUserId,
      shopId: input.shopId,
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
      shippingProviderCodes,
      ...parcel,
    });

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

  private normalizeShippingProviderCodes(providerCodes?: string[]) {
    const codes = Array.from(
      new Set(
        (providerCodes ?? [])
          .map((code) => code.trim().toUpperCase())
          .filter(Boolean),
      ),
    );
    return codes.length ? codes : ['SELF_DELIVERY'];
  }

  private async assertShippingProvidersExist(providerCodes: string[]) {
    const carriers =
      await this.productRepository.findActiveShippingCarriersByCodes(
        providerCodes,
      );
    if (carriers.length !== providerCodes.length) {
      throw new BadRequestException(
        'One or more shipping providers are invalid',
      );
    }
  }

  private resolveParcelSnapshot(
    input: {
      parcelWeightGrams?: number | null;
      parcelLengthCm?: number | null;
      parcelWidthCm?: number | null;
      parcelHeightCm?: number | null;
    },
    providerCodes: string[],
  ) {
    const parcel = {
      parcelWeightGrams: input.parcelWeightGrams ?? null,
      parcelLengthCm: input.parcelLengthCm ?? null,
      parcelWidthCm: input.parcelWidthCm ?? null,
      parcelHeightCm: input.parcelHeightCm ?? null,
    };

    if (
      providerCodes.some((code) => code !== 'SELF_DELIVERY') &&
      Object.values(parcel).some((value) => !value || value < 1)
    ) {
      throw new BadRequestException(
        'Parcel weight and dimensions are required for integrated shipping providers',
      );
    }

    return parcel;
  }
}
