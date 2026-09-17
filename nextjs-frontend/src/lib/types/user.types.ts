export interface User {
  id: string;
  username: string;
  phoneNumber: string;
  wallet: Wallet;
}

export interface Wallet {
  id: string;
  balance: number;
  bonus: number;
  totalBalence: number;
  currency: string;
}
