import { useProfessional } from "@/contexts/professional-context";
import { professionalAPI } from "@/lib/api";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useSession() {
  const professionalContext = useProfessional();
  const [toggling, setToggling] = useState(false);

  const toggleSession = useCallback(async () => {
    try {
      setToggling(true);
      await professionalAPI.toggleSession();
      await professionalContext.refreshSessionStatus();
      toast.success("Session toggled successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to toggle session");
      throw err;
    } finally {
      setToggling(false);
    }
  }, [professionalContext]);

  return {
    ...professionalContext,
    toggling,
    toggleSession,
  };
}
