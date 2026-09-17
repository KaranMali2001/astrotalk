import { useAuth } from "@/contexts/auth-context";

export function useAuthHook() {
  return useAuth();
}
