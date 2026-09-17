"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { callAPI } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type AgoraClient = any;
type AgoraRemoteUser = any;
type MicrophoneAudioTrack = any;

interface CallInterfaceProps {
  token: string;
  channelId: string;
  callId: string;
  userId?: string;
  onCallEnd?: () => void;
}

export function CallInterface({ token, channelId, callId, userId, onCallEnd }: CallInterfaceProps) {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;

  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<AgoraRemoteUser[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [connectionState, setConnectionState] = useState<string>("DISCONNECTED");
  const [clientReady, setClientReady] = useState(false);
  const [showCallEndedDialog, setShowCallEndedDialog] = useState(false);
  const [showEndCallConfirm, setShowEndCallConfirm] = useState(false);

  const clientRef = useRef<AgoraClient | null>(null);
  const localAudioTrackRef = useRef<MicrophoneAudioTrack | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAttemptedJoinRef = useRef(false);
  const onCallEndRef = useRef(onCallEnd);

  // Generate deterministic UID from userId (same as backend)
  const generateDeterministicUid = useCallback((userId: string): number => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const uid = Math.abs(hash) % 2147483647;
    return uid === 0 ? 1 : uid;
  }, []);

  const initializeAgora = useCallback(async () => {
    if (!appId) {
      toast.error("Agora App ID not configured");
      return;
    }

    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") {
          const remoteAudioTrack = user.audioTrack;
          if (remoteAudioTrack && !isSpeakerOff) {
            remoteAudioTrack.play();
          }
        }
        setRemoteUsers((prev) => [...prev.filter((u) => u.uid !== user.uid), user]);
      });

      client.on("user-unpublished", (user, mediaType) => {
        console.log("User unpublished:", user.uid, mediaType);
        if (mediaType === "audio") {
          const remoteAudioTrack = user.audioTrack;
          remoteAudioTrack?.stop();
        }
      });

      client.on("user-left", (user) => {
        console.log("User left:", user.uid);
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        toast.info("The other participant left the call");
      });

      client.on("connection-state-change", (curState, prevState) => {
        console.log("[CallInterface] Connection state changed:", prevState, "->", curState);
        setConnectionState(curState);

        if (curState === "CONNECTED") {
          console.log("[CallInterface] Now connected to Agora room");
          setIsJoined(true);
          if (!callStartTimeRef.current) {
            startCallTimer();
          }
        } else if (curState === "DISCONNECTED" || curState === "DISCONNECTING") {
          console.log("[CallInterface] Disconnected from Agora room");
          setIsJoined(false);
          stopCallTimer();
          if (curState === "DISCONNECTED") {
            setConnectionState("DISCONNECTED");
            if (prevState === "CONNECTED") {
              setShowCallEndedDialog(true);
              setTimeout(() => {
                onCallEndRef.current?.();
              }, 100);
            }
          }
        } else if (curState === "CONNECTING" || curState === "RECONNECTING") {
          console.log("[CallInterface] Connecting to Agora room...");
          setConnectionState(curState);
        }
      });
      setClientReady(true);
    } catch (error) {
      console.error("Error initializing Agora:", error);
      toast.error("Init failed");
    }
  }, [appId, isSpeakerOff]);

  const startCallTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallDuration(elapsed);
      }
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const leaveCall = useCallback(async () => {
    if (!callId) {
      console.error("Call ID is missing, cannot end call via API");
      toast.error("Call ID not available");
      // Still try to leave Agora room
    }

    setLoading(true);
    try {
      // First, call the API to end the call
      if (callId) {
        try {
          console.log("Calling end call API with callId:", callId);
          const response = await callAPI.cancelCall(callId);
          const action = response.data.data?.action || "ended";
          console.log("Call ended via API:", action);
          toast.success("Call ended successfully");
        } catch (apiError: any) {
          console.error("Error calling end call API:", apiError);
          const errorMessage = apiError?.response?.data?.error || apiError?.message || "Failed to end call via API";
          console.error("API Error details:", {
            status: apiError?.response?.status,
            data: apiError?.response?.data,
            message: errorMessage,
          });
          // Show error but continue with leaving Agora
          toast.error(errorMessage);
        }
      }

      // Then leave the Agora room
      try {
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
        }
        if (clientRef.current) {
          await clientRef.current.leave();
        }
      } catch (agoraError) {
        console.error("Error leaving Agora room:", agoraError);
      }

      setIsJoined(false);
      setRemoteUsers([]);
      stopCallTimer();
      setShowCallEndedDialog(true);
      setTimeout(() => {
        onCallEnd?.();
      }, 100);
    } catch (error) {
      console.error("Error leaving call:", error);
      toast.error("Error leaving call");
      setShowCallEndedDialog(true);
    } finally {
      setLoading(false);
    }
  }, [stopCallTimer, onCallEnd, callId]);

  const toggleMute = useCallback(async () => {
    if (!localAudioTrackRef.current) return;
    try {
      const newMuteState = !isMuted;
      await localAudioTrackRef.current.setEnabled(!newMuteState);
      setIsMuted(newMuteState);
      toast.success(newMuteState ? "Microphone muted" : "Microphone unmuted");
    } catch (error) {
      console.error("Error toggling mute:", error);
      toast.error("Mute failed");
    }
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    const newSpeakerState = !isSpeakerOff;
    setIsSpeakerOff(newSpeakerState);
    remoteUsers.forEach((user) => {
      if (user.audioTrack) {
        if (newSpeakerState) {
          user.audioTrack.stop();
        } else {
          user.audioTrack.play();
        }
      }
    });
    toast.success(newSpeakerState ? "Speaker muted" : "Speaker unmuted");
  }, [isSpeakerOff, remoteUsers]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    onCallEndRef.current = onCallEnd;
  }, [onCallEnd]);

  useEffect(() => {
    if (isClient) {
      initializeAgora();
    }
    return () => {
      stopCallTimer();
      setClientReady(false);
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      }
      if (clientRef.current) {
        clientRef.current.leave();
      }
    };
  }, [initializeAgora, stopCallTimer, isClient]);

  useEffect(() => {
    if (clientReady && clientRef.current && appId && token && channelId && userId && !isJoined && !loading && !hasAttemptedJoinRef.current) {
      hasAttemptedJoinRef.current = true;

      const performJoin = async () => {
        if (!clientRef.current || !appId || !token || !userId) {
          hasAttemptedJoinRef.current = false;
          return;
        }
        setLoading(true);
        try {
          const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
          const uid = generateDeterministicUid(userId);

          setConnectionState("CONNECTING");
          await clientRef.current.join(appId, channelId, token, uid);
          const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          localAudioTrackRef.current = localAudioTrack;
          await clientRef.current.publish([localAudioTrack]);
          setIsJoined(true);
          setConnectionState("CONNECTED");
          if (!callStartTimeRef.current) {
            startCallTimer();
          }
          toast.success("Joined call successfully");
        } catch (error) {
          toast.error("Auto-join failed");
          setConnectionState("DISCONNECTED");
          hasAttemptedJoinRef.current = false;
        } finally {
          setLoading(false);
        }
      };
      setTimeout(() => {
        performJoin();
      }, 100);
    }
  }, [clientReady, appId, token, channelId, userId, isJoined, loading, generateDeterministicUid, startCallTimer, callId]);

  useEffect(() => {
    hasAttemptedJoinRef.current = false;
  }, [token, channelId]);

  if (!isClient) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[var(--purple-primary)] via-purple-600 to-purple-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto bg-white">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <div className="mt-2 text-sm text-white">Initializing call interface...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appId) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[var(--purple-primary)] via-purple-600 to-purple-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto bg-white">
          <CardContent className="pt-6">
            <div className="text-center text-red-500">Agora App ID not configured. Please add NEXT_PUBLIC_AGORA_APP_ID to your environment variables.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[var(--purple-primary)] via-purple-600 to-purple-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto bg-white">
          <CardContent className="pt-6">
            <div className="text-center text-red-500">User ID not available. Cannot generate consistent Agora UID.</div>
            <div className="text-center text-xs text-gray-500 mt-2">Check console for details</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[var(--purple-primary)] via-purple-600 to-purple-800 flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-md bg-white">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Phone className="w-5 h-5" />
              Voice Call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
          <div className="text-center">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                connectionState === "CONNECTED"
                  ? "bg-green-100 text-green-700"
                  : connectionState === "CONNECTING" || connectionState === "RECONNECTING"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionState === "CONNECTED" ? "bg-green-500" : connectionState === "CONNECTING" || connectionState === "RECONNECTING" ? "bg-yellow-500 animate-pulse" : "bg-gray-400"
                }`}
              />
              {connectionState === "CONNECTED"
                ? "Connected"
                : connectionState === "CONNECTING"
                ? "Connecting..."
                : connectionState === "RECONNECTING"
                ? "Reconnecting..."
                : connectionState === "DISCONNECTING"
                ? "Disconnecting..."
                : "Not Connected"}
            </div>
            {isJoined && <div className="mt-2 text-lg font-mono">{formatTime(callDuration)}</div>}
          </div>
          {remoteUsers.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              {remoteUsers.length} participant{remoteUsers.length > 1 ? "s" : ""} in call
            </div>
          )}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Call ID: {callId.substring(0, 8)}...</div>
            <div>Channel: {channelId.substring(0, 20)}...</div>
          </div>
          <div className="flex justify-center gap-3">
            {loading && !isJoined && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span>Joining call...</span>
              </div>
            )}
            <Button onClick={toggleMute} variant={isMuted ? "destructive" : "outline"} size="lg" disabled={!isJoined || loading}>
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button onClick={toggleSpeaker} variant={isSpeakerOff ? "destructive" : "outline"} size="lg" disabled={!isJoined || loading}>
              {isSpeakerOff ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Button onClick={() => setShowEndCallConfirm(true)} variant="destructive" size="lg" disabled={loading}>
              {loading ? (
                <>Leaving...</>
              ) : (
                <>
                  <PhoneOff className="w-5 h-5 mr-2" />
                  End Call
                </>
              )}
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
      
      {/* AlertDialog and Dialog moved outside the main container to prevent z-index conflicts */}
      <AlertDialog open={showEndCallConfirm} onOpenChange={setShowEndCallConfirm}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>End Call?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to end this call? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowEndCallConfirm(false);
                leaveCall();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              End Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={showCallEndedDialog} onOpenChange={setShowCallEndedDialog}>
        <DialogContent showCloseButton={true} className="z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <PhoneOff className="w-5 h-5 text-red-500" />
              Call Ended
            </DialogTitle>
            <DialogDescription className="text-center pt-2">The call has been disconnected successfully.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={() => setShowCallEndedDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
