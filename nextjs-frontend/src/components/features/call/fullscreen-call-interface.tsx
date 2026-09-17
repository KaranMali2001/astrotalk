"use client";

import { Button } from "@/components/ui/button";
import { PhoneOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface FullscreenCallInterfaceProps {
  professionalName?: string;
  professionalAvatar?: string;
  callStatus: "connecting" | "waiting" | "ringing";
  onCancel: () => void;
  callType?: "AUDIO_CALL" | "VIDEO_CALL" | "CHAT";
}

export function FullscreenCallInterface({
  professionalName,
  professionalAvatar,
  callStatus,
  onCancel,
  callType = "AUDIO_CALL",
}: FullscreenCallInterfaceProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Play calling tone only when waiting/ringing (not when connecting)
  useEffect(() => {
    if (callStatus === "waiting" || callStatus === "ringing") {
      let audioContext: AudioContext | null = null;
      let intervalId: NodeJS.Timeout | null = null;

      const playCallingTone = () => {
        try {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          const playBeep = (frequency: number, duration: number, delay: number) => {
            setTimeout(() => {
              if (!audioContext) return;
              
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();

              oscillator.type = "sine";
              oscillator.frequency.value = frequency;
              gainNode.gain.setValueAtTime(0, audioContext.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);

              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + duration);
            }, delay);
          };

          // Ring-ring pattern: two beeps, then pause
          playBeep(800, 0.3, 0);
          playBeep(800, 0.3, 400);
          
          setIsPlaying(true);
        } catch (error) {
          console.error("Error playing calling tone:", error);
        }
      };

      // Play immediately
      playCallingTone();

      // Repeat every 2 seconds (ring-ring-pause pattern)
      intervalId = setInterval(() => {
        playCallingTone();
      }, 2000);

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        if (audioContext && audioContext.state !== "closed") {
          audioContext.close().catch(() => {
            // Ignore errors when closing
          });
        }
        setIsPlaying(false);
      };
    } else {
      setIsPlaying(false);
    }
  }, [callStatus]);

  const getInitial = (name?: string) => {
    return name?.charAt(0)?.toUpperCase() || "?";
  };

  const getCallTypeLabel = () => {
    switch (callType) {
      case "VIDEO_CALL":
        return "Video Call";
      case "CHAT":
        return "Chat";
      default:
        return "Audio Call";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[var(--purple-primary)] via-purple-600 to-purple-800 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-white hover:bg-white/20 rounded-full"
        >
          <X className="h-6 w-6" />
        </Button>
        <div className="flex-1 text-center">
          <h2 className="text-white text-lg font-semibold">
            {callStatus === "connecting"
              ? "Connecting..."
              : callStatus === "waiting" || callStatus === "ringing"
              ? "Waiting for caretaker to pick call"
              : "Connecting..."}
          </h2>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
        {/* White Card */}
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
          {/* Avatar/Profile Picture */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-5xl font-bold text-white shadow-lg border-4 border-white">
                {professionalAvatar ? (
                  <img
                    src={professionalAvatar}
                    alt={professionalName || "Professional"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitial(professionalName)
                )}
              </div>
              {/* Animated rings for calling effect */}
              {(callStatus === "waiting" || callStatus === "ringing") && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping opacity-75" />
                  <div className="absolute inset-0 rounded-full border-4 border-purple-300 animate-ping opacity-50" style={{ animationDelay: "0.5s" }} />
                </>
              )}
            </div>
          </div>

          {/* Professional Name */}
          <div className="text-center mb-2">
            <h3 className="text-2xl font-bold text-black">
              {professionalName || "Professional"}
            </h3>
          </div>

          {/* Call Type */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">{getCallTypeLabel()}</p>
          </div>

          {/* Loading Indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-[var(--purple-primary)] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="mt-8">
          <Button
            onClick={onCancel}
            variant="destructive"
            size="lg"
            className="rounded-full px-8 py-6 bg-red-500 hover:bg-red-600 text-white shadow-lg"
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            Cancel Call
          </Button>
        </div>
      </div>
    </div>
  );
}

