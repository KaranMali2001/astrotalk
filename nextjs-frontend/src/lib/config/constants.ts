// Call state constants matching backend database enum
// Reference: API/prisma/schema/enum.prisma
export const CallState = {
  CALL_INITIATED: "CALL_INITIATED", // when user initiates call
  CALL_START: "CALL_START", // when professional accepts (database state)
  CALL_END: "CALL_END",
  CALL_CANCELLED: "CALL_CANCELLED",
  CALL_REJECTED: "CALL_REJECTED",
  CHAT_REJECTED: "CHAT_REJECTED",
  CHAT_CANCELLED: "CHAT_CANCELLED",
  BILLING_PROCESSED: "BILLING_PROCESSED",
} as const;

// Timer configuration
export const CALL_ACCEPTANCE_TIMEOUT_SECONDS = 30;
