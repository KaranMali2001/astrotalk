"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { callAPI } from "@/lib/api";
import type { CallStatus } from "@/lib/types";
import { WebSocketEventType } from "@/lib/types";
import { extractDataFromWsUrl } from "@/lib/utils";
import { PhoneOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CallInterface } from "../shared/call-interface";
import { FullscreenCallInterface } from "../fullscreen-call-interface";

interface CallStartedData {
  agoraToken: string;
  channelId: string;
  callId: string;
}

interface UserCallInterfaceProps {
  wsUrl: string | null;
  onCallEnd?: (callId?: string, professionalName?: string) => void;
  professionalName?: string;
}

export function UserCallInterface({ wsUrl, onCallEnd, professionalName }: UserCallInterfaceProps) {
  const [callTokens, setCallTokens] = useState<CallStartedData | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("waiting");
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const router = useRouter();

  const { userId, callId, callType } = extractDataFromWsUrl(wsUrl);

  const { connected, send } = useWebSocket(wsUrl || undefined, {
    enabled: Boolean(wsUrl),
    onMessage: (data) => {
      console.log("[UserCall] WS message:", data);

      if (data.type === WebSocketEventType.CALL_STARTED && data.data) {
        setCallTokens(data.data);
        setCallStatus("started");
        toast.success("Call started - connecting to voice channel");
        console.log("User call started with Agora tokens:", data.data);
      } else if (data.type === WebSocketEventType.CALL_REJECTED && data.data) {
        setCallStatus("rejected");
        toast.error(`Call rejected: ${data.data.reason || "No reason provided"}`);
        onCallEnd?.();
      } else if (data.type === WebSocketEventType.CALL_ENDED && data.data) {
        setCallStatus("ended");
        const endedCallId = callTokens?.callId || callId;
        setCallTokens(null);
        toast.info("Call ended");
        onCallEnd?.(endedCallId, professionalName);
      }
    },
    onError: (e) => {
      console.log("[UserCall] WS error:", e);
      toast.error("Connection error occurred");
    },
    onClose: (ev) => {
      console.log("[UserCall] WS closed:", ev.code);
      if (callStatus === "started" || callStatus === "in_call") {
        setCallStatus("ended");
        const endedCallId = callTokens?.callId || callId;
        setCallTokens(null);
        toast.info("Call disconnected");
        onCallEnd?.(endedCallId, professionalName);
      }
    },
  });

  const handleCallEnd = useCallback(() => {
    const endedCallId = callTokens?.callId || callId;
    setCallTokens(null);
    setCallStatus("ended");
    if (send && callTokens) {
      send({
        type: "end_call",
        data: {
          callId: callTokens.callId,
          channelId: callTokens.channelId,
        },
      });
    }
    onCallEnd?.(endedCallId, professionalName);
  }, [send, callTokens, onCallEnd, callId, professionalName]);

  const handleCancelCall = useCallback(async () => {
    if (!callId) {
      toast.error("Call ID not available");
      return;
    }
    try {
      setIsCancelling(true);
      const response = await callAPI.cancelCall(callId);
      const action = response.data.data?.action || "cancelled";
      if (action === "cancelled") {
        toast.success("Call cancelled successfully");
      } else if (action === "ended") {
        toast.success("Call ended successfully");
      } else {
        toast.info("Call already processed");
      }
      const endedCallId = callId;
      setCallStatus("ended");
      setCallTokens(null);
      onCallEnd?.(endedCallId, professionalName);
    } catch (err: any) {
      console.error("Error cancelling call:", err);
      toast.error(err?.response?.data?.message || "Failed to cancel call");
    } finally {
      setIsCancelling(false);
    }
  }, [callId, onCallEnd]);

  useEffect(() => {
    if (wsUrl) {
      // Set status to waiting immediately when wsUrl is set
      setCallStatus("waiting");
      setCallTokens(null);
    } else {
      // Reset when wsUrl is cleared
      setCallStatus("ended");
      setCallTokens(null);
    }
  }, [wsUrl]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (callStatus === "waiting" || callStatus === "started" || callStatus === "in_call") {
        e.preventDefault();
        e.returnValue = "You are currently in a call. Leaving will disconnect the call.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [callStatus]);

  // Route to video call page if it's a video call
  useEffect(() => {
    if (callTokens && callType === "VIDEO_CALL") {
      // Pass call tokens as URL params to avoid losing them during navigation
      const params = new URLSearchParams({
        token: callTokens.agoraToken,
        channelId: callTokens.channelId,
        callId: callTokens.callId,
      });

      // Also pass wsUrl if available (for WebSocket connection to handle call events)
      if (wsUrl) {
        params.set("wsUrl", wsUrl);
      }

      router.push(`/video-call?${params.toString()}`);
    }
  }, [callTokens, callType, router, wsUrl]);

  if (!wsUrl) {
    return null;
  }

  // For video calls, route to video-call page (handled by useEffect above)
  if (callTokens && callType === "VIDEO_CALL") {
    return (
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm text-muted-foreground">Redirecting to video call...</span>
        </div>
      </div>
    );
  }

  // Show full-screen call interface immediately when wsUrl exists and call hasn't started yet
  if (wsUrl && !callTokens && callStatus !== "ended" && callStatus !== "rejected") {
    // Determine status: connecting if not connected yet, waiting if connected but no tokens
    const displayStatus = !connected ? "connecting" : (callStatus === "waiting" ? "waiting" : "ringing");
    
    return (
      <>
        <FullscreenCallInterface
          professionalName={professionalName}
          callStatus={displayStatus}
          onCancel={() => setShowCancelConfirm(true)}
          callType={callType}
        />
        <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Call?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to cancel this call? The professional will be notified.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Calling</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowCancelConfirm(false);
                  handleCancelCall();
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Cancel Call
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Show call interface when call is active
  if (callTokens && (callStatus === "started" || callStatus === "in_call")) {
    return <CallInterface token={callTokens.agoraToken} channelId={callTokens.channelId} callId={callTokens.callId} userId={userId || undefined} onCallEnd={handleCallEnd} />;
  }

  // Show ended/rejected state (shouldn't normally show, but just in case)
  if (callStatus === "ended" || callStatus === "rejected") {
    return null; // Let parent handle this
  }

  return null;
}
