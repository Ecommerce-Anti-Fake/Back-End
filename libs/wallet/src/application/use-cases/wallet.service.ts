import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WalletRepositoryPort, WalletTransactionInput } from '../ports';

@Injectable()
export class WalletService {
  constructor(private readonly walletRepository: WalletRepositoryPort) {}

  findById(walletId: string) {
    return this.walletRepository.findById(walletId);
  }

  findOrCreateUserWallet(userId: string, currency = 'VND') {
    return this.walletRepository.findOrCreateUserWallet(userId, currency);
  }

  findOrCreateShopWallet(shopId: string, currency = 'VND') {
    return this.walletRepository.findOrCreateShopWallet(shopId, currency);
  }

  findOrCreatePlatformWallet(platformCode: string, currency = 'VND') {
    return this.walletRepository.findOrCreatePlatformWallet(
      platformCode,
      currency,
    );
  }

  listLedger(walletId: string, page = 1, pageSize = 20) {
    return this.walletRepository.listLedger(walletId, page, pageSize);
  }

  executeTransaction(input: WalletTransactionInput) {
    return this.walletRepository.executeTransaction(input);
  }
}
