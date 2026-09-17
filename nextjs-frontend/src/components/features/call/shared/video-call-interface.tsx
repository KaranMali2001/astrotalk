"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatTime } from "@/lib/utils";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type AgoraClient = any;
type AgoraRemoteUser = any;
type MicrophoneAudioTrack = any;
type CameraVideoTrack = any;

interface VideoCallInterfaceProps {
  token: string;
  channelId: string;
  callId: string;
  userId?: string;
  onCallEnd?: () => void;
}

export function VideoCallInterface({ token, channelId, callId, userId, onCallEnd }: VideoCallInterfaceProps) {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;

  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
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
  const localVideoTrackRef = useRef<CameraVideoTrack | null>(null);
  const localVideoContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);
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
        if (mediaType === "video") {
          const remoteVideoTrack = user.videoTrack;
          if (remoteVideoTrack && remoteVideoContainerRef.current) {
            remoteVideoTrack.play(remoteVideoContainerRef.current);
          }
        }
        if (mediaType === "audio") {
          const remoteAudioTrack = user.audioTrack;
          if (remoteAudioTrack) {
            remoteAudioTrack.play();
          }
        }
        setRemoteUsers((prev) => [...prev.filter((u) => u.uid !== user.uid), user]);
      });

      client.on("user-unpublished", (user, mediaType) => {
        console.log("User unpublished:", user.uid, mediaType);
        if (mediaType === "video") {
          const remoteVideoTrack = user.videoTrack;
          remoteVideoTrack?.stop();
        }
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
        console.log("[VideoCallInterface] Connection state changed:", prevState, "->", curState);
        setConnectionState(curState);

        if (curState === "CONNECTED") {
          console.log("[VideoCallInterface] Now connected to Agora room");
          setIsJoined(true);
          if (!callStartTimeRef.current) {
            startCallTimer();
          }
        } else if (curState === "DISCONNECTED" || curState === "DISCONNECTING") {
          console.log("[VideoCallInterface] Disconnected from Agora room");
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
          console.log("[VideoCallInterface] Connecting to Agora room...");
          setConnectionState(curState);
        }
      });
      setClientReady(true);
    } catch (error) {
      console.error("Error initializing Agora:", error);
      toast.error("Init failed");
    }
  }, [appId]);

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
    setLoading(true);
    try {
      // Call onCallEnd FIRST (parent will send WebSocket message)
      onCallEnd?.();

      // Then leave Agora channel
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
      if (clientRef.current) {
        await clientRef.current.leave();
      }
      setIsJoined(false);
      setRemoteUsers([]);
      stopCallTimer();
      setShowCallEndedDialog(true);
    } catch (error) {
      console.error("Error leaving call:", error);
      toast.error("Error leaving call");
      setShowCallEndedDialog(true);
    } finally {
      setLoading(false);
    }
  }, [stopCallTimer, onCallEnd]);

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

  const toggleVideo = useCallback(async () => {
    if (!localVideoTrackRef.current) return;
    try {
      const newVideoState = !isVideoOff;
      await localVideoTrackRef.current.setEnabled(!newVideoState);
      setIsVideoOff(newVideoState);
      toast.success(newVideoState ? "Camera turned off" : "Camera turned on");
    } catch (error) {
      console.error("Error toggling video:", error);
      toast.error("Video toggle failed");
    }
  }, [isVideoOff]);

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
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
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

          // Create both audio and video tracks
          const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          const localVideoTrack = await AgoraRTC.createCameraVideoTrack();

          localAudioTrackRef.current = localAudioTrack;
          localVideoTrackRef.current = localVideoTrack;

          // Play local video in the container
          if (localVideoContainerRef.current) {
            localVideoTrack.play(localVideoContainerRef.current);
          }

          // Publish both tracks
          await clientRef.current.publish([localAudioTrack, localVideoTrack]);
          setIsJoined(true);
          setConnectionState("CONNECTED");
          if (!callStartTimeRef.current) {
            startCallTimer();
          }
          toast.success("Joined video call successfully");
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
  }, [clientReady, appId, token, channelId, userId, isJoined, loading, generateDeterministicUid, startCallTimer]);

  useEffect(() => {
    hasAttemptedJoinRef.current = false;
  }, [token, channelId]);

  if (!isClient) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <div className="mt-2 text-sm text-white">Initializing video call...</div>
        </div>
      </div>
    );
  }

  if (!appId) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-red-500">Agora App ID not configured. Please add NEXT_PUBLIC_AGORA_APP_ID to your environment variables.</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4 max-w-md px-4">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-red-500">User ID Not Available</h2>
            <p className="text-gray-300">Cannot generate consistent Agora UID without user ID.</p>
            <p className="text-xs text-gray-400 mt-2">Check browser console for detailed error information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Remote Video - Full Screen */}
      <div ref={remoteVideoContainerRef} className="flex-1 w-full h-full relative">
        {loading && !isJoined && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
              <div className="mt-2 text-sm text-white">Connecting...</div>
            </div>
          </div>
        )}
        {!isJoined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-lg mb-2">Waiting for connection...</div>
              <div className="text-sm text-gray-400">Channel: {channelId.substring(0, 20)}...</div>
            </div>
          </div>
        )}
      </div>

      {/* Local Video - Picture in Picture */}
      <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white shadow-lg z-20">
        <div ref={localVideoContainerRef} className="w-full h-full bg-gray-900"></div>
        {isVideoOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <VideoOff className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Call Info Overlay */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-black/50 rounded-lg px-4 py-2 text-white">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionState === "CONNECTED" ? "bg-green-500" : connectionState === "CONNECTING" || connectionState === "RECONNECTING" ? "bg-yellow-500 animate-pulse" : "bg-gray-400"
              }`}
            />
            <span className="text-sm">
              {connectionState === "CONNECTED" ? "Connected" : connectionState === "CONNECTING" ? "Connecting..." : connectionState === "RECONNECTING" ? "Reconnecting..." : "Not Connected"}
            </span>
          </div>
          {isJoined && <div className="mt-1 text-lg font-mono">{formatTime(callDuration)}</div>}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex gap-4">
        <Button onClick={toggleMute} variant={isMuted ? "destructive" : "secondary"} size="lg" className="rounded-full w-14 h-14" disabled={!isJoined || loading}>
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        <Button onClick={toggleVideo} variant={isVideoOff ? "destructive" : "secondary"} size="lg" className="rounded-full w-14 h-14" disabled={!isJoined || loading}>
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </Button>
        <AlertDialog open={showEndCallConfirm} onOpenChange={setShowEndCallConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End Video Call?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to end this video call? This action cannot be undone.</AlertDialogDescription>
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
        <Button onClick={() => setShowEndCallConfirm(true)} variant="destructive" size="lg" className="rounded-full w-14 h-14" disabled={loading}>
          {loading ? <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div> : <PhoneOff className="w-6 h-6" />}
        </Button>
      </div>

      {/* Call Ended Dialog */}
      <Dialog open={showCallEndedDialog} onOpenChange={setShowCallEndedDialog}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <PhoneOff className="w-5 h-5 text-red-500" />
              Call Ended
            </DialogTitle>
            <DialogDescription className="text-center pt-2">The video call has been disconnected successfully.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={() => setShowCallEndedDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
