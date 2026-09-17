"use client";

import type { CallStartedData, CallStatus, IncomingCallData } from "@/lib/types";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface CallContextType {
  activeCall: CallStartedData | null;
  callStatus: CallStatus;
  incomingCall: IncomingCallData | null;
  wsUrl: string | null;
  setActiveCall: (call: CallStartedData | null) => void;
  setCallStatus: (status: CallStatus) => void;
  setIncomingCall: (call: IncomingCallData | null) => void;
  setWsUrl: (url: string | null) => void;
  resetCall: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const [activeCall, setActiveCall] = useState<CallStartedData | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("waiting");
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const resetCall = useCallback(() => {
    setActiveCall(null);
    setCallStatus("waiting");
    setIncomingCall(null);
    setWsUrl(null);
  }, []);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        callStatus,
        incomingCall,
        wsUrl,
        setActiveCall,
        setCallStatus,
        setIncomingCall,
        setWsUrl,
        resetCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
}
