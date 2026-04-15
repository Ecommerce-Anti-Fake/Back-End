import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class DistributionNetworkResponseDto {
  @ApiProperty({ example: 'network-id' })
  id!: string;

  @ApiProperty({ example: 'brand-id' })
  brandId!: string;

  @ApiProperty({ example: 'manufacturer-shop-id' })
  manufacturerShopId!: string;

  @ApiProperty({ example: 'Network phan phoi chinh hang ABC' })
  networkName!: string;

  @ApiProperty({ example: 'active' })
  networkStatus!: string;

  @ApiProperty({ example: 3 })
  maxAgentDepth!: number;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class DistributionNodeResponseDto {
  @ApiProperty({ example: 'node-id' })
  id!: string;

  @ApiProperty({ example: 'network-id' })
  networkId!: string;

  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'parent-node-id', nullable: true })
  parentNodeId!: string | null;

  @ApiProperty({ example: 1 })
  level!: number;

  @ApiProperty({ example: 'AGENT_LEVEL_1' })
  nodeType!: string;

  @ApiProperty({ example: 'ACTIVE' })
  relationshipStatus!: string;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class DistributionShipmentItemResponseDto {
  @ApiProperty({ example: 'shipment-item-id' })
  id!: string;

  @ApiProperty({ example: 'batch-id' })
  batchId!: string;

  @ApiProperty({ example: 'product-model-id' })
  productModelId!: string;

  @ApiProperty({ example: 100 })
  quantity!: number;

  @ApiPropertyOptional({ example: 120000, nullable: true })
  unitCost!: number | null;
}

export class DistributionShipmentResponseDto {
  @ApiProperty({ example: 'shipment-id' })
  id!: string;

  @ApiProperty({ example: 'network-id' })
  networkId!: string;

  @ApiProperty({ example: 'from-node-id' })
  fromNodeId!: string;

  @ApiProperty({ example: 'to-node-id' })
  toNodeId!: string;

  @ApiProperty({ example: 'SHIP-2026-0001' })
  shipmentCode!: string;

  @ApiProperty({ example: 'IN_TRANSIT' })
  shipmentStatus!: string;

  @ApiPropertyOptional({ example: 'Lo hang dot 1', nullable: true })
  note!: string | null;

  @ApiPropertyOptional({ example: '2026-04-15T09:00:00.000Z', nullable: true })
  shippedAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-04-16T14:00:00.000Z', nullable: true })
  receivedAt!: Date | null;

  @ApiProperty({
    type: DistributionShipmentItemResponseDto,
    isArray: true,
  })
  items!: DistributionShipmentItemResponseDto[];

  @ApiProperty({ example: '2026-04-15T09:00:00.000Z' })
  createdAt!: Date;
}

export class CreateDistributionNetworkDto {
  @ApiProperty({ example: 'brand-id' })
  @IsString()
  brandId!: string;

  @ApiProperty({ example: 'manufacturer-shop-id' })
  @IsString()
  manufacturerShopId!: string;

  @ApiProperty({ example: 'Network phan phoi chinh hang ABC' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  networkName!: string;
}

export class CreateDistributionNodeDto {
  @ApiProperty({ example: 'shop-id' })
  @IsString()
  shopId!: string;

  @ApiProperty({ example: 'parent-node-id' })
  @IsString()
  parentNodeId!: string;
}

export class CreateDistributionShipmentItemDto {
  @ApiProperty({ example: 'batch-id' })
  @IsString()
  batchId!: string;

  @ApiProperty({ example: 'product-model-id' })
  @IsString()
  productModelId!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  unitCost?: number;
}

export class CreateDistributionShipmentDto {
  @ApiProperty({ example: 'from-node-id' })
  @IsString()
  fromNodeId!: string;

  @ApiProperty({ example: 'to-node-id' })
  @IsString()
  toNodeId!: string;

  @ApiProperty({ example: 'SHIP-2026-0001' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  shipmentCode!: string;

  @ApiPropertyOptional({ example: 'Lo hang dot 1' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({
    type: CreateDistributionShipmentItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDistributionShipmentItemDto)
  items!: CreateDistributionShipmentItemDto[];
}
