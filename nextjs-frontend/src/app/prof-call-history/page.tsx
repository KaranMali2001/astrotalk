"use client";

import { ProtectedClient } from "@/components/features/auth/protected-client";
import { BottomNav } from "@/components/shared/layout/bottom-nav";
import { DashboardHeader } from "@/components/shared/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { callAPI, professionalAPI } from "@/lib/api";
import { formatCurrency, formatDate, formatDuration } from "@/lib/utils";
import { Clock, MessageSquare, Phone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type CallHistoryItem = {
  id: string;
  type: "CHAT" | "AUDIO_CALL";
  callState: string;
  callDuration: number;
  totalCharge: number;
  rate: number;
  callStart: string | null;
  callEnd: string | null;
  createdAt: string;
  reasonToReject: string | null;
  user: {
    id: string;
    username: string | null;
    phoneNumber: string;
  };
};

function getCallStatusBadge(callState: string): { label: string; className: string } {
  switch (callState) {
    case "CALL_END":
      return { label: "Completed", className: "bg-green-100 text-green-700" };
    case "CALL_REJECTED":
    case "CHAT_REJECTED":
      return { label: "Rejected", className: "bg-red-100 text-red-700" };
    case "CALL_CANCELLED":
    case "CHAT_CANCELLED":
      return { label: "Cancelled", className: "bg-gray-100 text-gray-700" };
    case "CALL_START":
      return { label: "In Progress", className: "bg-blue-100 text-blue-700" };
    case "CALL_INITIATED":
      return { label: "Initiated", className: "bg-yellow-100 text-yellow-700" };
    default:
      return { label: callState, className: "bg-gray-100 text-gray-700" };
  }
}

function getInitial(name: string | null): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function calculateEarnings(totalCharge: number): number {
  // Assuming 20% commission (0.2), professional gets 80%
  const commissionRate = 0.2;
  return Math.ceil(totalCharge * (1 - commissionRate));
}

function CallHistoryContent() {
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentProfessional, setCurrentProfessional] = useState<any>(null);
  const [endingCallId, setEndingCallId] = useState<string | null>(null);

  const fetchCurrentProfessional = useCallback(async () => {
    try {
      const response = await professionalAPI.getCurrentProfessional();
      setCurrentProfessional(response.data.data.prof || response.data.prof);
    } catch (err: any) {
      console.error("Error fetching professional:", err);
    }
  }, []);

  const fetchCallHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await callAPI.getProfHistory();
      setCallHistory(response.data.data || []);
    } catch (err: any) {
      console.error("Error fetching call history:", err);
      setError("Failed to load call history");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleEndCall = useCallback(
    async (callId: string) => {
      try {
        setEndingCallId(callId);
        await professionalAPI.endCall(callId);
        toast.success("Call ended successfully");
        await fetchCallHistory();
      } catch (err: any) {
        const errorMessage = err?.response?.data?.error || err?.message || "Failed to end call";
        toast.error(errorMessage);
        console.error("Error ending call:", err);
      } finally {
        setEndingCallId(null);
      }
    },
    [fetchCallHistory]
  );

  useEffect(() => {
    fetchCurrentProfessional();
    fetchCallHistory();
  }, [fetchCallHistory, fetchCurrentProfessional]);

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <DashboardHeader name={currentProfessional?.name} balance={currentProfessional?.wallet ? currentProfessional.wallet.totalBalence / 100 : undefined} wallet={currentProfessional?.wallet} />
      <main className="flex-1 overflow-y-auto pb-20 p-6">
        <div className="mx-auto max-w-3xl flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>Your recent calls and chats with users</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Loading call history...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              ) : callHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No call history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {callHistory.map((call) => {
                    const statusBadge = getCallStatusBadge(call.callState);
                    const earnings = call.totalCharge > 0 ? calculateEarnings(call.totalCharge) : 0;
                    const userName = call.user.username || "User";
                    return (
                      <div key={call.id} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold text-gray-700">{getInitial(userName)}</div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="text-base font-semibold text-black">{userName}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                {call.type === "AUDIO_CALL" ? <Phone className="w-4 h-4 text-gray-500" /> : <MessageSquare className="w-4 h-4 text-gray-500" />}
                                <span className="text-sm text-gray-600">{call.type === "AUDIO_CALL" ? "Audio Call" : "Chat"}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>{statusBadge.label}</span>
                              {call.callState === "CALL_START" && (
                                <Button variant="destructive" size="sm" onClick={() => handleEndCall(call.id)} disabled={endingCallId === call.id} className="text-xs">
                                  {endingCallId === call.id ? "Ending..." : "End"}
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-3">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(call.createdAt)}</span>
                            </div>
                            {call.callDuration > 0 && (
                              <div className="flex items-center gap-1">
                                <span>Duration:</span>
                                <span className="font-medium">{formatDuration(call.callDuration)}</span>
                              </div>
                            )}
                            {earnings > 0 && (
                              <div className="flex items-center gap-1">
                                <span>Earnings:</span>
                                <span className="font-medium text-green-600">{formatCurrency(earnings)}</span>
                              </div>
                            )}
                            {call.callStart && (
                              <div className="flex items-center gap-1">
                                <span>Started:</span>
                                <span className="font-medium">{formatDate(call.callStart)}</span>
                              </div>
                            )}
                            {call.callEnd && (
                              <div className="flex items-center gap-1">
                                <span>Ended:</span>
                                <span className="font-medium">{formatDate(call.callEnd)}</span>
                              </div>
                            )}
                          </div>

                          {call.reasonToReject && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                              <strong>Reason:</strong> {call.reasonToReject}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

export default function ProfCallHistoryPage() {
  return (
    <ProtectedClient>
      <CallHistoryContent />
    </ProtectedClient>
  );
}
