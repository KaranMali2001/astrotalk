// src/config/money.config.ts

/**
 * Money handling configuration
 * Always store amounts in smallest currency unit (paise, cents, etc.)
 * Example: 1 INR = 100 paise, so multiplier = 100
 * Here, we're using 1e5 as requested.
 */
export const MONEY = {
  SCALE: 1e2, // multiplier for internal storage
  DEFAULT_CURRENCY: 'INR',
} as const;

/**
 * Converts from display amount (float) → stored amount (integer)
 */
export const toStoredAmount = (displayAmount: number): number => {
  return Math.round(displayAmount * MONEY.SCALE);
};

/**
 * Converts from stored amount (integer) → display amount (float)
 */
export const toDisplayAmount = (storedAmount: number): number => {
  return storedAmount / MONEY.SCALE;
};
