"use client";

import { IncomingCallNotification } from "@/components/features/call/professional/incoming-call-notification";
import { CallInterface } from "@/components/features/call/shared/call-interface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProfWebSocket } from "@/contexts/prof-websocket-context";
import { professionalAPI } from "@/lib/api";
import type { ActiveSession, SessionHistoryItem } from "@/lib/types";
import { extractDataFromWsUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function SessionControls() {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [stats, setStats] = useState<{
    totalSessions: number;
    totalMinutes: number;
    totalRewards: number;
  } | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState({
    status: true,
    history: true,
    toggling: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [acceptingCall, setAcceptingCall] = useState(false);
  const [currentCallType, setCurrentCallType] = useState<"CHAT" | "AUDIO_CALL" | "VIDEO_CALL" | null>(null);
  const router = useRouter();

  const { wsUrl, connected, send, incomingCall, callTokens, setIncomingCall, setCallTokens, refreshSessionStatus } = useProfWebSocket();

  const { userId: professionalId } = extractDataFromWsUrl(wsUrl);
  console.log("incomingCall", incomingCall?.callId, incomingCall?.agoraChannelId);

  // Update currentCallType when incoming call arrives
  useEffect(() => {
    if (incomingCall?.callType) {
      setCurrentCallType(incomingCall.callType);
    }
  }, [incomingCall?.callType]);

  const handleAcceptCall = useCallback(
    (callId: string, userId: string) => {
      if (send && !acceptingCall) {
        setAcceptingCall(true);
        const acceptMessage = {
          type: "accept_call",
          data: {
            callId,
            userId,
          },
        };
        send(acceptMessage);
        console.log("Sent accept_call message:", acceptMessage);
        setIncomingCall(null);
        setTimeout(() => {
          setAcceptingCall(false);
        }, 15000);
      }
    },
    [send, acceptingCall, setIncomingCall]
  );

  const handleDeclineCall = useCallback(
    (callId: string, reason?: string) => {
      if (send) {
        const rejectMessage = {
          type: "reject_call" as const,
          data: {
            callId,
            userId: incomingCall?.userId || "",
            reason,
          },
        };
        send(rejectMessage);
        console.log("Call declined:", { callId, reason });
      }
      setIncomingCall(null);
    },
    [send, incomingCall?.userId, setIncomingCall]
  );

  const handleHideNotification = useCallback(() => {
    setIncomingCall(null);
    console.log("Manually hid incoming call notification");
  }, [setIncomingCall]);

  const fetchSessionStatus = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, status: true }));
      const response = await professionalAPI.getSessionStatus();
      if (response.data.success && response.data.data) {
        const previousActiveState = activeSession?.isActive;
        setActiveSession(response.data.data.activeSession);
        setStats(response.data.data.stats);
        const isNowActive = response.data.data.activeSession?.isActive;
        if (previousActiveState === undefined || previousActiveState !== isNowActive) {
          await refreshSessionStatus();
        }
      }
    } catch (err) {
      setError("Fetch failed");
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, status: false }));
    }
  }, [refreshSessionStatus, activeSession?.isActive]);

  const fetchSessionHistory = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, history: true }));
      const response = await professionalAPI.getSessionHistory();
      setHistory(response.data);
    } catch (err) {
      setError("Fetch failed");
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, history: false }));
    }
  }, []);

  useEffect(() => {
    fetchSessionStatus();
    fetchSessionHistory();
  }, []);

  const onToggle = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, toggling: true }));
      await professionalAPI.toggleSession();
      await refreshSessionStatus();
      await Promise.all([fetchSessionStatus(), fetchSessionHistory()]);
    } catch (err) {
      console.error("Failed to toggle session:", err);
      setError("Toggle failed");
      await fetchSessionStatus();
    } finally {
      setLoading((prev) => ({ ...prev, toggling: false }));
    }
  }, [refreshSessionStatus, fetchSessionStatus, fetchSessionHistory]);

  const handleToggle = useCallback(
    (checked: boolean) => {
      onToggle();
    },
    [onToggle]
  );

  const isActive = activeSession?.isActive ?? false;
  const wsInfo = useMemo(() => (wsUrl ? (connected ? "Connected" : "Connecting...") : "Not connected"), [wsUrl, connected]);

  // Route to video call page if it's a video call
  useEffect(() => {
    if (callTokens && currentCallType === "VIDEO_CALL") {
      // Pass call tokens as URL params to avoid losing them during navigation
      const params = new URLSearchParams({
        token: callTokens.agoraToken,
        channelId: callTokens.channelId,
        callId: callTokens.callId,
      });
      router.push(`/prof-video-call?${params.toString()}`);
    }
  }, [callTokens, currentCallType, router]);

  const handleCallEnd = () => {
    console.log("CALL ENDED by professional");
    setCallTokens(null);
    setCurrentCallType(null);
    if (send && callTokens) {
      send({
        type: "end_call",
        data: {
          callId: callTokens.callId,
          channelId: callTokens.channelId,
        },
      });
    }
  };

  console.log("SessionControls render - incomingCall:", incomingCall);
  console.log("SessionControls render - isVisible:", !!incomingCall);

  if (loading.status || loading.history) {
    return <div>Loading session data...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <>
      <IncomingCallNotification callData={incomingCall} onAccept={handleAcceptCall} onDecline={handleDeclineCall} onHide={handleHideNotification} isVisible={!!incomingCall} />

      {callTokens && currentCallType !== "VIDEO_CALL" ? (
        <CallInterface token={callTokens.agoraToken} channelId={callTokens.channelId} callId={callTokens.callId} userId={professionalId || undefined} onCallEnd={handleCallEnd} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Session Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {acceptingCall && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-blue-700">Accepting call...</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Label htmlFor="session-toggle" className="text-base font-medium cursor-pointer">
                    Session Status
                  </Label>
                  <Switch id="session-toggle" checked={isActive} onCheckedChange={handleToggle} disabled={loading.toggling} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-gray-700">{isActive ? <span className="text-green-600">● Active</span> : <span className="text-gray-500">○ Inactive</span>}</p>
                  <p className="text-xs text-muted-foreground">WebSocket: {wsInfo}</p>
                  {activeSession && isActive && <p className="text-xs text-muted-foreground">Started: {new Date(activeSession.startTime).toLocaleString()}</p>}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Session History</h3>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No session history available</p>
              ) : (
                <div className="space-y-2">
                  {history.length > 0 &&
                    history.map((item) => (
                      <div key={item.id} className="text-sm p-2 border rounded">
                        <p>Session ID: {item.id}</p>
                        <p>Duration: {item.durationSeconds || 0} seconds</p>
                        <p className="text-xs text-muted-foreground">
                          {item.startedAt && `Started: ${new Date(item.startedAt).toLocaleString()}`}
                          {item.endedAt && ` • Ended: ${new Date(item.endedAt).toLocaleString()}`}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
