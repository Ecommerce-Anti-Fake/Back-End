import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CATALOG_SERVICE_CLIENT,
  DISTRIBUTION_MESSAGE_PATTERNS,
  ResolveWholesalePricingMessage,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';
import { WholesalePricingInput, WholesalePricingPort, WholesalePricingResult } from '../../application/ports';

@Injectable()
export class CatalogWholesalePricingAdapter implements WholesalePricingPort {
  constructor(
    @Inject(CATALOG_SERVICE_CLIENT)
    private readonly catalogClient: ClientProxy,
  ) {}

  async resolve(input: WholesalePricingInput): Promise<WholesalePricingResult> {
    const payload: ResolveWholesalePricingMessage = {
      buyerShopId: input.buyerShopId,
      buyerDistributionNodeId: input.buyerDistributionNodeId,
      quantity: input.quantity,
      offer: {
        price: Number(input.offer.price.toString()),
        productModelId: input.offer.productModelId,
        categoryId: input.offer.categoryId,
        distributionNodeId: input.offer.distributionNode?.id ?? null,
        distributionNetworkId: input.offer.distributionNode?.networkId ?? null,
      },
    };

    try {
      return await lastValueFrom(
        this.catalogClient.send<WholesalePricingResult, ResolveWholesalePricingMessage>(
          DISTRIBUTION_MESSAGE_PATTERNS.resolveWholesalePricing,
          payload,
        ),
      );
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
