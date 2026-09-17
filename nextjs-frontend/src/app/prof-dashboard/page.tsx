"use client";

import { PendingCallsList } from "@/components/features/call/professional/pending-calls-list";
import { SessionControls } from "@/components/features/session/session-control";
import { BottomNav } from "@/components/shared/layout/bottom-nav";
import { DashboardHeader } from "@/components/shared/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfWebSocketProvider } from "@/contexts/prof-websocket-context";
import { professionalAPI } from "@/lib/api";
import { clearAuth } from "@/lib/auth";
import type { Professional, ProfessionalStats } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export default function HomePage() {
  const [currentProfessional, setCurrentProfessional] = useState<Professional | null>(null);
  const [professionalStats, setProfessionalStats] = useState<ProfessionalStats | null>(null);
  const [isLoading, setIsLoading] = useState({
    professional: true,
    stats: true,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentProfessional = useCallback(async () => {
    try {
      const response = await professionalAPI.getCurrentProfessional();
      console.log("Professional API response:", response.data);
      setCurrentProfessional(response.data.data.prof || response.data.prof);
    } catch (err: any) {
      console.error("Error fetching professional:", err);
      setError("Failed to load professional data");
    } finally {
      setIsLoading((prev) => ({ ...prev, professional: false }));
    }
  }, []);

  const fetchProfessionalStats = useCallback(async () => {
    try {
      const response = await professionalAPI.getSessionStatus();
      setProfessionalStats(response.data.data.stats);
    } catch (err: any) {
      console.error("Error fetching professional stats:", err);
      setError("Failed to load stats");
    } finally {
      setIsLoading((prev) => ({ ...prev, stats: false }));
    }
  }, []);

  useEffect(() => {
    fetchCurrentProfessional();
    fetchProfessionalStats();
  }, [fetchCurrentProfessional, fetchProfessionalStats]);

  return (
    <ProfWebSocketProvider>
      <div className="min-h-dvh flex flex-col bg-white">
        <DashboardHeader name={currentProfessional?.name} balance={currentProfessional?.wallet ? currentProfessional.wallet.totalBalence / 100 : undefined} wallet={currentProfessional?.wallet} />
        <main className="flex-1 overflow-y-auto pb-20 p-6">
          <div className="mx-auto max-w-3xl flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Professional Console</CardTitle>
                <CardDescription className="text-pretty">Welcome back, {currentProfessional?.name || "Professional"}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    clearAuth();
                    window.location.href = "/professional-login";
                  }}
                >
                  Logout
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Wallet & Earnings</CardTitle>
                <CardDescription>Your current balance and earnings overview</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading.professional ? (
                  <p className="text-sm text-muted-foreground">Loading wallet...</p>
                ) : currentProfessional?.wallet ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Available Balance</p>
                      <p className="text-2xl font-bold">₹{(currentProfessional.wallet.balance / 100).toFixed(2)}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Bonus Balance</p>
                      <p className="text-2xl font-bold">₹{(currentProfessional.wallet.bonus / 100).toFixed(2)}</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-primary/5">
                      <p className="text-sm text-muted-foreground">Total Balance</p>
                      <p className="text-2xl font-bold text-primary">₹{(currentProfessional.wallet.totalBalence / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Wallet information not available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Statistics</CardTitle>
                <CardDescription>Your performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading.stats ? (
                  <p className="text-sm text-muted-foreground">Loading statistics...</p>
                ) : professionalStats ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Sessions</p>
                      <p className="text-2xl font-bold">{professionalStats.totalSessions}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Minutes</p>
                      <p className="text-2xl font-bold">{professionalStats.totalMinutes}</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-green-50">
                      <p className="text-sm text-muted-foreground">Total Rewards</p>
                      <p className="text-2xl font-bold text-green-600">₹{(professionalStats.totalRewards / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Statistics not available</p>
                )}
              </CardContent>
            </Card>
            <SessionControls />
            <PendingCallsList />
          </div>
        </main>
        <BottomNav />
      </div>
    </ProfWebSocketProvider>
  );
}
