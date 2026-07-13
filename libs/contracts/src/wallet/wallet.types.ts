export interface MyWalletLookupMessage {
  userId: string;
}
export interface ShopWalletLookupMessage {
  shopId: string;
  requesterUserId: string;
  requesterRole: string;
}
export interface WalletTransactionsLookupMessage {
  userId: string;
  page: number;
  limit: number;
}
export interface ShopWalletTransactionsLookupMessage extends ShopWalletLookupMessage {
  page: number;
  limit: number;
}
export interface ShopWalletWithdrawalMessage extends ShopWalletLookupMessage {
  amount: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}
export interface WalletWithdrawalActionMessage {
  id: string;
}
