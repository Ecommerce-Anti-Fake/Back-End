import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';
import { PayoutAccountSecurityService } from '../../domain';
import { VietQrBankAccountLookupService } from '../../infrastructure/vietqr-bank-account-lookup.service';
import { WalletService } from '../use-cases/wallet.service';

@Injectable()
export class BankAccountVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly security: PayoutAccountSecurityService,
    private readonly lookup: VietQrBankAccountLookupService,
  ) {}

  listBanks() {
    return this.lookup.listBanks();
  }

  async verify(input: {
    userId: string;
    requesterRole: string;
    shopId?: string;
    bankBin: string;
    accountNumber: string;
  }) {
    if (
      input.shopId &&
      !(await this.walletService.canAccessShopWallet(
        input.shopId,
        input.userId,
        input.requesterRole,
      ))
    ) {
      throw new ForbiddenException('You cannot access this shop wallet');
    }

    const bankBin = input.bankBin.trim();
    const accountNumber = this.security.normalizeAccountNumber(input.accountNumber);
    if (!/^\d{6,19}$/.test(accountNumber)) {
      throw new BadRequestException('Số tài khoản phải có từ 6 đến 19 chữ số.');
    }
    const bank = (await this.lookup.listBanks()).find((item) => item.bin === bankBin);
    if (!bank) throw new BadRequestException('Ngân hàng không hợp lệ.');
    if (!bank.lookupSupported) {
      throw new BadRequestException('Ngân hàng này chưa hỗ trợ tra cứu tài khoản.');
    }

    const resolved = await this.lookup.lookupAccount({ bankBin, accountNumber });
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const verification = await this.prisma.bankAccountVerification.create({
      data: {
        userId: input.userId,
        shopId: input.shopId,
        bankBin: bank.bin,
        bankCode: bank.code,
        bankName: bank.name,
        bankShortName: bank.shortName,
        bankLogo: bank.logo,
        accountNumberEncrypted: this.security.encryptAccountNumber(accountNumber),
        accountNumberHash: this.security.hashAccountNumber(bank.bin, accountNumber),
        accountNumberLast4: accountNumber.slice(-4),
        accountNumberLength: accountNumber.length,
        accountHolder: resolved.accountHolder,
        provider: resolved.provider,
        expiresAt,
      },
    });

    return {
      verificationId: verification.id,
      bank: {
        bin: bank.bin,
        code: bank.code,
        name: bank.name,
        shortName: bank.shortName,
        logo: bank.logo,
      },
      accountNumberMasked: `${'*'.repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}`,
      accountHolder: resolved.accountHolder,
      expiresAt,
    };
  }
}
