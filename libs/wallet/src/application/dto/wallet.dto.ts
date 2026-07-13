import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class WalletTransactionsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class WalletResponseDto {
  @ApiProperty() currency!: string;
  @ApiProperty({ example: '0.00', type: String }) availableBalance!: string;
  @ApiProperty({ example: '0.00', type: String }) pendingBalance!: string;
  @ApiProperty({ example: '0.00', type: String }) lockedBalance!: string;
  @ApiProperty() status!: string;
}

export class WalletLedgerEntryResponseDto {
  @ApiProperty() transactionCode!: string;
  @ApiProperty() transactionType!: string;
  @ApiProperty() status!: string;
  @ApiProperty() direction!: string;
  @ApiProperty() balanceType!: string;
  @ApiProperty({ type: String }) amount!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class PaginatedWalletLedgerResponseDto {
  @ApiProperty({ type: WalletLedgerEntryResponseDto, isArray: true })
  items!: WalletLedgerEntryResponseDto[];

  @ApiProperty({
    example: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
