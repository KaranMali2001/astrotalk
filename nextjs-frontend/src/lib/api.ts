// Legacy API file - re-exports from new structure for backward compatibility
// TODO: Update all imports to use lib/api/* directly

export { authAPI } from "./api/auth.api";
export { callAPI } from "./api/call.api";
export { api, api as default } from "./api/client";
export { feedbackAPI } from "./api/feedback.api";
export { professionalAPI } from "./api/professional.api";
export { userAPI } from "./api/user.api";
export { walletAPI } from "./api/wallet.api";
export { baseURL, wsBaseURL } from "./config/env";
