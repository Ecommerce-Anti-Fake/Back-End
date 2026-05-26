import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferResponse } from './products.mapper';

@Injectable()
export class CreateOfferUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    sellerUserId: string;
    shopId: string;
    categoryId: string;
    productModelId: string;
    distributionNodeId?: string | null;
    title: string;
    description: string;
    price: number;
    currency?: string;
    salesMode?: 'RETAIL' | 'WHOLESALE' | 'BOTH';
    minWholesaleQty?: number | null;
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
    const ownedShop = await this.productRepository.findOwnedShop(input.shopId, input.sellerUserId);
    if (!ownedShop) {
      throw new BadRequestException('Shop does not belong to current user');
    }

    if (ownedShop.shopStatus !== 'active') {
      throw new BadRequestException('Shop must complete KYC approval before creating offers');
    }

    const productModel = await this.productRepository.findModelById(input.productModelId);
    if (!productModel) {
      throw new NotFoundException('Product model not found');
    }

    const category = await this.productRepository.findCategoryById(input.categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const approvedCategoryRegistration = await this.productRepository.findApprovedShopCategoryRegistration(
      input.shopId,
      input.categoryId,
    );
    if (!approvedCategoryRegistration) {
      throw new BadRequestException('Shop category must be approved before creating offers in this category');
    }

    if (productModel.categoryId !== input.categoryId) {
      throw new BadRequestException('Category must match the selected product model');
    }

    const distributionNodeId = input.distributionNodeId?.trim() || null;
    if (distributionNodeId) {
      const distributionNode = await this.productRepository.findOwnedDistributionNode(
        distributionNodeId,
        input.shopId,
        input.sellerUserId,
      );

      if (!distributionNode) {
        throw new BadRequestException('Distribution node is invalid for the selected shop');
      }

      if (distributionNode.relationshipStatus !== 'ACTIVE') {
        throw new BadRequestException('Distribution node must be active before creating offers');
      }
    }

    const title = input.title.trim();
    const description = input.description.trim();
    const currency = input.currency?.trim().toUpperCase() || 'VND';
    const salesMode = input.salesMode ?? 'RETAIL';
    const minWholesaleQty = input.minWholesaleQty ?? null;
    const itemCondition = input.itemCondition?.trim() || 'new';
    const verificationLevel = input.verificationLevel?.trim() || 'standard';
    const offerStatus = input.offerStatus ?? 'active';

    if (!title || !description) {
      throw new BadRequestException('Title and description are required');
    }

    if (input.price <= 0) {
      throw new BadRequestException('Price must be greater than 0');
    }

    if (!Number.isInteger(input.availableQuantity) || input.availableQuantity < 1) {
      throw new BadRequestException('Available quantity must be at least 1');
    }

    if (!['RETAIL', 'WHOLESALE', 'BOTH'].includes(salesMode)) {
      throw new BadRequestException('Sales mode is invalid');
    }

    if ((salesMode === 'WHOLESALE' || salesMode === 'BOTH') && (!minWholesaleQty || minWholesaleQty < 1)) {
      throw new BadRequestException('Wholesale offers must define minWholesaleQty');
    }

    if (!['active', 'inactive', 'draft'].includes(offerStatus)) {
      throw new BadRequestException('Offer status must be active, inactive, or draft');
    }

    if (
      (salesMode === 'WHOLESALE' || salesMode === 'BOTH') &&
      !['MANUFACTURER', 'DISTRIBUTOR'].includes(ownedShop.registrationType)
    ) {
      throw new BadRequestException('Only manufacturer or distributor shops can create wholesale offers');
    }

    const shippingProviderCodes = this.normalizeShippingProviderCodes(input.shippingProviderCodes);
    await this.assertShippingProvidersExist(shippingProviderCodes);
    const parcel = this.resolveParcelSnapshot(input, shippingProviderCodes);

    const offer = await this.productRepository.createOffer({
      sellerUserId: input.sellerUserId,
      shopId: input.shopId,
      categoryId: input.categoryId,
      productModelId: input.productModelId,
      distributionNodeId,
      title,
      description,
      price: input.price,
      currency,
      salesMode,
      minWholesaleQty: salesMode === 'RETAIL' ? null : minWholesaleQty,
      itemCondition,
      availableQuantity: input.availableQuantity,
      verificationLevel,
      offerStatus,
      shippingProviderCodes,
      ...parcel,
    });

    return toOfferResponse(offer);
  }

  private normalizeShippingProviderCodes(providerCodes?: string[]) {
    const codes = Array.from(new Set((providerCodes ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean)));
    return codes.length ? codes : ['SELF_DELIVERY'];
  }

  private async assertShippingProvidersExist(providerCodes: string[]) {
    const carriers = await this.productRepository.findActiveShippingCarriersByCodes(providerCodes);
    if (carriers.length !== providerCodes.length) {
      throw new BadRequestException('One or more shipping providers are invalid');
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

    if (providerCodes.some((code) => code !== 'SELF_DELIVERY') && Object.values(parcel).some((value) => !value || value < 1)) {
      throw new BadRequestException('Parcel weight and dimensions are required for integrated shipping providers');
    }

    return parcel;
  }
}
