import { Injectable } from '@nestjs/common';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';

@Injectable()
export class ListAdminWalletWithdrawalsUseCase {
  constructor(private readonly repository: WalletRepository) {}
  execute(input: { page?: number; limit?: number; status?: string }) {
    return this.repository.listAllWithdrawals(input.page, input.limit, input.status);
  }
}
