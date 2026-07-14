import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WalletRepository } from '../../infrastructure/persistence/wallet.repository';

@Injectable()
export class GetWalletReconciliationUseCase {
  constructor(private readonly repository: WalletRepository) {}
  execute(input: { fromDate?: string; toDate?: string; shopId?: string; transactionType?: string; status?: string; page?: number; limit?: number }) {
    return this.repository.getReconciliation(input);
  }
}
