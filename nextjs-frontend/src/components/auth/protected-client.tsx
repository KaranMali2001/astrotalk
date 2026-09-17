"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { getRole, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

export function ProtectedClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token || !role) {
      router.replace("/user-login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
