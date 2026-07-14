import { Injectable } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { toWalletResponse } from '../wallet.mapper';

@Injectable()
export class GetMyWalletUseCase {
  constructor(private readonly walletService: WalletService) {}

  async execute(userId: string) {
    return toWalletResponse(
      await this.walletService.findOrCreateUserWallet(userId, 'VND'),
    );
  }
}
