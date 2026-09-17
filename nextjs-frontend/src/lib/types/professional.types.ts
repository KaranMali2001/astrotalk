export interface Professional {
  id: string;
  name: string;
  perMinuteRateChat: number;
  perMinuteRateCall: number;
  totalCallDuration: number;
  totalChats: number;
  rating: number | null;
  aboutMe: string | null;
  wallet?: Wallet;
}

export interface ProfessionalStats {
  totalSessions: number;
  totalMinutes: number;
  totalRewards: number;
}

export interface ActiveSession {
  id: string;
  professionalId: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  rewardAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sessionToken?: string;
}

export interface SessionHistoryItem {
  id: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number;
}

export interface Wallet {
  id: string;
  balance: number;
  bonus: number;
  totalBalence: number;
  currency: string;
}
