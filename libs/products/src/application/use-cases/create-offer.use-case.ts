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

    if (!title || !description) {
      throw new BadRequestException('Title and description are required');
    }

    if ((salesMode === 'WHOLESALE' || salesMode === 'BOTH') && (!minWholesaleQty || minWholesaleQty < 1)) {
      throw new BadRequestException('Wholesale offers must define minWholesaleQty');
    }

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
      offerStatus: 'active',
    });

    return toOfferResponse(offer);
  }
}
