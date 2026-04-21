import { OfferForOrdering } from '../../infrastructure/persistence/orders.repository';

export type WholesalePricingInput = {
  buyerShopId: string;
  buyerDistributionNodeId?: string;
  offer: OfferForOrdering;
  quantity: number;
};

export type WholesalePricingResult = {
  buyerDistributionNodeId: string | null;
  unitPrice: number;
  discountPercent: number;
  baseAmount: number;
  discountAmount: number;
  platformFeeAmount: number;
  buyerPayableAmount: number;
  sellerReceivableAmount: number;
  totalAmount: number;
  isInNetworkTrade: boolean;
};

export abstract class WholesalePricingPort {
  abstract resolve(input: WholesalePricingInput): Promise<WholesalePricingResult>;
}
