"use client";

import { ProtectedClient } from "@/components/features/auth/protected-client";
import { UserCallInterface } from "@/components/features/call/user/user-call-interface";
import { FullscreenCallInterface } from "@/components/features/call/fullscreen-call-interface";
import { PurpleBanner } from "@/components/features/dashboard/purple-banner";
import { DiscoverSection } from "@/components/features/dashboard/discover-section";
import { RecentCaretakers } from "@/components/features/dashboard/recent-caretakers";
import { CaretakerProfilePanel } from "@/components/features/caretaker/caretaker-profile-panel";
import { FeedbackDialog } from "@/components/features/feedback/feedback-dialog";
import { BottomNav } from "@/components/shared/layout/bottom-nav";
import { DashboardHeader } from "@/components/shared/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, callAPI } from "@/lib/api";
import { clearAuth, getRole } from "@/lib/auth";
import type { Professional, ProfessionalStats } from "@/lib/types";
import { User } from "@/lib/types/user.types";
import { useCallback, useEffect, useRef, useState } from "react";

function DashboardContent() {
  const role = getRole();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProfessional, setCurrentProfessional] = useState<Professional | null>(null);
  const [professionalStats, setProfessionalStats] = useState<ProfessionalStats | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState({
    user: true,
    professionals: true,
    professional: true,
    stats: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "open" | "closed" | "error">("idle");
  const [wsError, setWsError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [selectedCaretakerId, setSelectedCaretakerId] = useState<string | null>(null);
  const [currentCallProfessional, setCurrentCallProfessional] = useState<{ id: string; name: string } | null>(null);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [initiatingCallProfessional, setInitiatingCallProfessional] = useState<{ id: string; name: string } | null>(null);
  const [initiatingCallType, setInitiatingCallType] = useState<"CHAT" | "AUDIO_CALL" | "VIDEO_CALL" | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackCallId, setFeedbackCallId] = useState<string | null>(null);
  const [feedbackProfessionalName, setFeedbackProfessionalName] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get("/api/v1/user");
      setCurrentUser(response.data.data);
    } catch (err: any) {
      console.error("Error fetching user:", err);
      setError("Load failed");
    } finally {
      setIsLoading((prev) => ({ ...prev, user: false }));
    }
  }, []);

  const fetchCurrentProfessional = useCallback(async () => {
    if (role !== "professional") return;

    try {
      const response = await api.get("/api/v1/professional");
      console.log("Professional API response:", response.data);
      console.log("Professional data:", response.data.data?.prof || response.data.prof);
      setCurrentProfessional(response.data.data.prof || response.data.prof);
    } catch (err: any) {
      console.error("Error fetching professional:", err);
      setError("Load failed");
    } finally {
      setIsLoading((prev) => ({ ...prev, professional: false }));
    }
  }, [role]);

  const fetchProfessionalStats = useCallback(async () => {
    if (role !== "professional") return;

    try {
      const response = await api.get("/api/v1/professional/session/status");
      setProfessionalStats(response.data.data.stats || response.data.stats);
    } catch (err: any) {
      console.error("Error fetching professional stats:", err);
      setError("Load failed");
    } finally {
      setIsLoading((prev) => ({ ...prev, stats: false }));
    }
  }, [role]);

  const fetchProfessionals = useCallback(async (query?: string) => {
    if (role !== "user") return;

    try {
      setError(null);
      const response = await callAPI.browseOnline(query);
      const body: any = response.data;

      let professionalsData: Professional[] = [];
      if (Array.isArray(body)) {
        professionalsData = body as Professional[];
      } else if (Array.isArray(body?.data)) {
        professionalsData = body.data as Professional[];
      } else if (Array.isArray(body?.professionals)) {
        professionalsData = body.professionals as Professional[];
      }

      setProfessionals(professionalsData);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Load failed");
      console.error("Error fetching professionals:", err);
    } finally {
      setIsLoading((prev) => ({ ...prev, professionals: false }));
    }
  }, [role]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    fetchProfessionals(query);
  }, [fetchProfessionals]);

  useEffect(() => {
    if (role === "user") {
      fetchCurrentUser();
      fetchProfessionals();
    } else if (role === "professional") {
      fetchCurrentProfessional();
      fetchProfessionalStats();
    }
  }, [role, fetchProfessionals, fetchCurrentUser, fetchCurrentProfessional, fetchProfessionalStats]);

  const connectWs = useCallback((url: string) => {
    try {
      setWsStatus("connecting");
      setWsError(null);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("open");
      };
      ws.onmessage = (evt) => {
        setLastMessage(typeof evt.data === "string" ? evt.data : "[binary]");
      };
      ws.onerror = () => {
        setWsStatus("error");
        setWsError("Connection failed");
      };
      ws.onclose = () => {
        setWsStatus("closed");
      };
    } catch (e: any) {
      setWsStatus("error");
      setWsError("Failed to connect");
    }
  }, []);

  const handleCallEnd = useCallback((callId?: string, professionalName?: string) => {
    wsRef.current?.close();
    setWsUrl(null);
    setWsStatus("closed");
    setLastMessage(null);
    
    // Get professional name from current call or parameter
    const profName = professionalName || currentCallProfessional?.name;
    
    // Refresh professionals list
    fetchProfessionals(searchQuery);
    
    // Show feedback dialog if call ended successfully
    if (callId && profName) {
      setFeedbackCallId(callId);
      setFeedbackProfessionalName(profName);
      setShowFeedbackDialog(true);
    }
    
    // Clear current call professional
    setCurrentCallProfessional(null);
  }, [fetchProfessionals, searchQuery, currentCallProfessional]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  async function handleInitiate(professionalId: string, callType: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL") {
    setLoadingId(professionalId);
    try {
      let response;
      if (callType === "CHAT") {
        response = await callAPI.initiateChat(professionalId);
      } else if (callType === "VIDEO_CALL") {
        response = await callAPI.initiateVideoCall(professionalId);
      } else {
        response = await callAPI.initiateCall(professionalId);
      }
      const responseData: any = response.data;
      const url = responseData?.ws || responseData?.data?.ws;
      if (!url) {
        throw new Error("Missing WebSocket URL from server");
      }

      setWsUrl(url);
      connectWs(url);

      // For video calls, route to video call page with wsUrl in URL params
      if (callType === "VIDEO_CALL") {
        const params = new URLSearchParams({ wsUrl: url });
        window.location.href = `/video-call?${params.toString()}`;
        return;
      }

      await fetchProfessionals(); // Refresh the list after initiating a call
    } catch (e: any) {
      alert(e?.response?.data?.error || "Call failed");
      // Clear sessionStorage on error
      if (callType === "VIDEO_CALL") {
        sessionStorage.removeItem("activeCallWsUrl");
      }
    } finally {
      setLoadingId(null);
    }
  }

  if (role === "professional") {
    return (
      <main className="min-h-dvh p-6">
        <div className="max-w-3xl mx-auto grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Professional Dashboard</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your professional details</CardDescription>
            </CardHeader>
            <CardContent>
              {currentProfessional ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Call Rate:</span>
                    <span className="font-medium">₹{currentProfessional.perMinuteRateCall}/min</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Chat Rate:</span>
                    <span className="font-medium">₹{currentProfessional.perMinuteRateChat}/min</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total Calls:</span>
                    <span className="font-medium">{currentProfessional.totalCallDuration}s</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Rating:</span>
                    <span className="font-medium">{currentProfessional.rating ?? "—"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading profile information...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (role !== "user") {
    return (
      <main className="min-h-dvh p-6">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription className="text-pretty">
                You are logged in as <strong>{role}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  clearAuth();
                  window.location.href = "/user-login";
                }}
              >
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <DashboardHeader
        name={currentUser?.username || currentUser?.name || "User"}
        phoneNumber={currentUser?.phoneNumber}
        balance={currentUser?.wallet ? currentUser.wallet.totalBalence / 100 : undefined}
        wallet={currentUser?.wallet}
      />
      <main className="flex-1 overflow-y-auto pb-20">
        <PurpleBanner />
        <DiscoverSection 
          caretakers={professionals} 
          onCaretakerClick={(caretakerId) => setSelectedCaretakerId(caretakerId)}
          onSearch={handleSearch}
          searchQuery={searchQuery}
        />
        <RecentCaretakers
          onCaretakerClick={(caretakerId) => setSelectedCaretakerId(caretakerId)}
        />

        {/* Show initiating call screen immediately when call button is clicked (before API response) */}
        {isInitiatingCall && initiatingCallProfessional && (
          <FullscreenCallInterface
            professionalName={initiatingCallProfessional.name}
            callStatus="connecting"
            onCancel={() => {
              setIsInitiatingCall(false);
              setInitiatingCallProfessional(null);
              setInitiatingCallType(null);
              setWsUrl(null);
            }}
            callType={initiatingCallType || "AUDIO_CALL"}
          />
        )}
        
        {wsUrl && !isInitiatingCall && (
          <UserCallInterface 
            wsUrl={wsUrl} 
            onCallEnd={handleCallEnd}
            professionalName={currentCallProfessional?.name}
          />
        )}
      </main>
      <BottomNav />
      <CaretakerProfilePanel 
        caretakerId={selectedCaretakerId} 
        onClose={() => setSelectedCaretakerId(null)}
        onCallInitiateStart={(professionalName, callType) => {
          // Show full-screen interface immediately when call button is clicked
          setIsInitiatingCall(true);
          setInitiatingCallType(callType);
          if (selectedCaretakerId) {
            const prof = professionals.find(p => p.id === selectedCaretakerId);
            if (prof) {
              setInitiatingCallProfessional({ id: prof.id, name: professionalName });
            }
          }
        }}
        onCallInitiate={async (wsUrl, callType) => {
          // Store current professional info for feedback
          if (selectedCaretakerId) {
            const prof = professionals.find(p => p.id === selectedCaretakerId);
            if (prof) {
              setCurrentCallProfessional({ id: prof.id, name: prof.name });
            }
          }
          
          // Set wsUrl and connect - this will transition from initiating to waiting
          setWsUrl(wsUrl);
          connectWs(wsUrl);
          
          // Hide initiating state once wsUrl is set (UserCallInterface will handle the transition)
          setIsInitiatingCall(false);
          
          if (callType !== "VIDEO_CALL") {
            fetchProfessionals();
          }
        }}
      />
      {feedbackCallId && (
        <FeedbackDialog
          open={showFeedbackDialog}
          onOpenChange={(open) => {
            setShowFeedbackDialog(open);
            if (!open) {
              setFeedbackCallId(null);
              setFeedbackProfessionalName("");
            }
          }}
          callId={feedbackCallId}
          professionalName={feedbackProfessionalName}
          onSuccess={() => {
            fetchProfessionals(searchQuery);
          }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedClient>
      <DashboardContent />
    </ProtectedClient>
  );
}
