import { useAuth } from "@/contexts/auth-context";
import { useProfessional } from "@/contexts/professional-context";
import { useUser } from "@/contexts/user-context";

export function useWallet() {
  const { role } = useAuth();
  const userContext = useUser();
  const professionalContext = useProfessional();

  if (role === "professional") {
    return {
      wallet: professionalContext.professional?.wallet,
      loading: professionalContext.loading.professional,
    };
  }

  return {
    wallet: userContext.user?.wallet,
    loading: userContext.loading,
  };
}
