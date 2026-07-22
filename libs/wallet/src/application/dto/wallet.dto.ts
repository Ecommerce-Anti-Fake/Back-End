import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDecimal, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min, MaxLength } from 'class-validator';

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

export class CreateWalletTopUpDto {
  @ApiProperty({ example: '100000' })
  @IsDecimal({ decimal_digits: '0,2' })
  amount!: string;

  @ApiPropertyOptional({ description: 'Client-generated key for safe retries' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}

export class WalletTopUpResponseDto {
  @ApiProperty() topUpId!: string;
  @ApiProperty() paymentLinkId!: string;
  @ApiProperty() checkoutUrl!: string;
  @ApiProperty({ type: String }) amount!: string;
  @ApiProperty() currency!: string;
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

export class CreateWalletWithdrawalDto {
  @ApiProperty({ example: '100000' })
  @IsDecimal({ decimal_digits: '0,2' })
  amount!: string;

  @ApiProperty({ example: '6b57b77d-a159-4d57-b82f-f3e2586b0918' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  payoutAccountId!: string;

  @ApiProperty({ example: '019f-idempotency-key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey!: string;

  @ApiProperty({ description: 'One-time token returned after Firebase step-up verification' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  authorizationToken!: string;
}

export class WalletWithdrawalResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) payoutAccountId!: string | null;
  @ApiProperty({ type: String }) amount!: string;
  @ApiProperty({ type: String, example: '0.00' }) fee!: string;
  @ApiProperty() bankName!: string;
  @ApiProperty({ nullable: true, example: '******6789' }) accountNumberMasked!: string | null;
  @ApiProperty() accountHolder!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) transferReference?: string | null;
  @ApiProperty({ nullable: true }) rejectionReason?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ nullable: true }) processedAt!: Date | null;
}

export class CreatePayoutAccountDto {
  @ApiProperty({ example: '970436' })
  @Matches(/^\d{6}$/)
  bankBin!: string;

  @ApiProperty({ example: 'VCB' })
  @Matches(/^[A-Za-z0-9]{2,20}$/)
  bankCode!: string;

  @ApiProperty({ example: 'Vietcombank' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  bankName!: string;

  @ApiProperty({ example: '0123456789' })
  @Matches(/^\d{6,20}$/)
  accountNumber!: string;

  @ApiProperty({ example: 'NGUYEN VAN A' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  accountHolder!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(200)
  authorizationToken!: string;
}

export class PayoutAccountResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() ownerType!: string;
  @ApiProperty() bankBin!: string;
  @ApiProperty() bankCode!: string;
  @ApiProperty() bankName!: string;
  @ApiProperty({ example: '******6789' }) accountNumberMasked!: string;
  @ApiProperty() accountHolder!: string;
  @ApiProperty({ nullable: true }) resolvedAccountHolder!: string | null;
  @ApiProperty() verificationStatus!: string;
  @ApiProperty({ nullable: true }) verificationMethod!: string | null;
  @ApiProperty() availableAfter!: Date;
  @ApiProperty({ nullable: true }) verifiedAt!: Date | null;
  @ApiProperty({ nullable: true }) rejectionReason!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class PayoutAccountAuthorizationDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(200)
  authorizationToken!: string;
}

export class CreateWithdrawalAuthorizationChallengeDto {
  @ApiProperty({ enum: ['PHONE', 'EMAIL'] })
  @IsIn(['PHONE', 'EMAIL'])
  channel!: 'PHONE' | 'EMAIL';

  @ApiProperty({ enum: ['CREATE_PAYOUT_ACCOUNT', 'DELETE_PAYOUT_ACCOUNT', 'CREATE_WITHDRAWAL'] })
  @IsIn(['CREATE_PAYOUT_ACCOUNT', 'DELETE_PAYOUT_ACCOUNT', 'CREATE_WITHDRAWAL'])
  operation!: 'CREATE_PAYOUT_ACCOUNT' | 'DELETE_PAYOUT_ACCOUNT' | 'CREATE_WITHDRAWAL';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) payoutAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDecimal({ decimal_digits: '0,2' }) amount?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{6}$/) bankBin?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Za-z0-9]{2,20}$/) bankCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) bankName?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{6,20}$/) accountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) accountHolder?: string;
}

export class VerifyWithdrawalAuthorizationChallengeDto {
  @ApiProperty({ description: 'Fresh Firebase ID token from Phone Auth or email-link sign-in' })
  @IsString() @IsNotEmpty() @MaxLength(10000)
  firebaseIdToken!: string;
}

export class VerifyPayoutAccountDto {
  @ApiProperty({ example: 'NGUYEN VAN A' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  resolvedAccountHolder!: string;
}

export class ReasonDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500)
  reason!: string;
}

export class CompleteWalletWithdrawalDto {
  @ApiProperty({ example: 'VCB-20260722-001' })
  @IsString() @IsNotEmpty() @MaxLength(150)
  transferReference!: string;
}

export class AdminPayoutAccountsQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'VERIFIED', 'REJECTED', 'DISABLED'] })
  @IsOptional()
  @IsIn(['PENDING', 'VERIFIED', 'REJECTED', 'DISABLED'])
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DISABLED';
}

export class AdjustWalletBalanceDto {
  @ApiProperty({ enum: ['CREDIT', 'DEBIT'] }) @IsIn(['CREDIT', 'DEBIT']) direction!: 'CREDIT' | 'DEBIT';
  @ApiProperty({ enum: ['AVAILABLE', 'PENDING', 'LOCKED'] }) @IsIn(['AVAILABLE', 'PENDING', 'LOCKED']) balanceType!: 'AVAILABLE' | 'PENDING' | 'LOCKED';
  @ApiProperty({ example: '100000' }) @IsDecimal({ decimal_digits: '0,2' }) amount!: string;
  @ApiProperty({ example: 'Điều chỉnh sau đối soát' }) @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}

export class WalletReconciliationQueryDto extends WalletTransactionsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transactionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class WalletWithdrawalsQueryDto extends WalletTransactionsQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED'])
  status?: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'CANCELLED';
}
