"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CALL_ACCEPTANCE_TIMEOUT_SECONDS } from "@/lib/config/constants";
import type { IncomingCallData } from "@/lib/types";
import { Phone, PhoneOff, User, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface IncomingCallNotificationProps {
  callData: IncomingCallData | null;
  onAccept: (callId: string, userId: string) => void;
  onDecline: (callId: string) => void;
  onHide?: () => void;
  isVisible: boolean;
}

export function IncomingCallNotification({ callData, onAccept, onDecline, onHide, isVisible }: IncomingCallNotificationProps) {
  console.log("IncomingCallNotification props:", { callData, isVisible });

  const [timeRemaining, setTimeRemaining] = useState(CALL_ACCEPTANCE_TIMEOUT_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoDeclinedRef = useRef(false);

  useEffect(() => {
    if (!isVisible || !callData) {
      return;
    }
    setTimeRemaining(CALL_ACCEPTANCE_TIMEOUT_SECONDS);
    hasAutoDeclinedRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (!hasAutoDeclinedRef.current) {
            hasAutoDeclinedRef.current = true;
            console.log("Call acceptance timer expired, auto-declining call");
            onDecline(callData.callId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isVisible, callData, onDecline]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleAccept = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onAccept(callData.callId, callData.userId);
  };

  const handleDecline = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onDecline(callData.callId);
  };

  if (!isVisible || !callData) {
    console.log("IncomingCallNotification returning null - isVisible:", isVisible, "callData:", callData);
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-96 mx-4 relative">
        {onHide && (
          <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-8 w-8 p-0" onClick={onHide}>
            <X className="h-4 w-4" />
          </Button>
        )}
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            {callData.callType === "VIDEO_CALL" ? (
              <>
                <Video className="h-5 w-5" />
                Incoming Video Call
              </>
            ) : callData.callType === "AUDIO_CALL" ? (
              <>
                <Phone className="h-5 w-5" />
                Incoming Audio Call
              </>
            ) : (
              <>
                <Phone className="h-5 w-5" />
                Incoming Call
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={callData.userAvatar} alt={callData.userName} />
              <AvatarFallback>
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="font-semibold text-lg">{callData.userName}</h3>
              <p className="text-sm text-muted-foreground">
                {callData.callType === "VIDEO_CALL" ? "wants to video call" : callData.callType === "AUDIO_CALL" ? "wants to audio call" : "wants to connect"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="text-sm font-medium text-muted-foreground">Time remaining:</div>
            <div className={`text-lg font-bold ${timeRemaining <= 10 ? "text-red-600" : "text-blue-600"}`}>{timeRemaining}s</div>
          </div>
          <div className="flex space-x-4">
            <Button variant="destructive" className="flex-1" onClick={handleDecline}>
              <PhoneOff className="h-4 w-4 mr-2" />
              Decline
            </Button>
            <Button variant="default" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleAccept}>
              <Phone className="h-4 w-4 mr-2" />
              Accept
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
