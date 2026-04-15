import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class OrderItemResponseDto {
  @ApiProperty({ example: 'offer-id' })
  offerId!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  offerTitleSnapshot!: string;

  @ApiProperty({ example: 150000 })
  unitPrice!: number;

  @ApiProperty({ example: 10 })
  quantity!: number;

  @ApiProperty({ example: 'standard' })
  verificationLevelSnapshot!: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: 'order-id' })
  id!: string;

  @ApiProperty({ example: 'RETAIL' })
  orderMode!: 'RETAIL' | 'WHOLESALE';

  @ApiProperty({ example: 'pending' })
  orderStatus!: string;

  @ApiPropertyOptional({ example: 'PENDING', nullable: true })
  paymentStatus!: string | null;

  @ApiProperty({ example: 'shop-id' })
  sellerShopId!: string;

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  sellerShopName!: string;

  @ApiPropertyOptional({ example: 'buyer-user-id', nullable: true })
  buyerUserId!: string | null;

  @ApiPropertyOptional({ example: 'buyer-shop-id', nullable: true })
  buyerShopId!: string | null;

  @ApiPropertyOptional({ example: 'buyer-node-id', nullable: true })
  buyerDistributionNodeId!: string | null;

  @ApiProperty({ example: 2000000 })
  baseAmount!: number;

  @ApiProperty({ example: 150000 })
  discountAmount!: number;

  @ApiProperty({ example: 12750 })
  platformFeeAmount!: number;

  @ApiProperty({ example: 1842750 })
  buyerPayableAmount!: number;

  @ApiProperty({ example: 1830000 })
  sellerReceivableAmount!: number;

  @ApiProperty({ example: 1842750 })
  totalAmount!: number;

  @ApiProperty({ type: OrderItemResponseDto, isArray: true })
  items!: OrderItemResponseDto[];

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class MarkOrderPaidDto {
  @ApiPropertyOptional({ example: 'bank-transfer-ref-001' })
  @IsOptional()
  @IsString()
  providerRef?: string;
}

export class CreateRetailOrderDto {
  @ApiProperty({ example: 'offer-id' })
  @IsString()
  offerId!: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'spring-aff-001' })
  @IsOptional()
  @IsString()
  affiliateCode?: string;
}

export class CreateWholesaleOrderDto {
  @ApiProperty({ example: 'buyer-shop-id' })
  @IsString()
  buyerShopId!: string;

  @ApiPropertyOptional({ example: 'buyer-node-id' })
  @IsOptional()
  @IsString()
  buyerDistributionNodeId?: string;

  @ApiProperty({ example: 'offer-id' })
  @IsString()
  offerId!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'spring-aff-001' })
  @IsOptional()
  @IsString()
  affiliateCode?: string;
}
