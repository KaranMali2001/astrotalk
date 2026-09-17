export interface Wallet {
  id: string;
  balance: number;
  bonus: number;
  totalBalence: number;
  currency: string;
}

export interface WalletInfo {
  balance: number;
  bonus: number;
  totalBalence: number;
  currency?: string;
}
