import { Prisma } from '@prisma/client';

const decimalToString = (value: Prisma.Decimal) => value.toFixed(2);

export function toWalletResponse(wallet: Prisma.WalletGetPayload<{}>) {
  return {
    ...wallet,
    availableBalance: decimalToString(wallet.availableBalance),
    pendingBalance: decimalToString(wallet.pendingBalance),
    lockedBalance: decimalToString(wallet.lockedBalance),
  };
}
