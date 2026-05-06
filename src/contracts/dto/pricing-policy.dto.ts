import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const PRICING_POLICY_SCOPES = ['NETWORK_DEFAULT', 'NODE_LEVEL', 'NODE_SPECIFIC'] as const;

export class DistributionPricingPolicyResponseDto {
  @ApiProperty({ example: 'policy-id' })
  id!: string;

  @ApiProperty({ example: 'network-id' })
  networkId!: string;

  @ApiProperty({ enum: PRICING_POLICY_SCOPES, example: 'NODE_LEVEL' })
  scope!: 'NETWORK_DEFAULT' | 'NODE_LEVEL' | 'NODE_SPECIFIC';

  @ApiPropertyOptional({ example: 'node-id', nullable: true })
  nodeId!: string | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  appliesToLevel!: number | null;

  @ApiPropertyOptional({ example: 'product-model-id', nullable: true })
  productModelId!: string | null;

  @ApiPropertyOptional({ example: 'category-id', nullable: true })
  categoryId!: string | null;

  @ApiProperty({ example: 'PERCENT' })
  discountType!: 'PERCENT';

  @ApiProperty({ example: 15 })
  discountValue!: number;

  @ApiPropertyOptional({ example: 100, nullable: true })
  minQuantity!: number | null;

  @ApiProperty({ example: 100 })
  priority!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ example: '2026-04-15T00:00:00.000Z', nullable: true })
  startsAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', nullable: true })
  endsAt!: Date | null;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class CreateDistributionPricingPolicyDto {
  @ApiProperty({ example: 'network-id' })
  @IsString()
  networkId!: string;

  @ApiProperty({ enum: PRICING_POLICY_SCOPES, example: 'NODE_LEVEL' })
  @IsString()
  @IsIn(PRICING_POLICY_SCOPES)
  scope!: 'NETWORK_DEFAULT' | 'NODE_LEVEL' | 'NODE_SPECIFIC';

  @ApiPropertyOptional({ example: 'node-id' })
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  appliesToLevel?: number;

  @ApiPropertyOptional({ example: 'product-model-id' })
  @IsOptional()
  @IsString()
  productModelId?: string;

  @ApiPropertyOptional({ example: 'category-id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @Min(5)
  @Max(20)
  discountValue!: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minQuantity?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ example: '2026-04-15T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  endsAt?: string;
}
