"use client";

import { ProtectedClient } from "@/components/features/auth/protected-client";
import { FeedbackDialog } from "@/components/features/feedback/feedback-dialog";
import { BottomNav } from "@/components/shared/layout/bottom-nav";
import { DashboardHeader } from "@/components/shared/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { callAPI, userAPI, feedbackAPI } from "@/lib/api";
import { formatCurrency, formatDate, formatDuration } from "@/lib/utils";
import { Clock, MessageSquare, Phone, Star, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type CallHistoryItem = {
  id: string;
  type: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL";
  callState: string;
  callDuration: number;
  totalCharge: number;
  rate: number;
  callStart: string | null;
  callEnd: string | null;
  createdAt: string;
  reasonToReject: string | null;
  professional: {
    id: string;
    name: string;
    rating: number | null;
  };
  feedback?: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
  canCancel?: boolean;
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

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

function CallHistoryContent() {
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [cancellingCallId, setCancellingCallId] = useState<string | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackCallId, setFeedbackCallId] = useState<string | null>(null);
  const [feedbackProfessionalName, setFeedbackProfessionalName] = useState<string>("");

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await userAPI.getCurrentUser();
      setCurrentUser(response.data.data);
    } catch (err: any) {
      console.error("Error fetching user:", err);
    }
  }, []);

  const fetchCallHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await callAPI.getUserHistory();
      setCallHistory(response.data.data || []);
    } catch (err: any) {
      console.error("Error fetching call history:", err);
      setError("Failed to load call history");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCancelCall = useCallback(
    async (callId: string) => {
      try {
        setCancellingCallId(callId);
        const response = await callAPI.cancelCall(callId);
        const action = response.data.data?.action || "cancelled";

        if (action === "cancelled") {
          toast.success("Call cancelled successfully");
        } else if (action === "ended") {
          toast.success("Call ended successfully");
        } else {
          toast.info("Call already processed");
        }

        // Refresh call history
        await fetchCallHistory();
        // Refresh user data to update balance
        await fetchCurrentUser();
      } catch (err: any) {
        console.error("Error cancelling call:", err);
        toast.error(err?.response?.data?.message || "Failed to cancel call");
      } finally {
        setCancellingCallId(null);
      }
    },
    [fetchCallHistory, fetchCurrentUser]
  );

  const handleShowFeedback = useCallback((call: CallHistoryItem) => {
    if (call.callState === "CALL_END" && !call.feedback) {
      setFeedbackCallId(call.id);
      setFeedbackProfessionalName(call.professional.name);
      setShowFeedbackDialog(true);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchCallHistory();
  }, [fetchCallHistory, fetchCurrentUser]);

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <DashboardHeader name={currentUser?.username} balance={currentUser?.wallet ? currentUser.wallet.totalBalence / 100 : undefined} wallet={currentUser?.wallet} />
      <main className="flex-1 overflow-y-auto pb-20 p-6">
        <div className="mx-auto max-w-3xl flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>Your recent calls and chats with professionals</CardDescription>
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
                    return (
                      <div key={call.id} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold text-gray-700">{getInitial(call.professional.name)}</div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="text-base font-semibold text-black">{call.professional.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                {call.type === "AUDIO_CALL" || call.type === "VIDEO_CALL" ? (
                                  <Phone className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <MessageSquare className="w-4 h-4 text-gray-500" />
                                )}
                                <span className="text-sm text-gray-600">
                                  {call.type === "AUDIO_CALL"
                                    ? "Audio Call"
                                    : call.type === "VIDEO_CALL"
                                    ? "Video Call"
                                    : "Chat"}
                                </span>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>{statusBadge.label}</span>
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
                            {call.totalCharge > 0 && (
                              <div className="flex items-center gap-1">
                                <span>Charge:</span>
                                <span className="font-medium text-red-600">{formatCurrency(call.totalCharge)}</span>
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

                          {/* Feedback Section */}
                          {call.callState === "CALL_END" && (
                            <div className="mt-3 pt-3 border-t">
                              {call.feedback ? (
                                <div className="flex items-start gap-2">
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < call.feedback!.rating
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "fill-gray-200 text-gray-200"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-700">
                                      Your Rating: {call.feedback.rating}/5
                                    </p>
                                    {call.feedback.comment && (
                                      <p className="text-xs text-gray-600 mt-1">{call.feedback.comment}</p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShowFeedback(call)}
                                  className="flex items-center gap-2"
                                >
                                  <Star className="w-4 h-4" />
                                  Rate Your Experience
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {call.canCancel && (
                          <div className="mt-3 flex justify-end">
                            <Button variant="destructive" size="sm" onClick={() => handleCancelCall(call.id)} disabled={cancellingCallId === call.id} className="flex items-center gap-2">
                              <X className="w-4 h-4" />
                              {cancellingCallId === call.id ? "Cancelling..." : "Cancel Call"}
                            </Button>
                          </div>
                        )}
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
            fetchCallHistory();
          }}
        />
      )}
    </div>
  );
}

export default function CallHistoryPage() {
  return (
    <ProtectedClient>
      <CallHistoryContent />
    </ProtectedClient>
  );
}
