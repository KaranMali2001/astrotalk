"use client";

import { ProtectedClient } from "@/components/features/auth/protected-client";
import { VideoCallInterface } from "@/components/features/call/shared/video-call-interface";
import { ProfWebSocketProvider, useProfWebSocket } from "@/contexts/prof-websocket-context";
import { useWebSocket } from "@/hooks/use-websocket";
import { getRole } from "@/lib/auth";
import { WebSocketEventType } from "@/lib/types";
import { extractDataFromWsUrl, getUserIdFromAuth } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface CallTokens {
  agoraToken: string;
  channelId: string;
  callId: string;
}

function ProfessionalVideoCallContent() {
  const { callTokens, wsUrl, send: profSend } = useProfWebSocket();
  const router = useRouter();
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [isEndingCall, setIsEndingCall] = useState(false);

  // Extract professionalId from WebSocket URL token
  useEffect(() => {
    if (wsUrl) {
      const extracted = extractDataFromWsUrl(wsUrl);

      // For professionals, use professionalId from token (which is their own ID)
      if (extracted.professionalId) {
        setProfessionalId(extracted.professionalId);
      } else if (extracted.userId) {
        // Fallback: if professionalId not found but userId is present, it might be the professional's ID
        setProfessionalId(extracted.userId);
      }
    }
  }, [wsUrl]);

  // Add WebSocket hook to listen for CALL_ENDED events
  const { send } = useWebSocket(wsUrl || undefined, {
    enabled: Boolean(wsUrl), // Keep connection active throughout the call
    onMessage: (data) => {
      if (data.type === WebSocketEventType.CALL_ENDED && data.data) {
        setIsEndingCall(true);
        toast.info("Call ended");
        setTimeout(() => {
          router.push("/prof-dashboard");
        }, 1000);
      }
    },
  });

  const handleCallEnd = useCallback(() => {
    if (isEndingCall) {
      return;
    }
    setIsEndingCall(true);

    // Send WebSocket message FIRST (use profSend from context if available, otherwise use send from hook)
    const sendFunction = profSend || send;
    if (sendFunction && callTokens) {
      sendFunction({
        type: "end_call",
        data: {
          callId: callTokens.callId,
          channelId: callTokens.channelId,
        },
      });
    }

    // Small delay to ensure message is sent
    setTimeout(() => {
      router.push("/prof-dashboard");
    }, 100);
  }, [profSend, send, callTokens, router, isEndingCall]);

  if (!callTokens) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4 max-w-md px-4">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Preparing Video Call</h2>
            <p className="text-gray-300">Please wait while we connect you to the video call...</p>
            <p className="text-sm text-gray-400 mt-4">If you don't see the call interface soon, please return to your dashboard.</p>
          </div>
          <button onClick={() => router.push("/prof-dashboard")} className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!professionalId) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4 max-w-md px-4">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Configuration Error</h2>
            <p className="text-gray-300">Unable to identify professional ID. Please check your connection.</p>
            <p className="text-sm text-gray-400 mt-4">WebSocket URL: {wsUrl ? wsUrl.substring(0, 50) + "..." : "Not available"}</p>
          </div>
          <button onClick={() => router.push("/prof-dashboard")} className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  console.log("[ProfessionalVideoCallContent] Rendering VideoCallInterface with:", {
    callId: callTokens.callId,
    channelId: callTokens.channelId,
    professionalId,
    tokenLength: callTokens.agoraToken?.length,
  });

  return <VideoCallInterface token={callTokens.agoraToken} channelId={callTokens.channelId} callId={callTokens.callId} userId={professionalId} onCallEnd={handleCallEnd} />;
}

function UserVideoCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get call tokens from URL params
  const agoraTokenParam = searchParams.get("token");
  const channelIdParam = searchParams.get("channelId");
  const callIdParam = searchParams.get("callId");
  const wsUrlParam = searchParams.get("wsUrl");

  const [callTokens, setCallTokens] = useState<CallTokens | null>(
    agoraTokenParam && channelIdParam && callIdParam ? { agoraToken: agoraTokenParam, channelId: channelIdParam, callId: callIdParam } : null
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(wsUrlParam || null);
  const [status, setStatus] = useState<"loading" | "waiting" | "connected" | "error">(callTokens ? "connected" : wsUrlParam ? "waiting" : "error");
  const [isEndingCall, setIsEndingCall] = useState(false);

  // Get userId from auth token on mount
  useEffect(() => {
    const userIdFromAuth = getUserIdFromAuth();
    console.log("[UserVideoCallContent] User ID from auth:", userIdFromAuth);

    if (userIdFromAuth) {
      setUserId(userIdFromAuth);
    } else if (wsUrlParam || wsUrl) {
      // Fallback: extract from WebSocket URL if auth token doesn't have it
      const urlToCheck = wsUrlParam || wsUrl;
      if (urlToCheck) {
        const extracted = extractDataFromWsUrl(urlToCheck);
        if (extracted.userId) {
          setUserId(extracted.userId);
        }
      }
    }
  }, [wsUrlParam, wsUrl]);

  // If no wsUrl from URL params, try to get from sessionStorage (fallback for dashboard routing)
  useEffect(() => {
    if (!wsUrl && !callTokens) {
      const storedWsUrl = sessionStorage.getItem("activeCallWsUrl");
      if (storedWsUrl) {
        setWsUrl(storedWsUrl);
        setStatus("waiting");

        // Extract userId from WebSocket URL
        const extracted = extractDataFromWsUrl(storedWsUrl);
        if (extracted.userId && !userId) {
          setUserId(extracted.userId);
        }
      }
    }
  }, [userId]);

  const { connected, send } = useWebSocket(wsUrl || undefined, {
    enabled: Boolean(wsUrl), // Keep connection active throughout the call to send end_call message
    onMessage: (data) => {
      if (data.type === WebSocketEventType.CALL_STARTED && data.data) {
        const tokens = data.data as CallTokens;
        setCallTokens(tokens);
        setStatus("connected");
        toast.success("Video call started - connecting...");
      } else if (data.type === WebSocketEventType.CALL_REJECTED && data.data) {
        setStatus("error");
        toast.error(`Call rejected: ${data.data.reason || "No reason provided"}`);
        setTimeout(() => router.push("/dashboard"), 2000);
      } else if (data.type === WebSocketEventType.CALL_ENDED && data.data) {
        // Other party ended the call - trigger VideoCallInterface to leave
        setIsEndingCall(true);
        toast.info("Call ended by other party");
        // VideoCallInterface will handle leaving via onCallEnd callback
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      }
    },
    onError: (e) => {
      // Don't set error status immediately - keep showing loading if we're waiting for tokens
      // Only show error if we already have tokens (call was active)
      if (callTokens) {
        setStatus("error");
        toast.error("Connection error occurred");
      }
    },
    onClose: (ev) => {
      // Only set error if we had tokens (call was active)
      // If we don't have tokens yet, keep showing loading (professional might reconnect)
      if (callTokens) {
        setStatus("error");
        toast.info("Call disconnected");
        setTimeout(() => router.push("/dashboard"), 2000);
      }
    },
  });

  const handleCallEnd = useCallback(() => {
    if (isEndingCall) {
      return; // Prevent duplicate calls
    }
    setIsEndingCall(true);

    // Send WebSocket message FIRST (matching audio call pattern)
    if (send && callTokens) {
      send({
        type: "end_call",
        data: {
          callId: callTokens.callId,
          channelId: callTokens.channelId,
        },
      });
    }

    // Small delay to ensure message is sent, then navigate
    setTimeout(() => {
      router.push("/dashboard");
    }, 100);
  }, [send, callTokens, router, isEndingCall]);

  // Show loading/waiting state if tokens not received yet (waiting for professional to accept)
  // Priority: Show loading if we have wsUrl, even if status is temporarily "error"
  if (!callTokens && wsUrl) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4 max-w-md px-4">
          <div className="relative">
            <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Waiting for Professional</h2>
            <p className="text-gray-300">Please wait while we connect you to the professional...</p>
            {!connected && (
              <p className="text-sm text-gray-400 mt-2">
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
                Establishing connection...
              </p>
            )}
            {connected && (
              <p className="text-sm text-green-400 mt-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Connected - waiting for professional to accept your call...
              </p>
            )}
          </div>
          <button onClick={() => router.push("/dashboard")} className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
            Cancel & Return
          </button>
        </div>
      </div>
    );
  }

  // Show error only if we have no wsUrl and no tokens (truly no connection possible)
  if (status === "error" && !wsUrl && !callTokens) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4 max-w-md px-4">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Unable to Connect</h2>
            <p className="text-gray-300">We couldn't establish the video call connection.</p>
            <p className="text-sm text-gray-400 mt-4">User ID: {userId || "Not available"}</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show loading if no userId yet
  if (!userId) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto"></div>
          <div className="text-xl font-semibold">Loading User ID...</div>
          <p className="text-sm text-gray-400">Please wait while we identify your account</p>
        </div>
      </div>
    );
  }

  if (!callTokens) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4 max-w-md px-4">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Preparing Video Call</h2>
            <p className="text-gray-300">Please wait while we connect you to the video call...</p>
          </div>
        </div>
      </div>
    );
  }

  return <VideoCallInterface token={callTokens.agoraToken} channelId={callTokens.channelId} callId={callTokens.callId} userId={userId} onCallEnd={handleCallEnd} />;
}

function VideoCallPageContent() {
  const role = getRole();

  if (role === "professional") {
    return (
      <ProfWebSocketProvider>
        <ProfessionalVideoCallContent />
      </ProfWebSocketProvider>
    );
  }

  return <UserVideoCallContent />;
}

export default function VideoCallPage() {
  return (
    <ProtectedClient>
      <VideoCallPageContent />
    </ProtectedClient>
  );
}
