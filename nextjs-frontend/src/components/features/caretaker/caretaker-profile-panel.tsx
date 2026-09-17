"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { callAPI, userAPI } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Clock, MessageSquare, Phone, Star, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Professional = {
  id: string;
  name: string;
  perMinuteRateChat: number;
  perMinuteRateCall: number;
  totalCallDuration: number;
  totalChats: number;
  rating: number | null;
  aboutMe: string | null;
};

type CallHistoryItem = {
  id: string;
  type: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL" | string;
  callState: string;
  callDuration: number;
  totalCharge: number;
  rate: number;
  callStart: string | null;
  callEnd: string | null;
  createdAt: string;
  professional: {
    id: string;
    name: string;
    rating: number | null;
  };
};

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

function getCallTypeIcon(type: string) {
  switch (type) {
    case "CHAT":
      return <MessageSquare className="w-4 h-4" />;
    case "VIDEO_CALL":
      return <Video className="w-4 h-4" />;
    default:
      return <Phone className="w-4 h-4" />;
  }
}

interface CaretakerProfilePanelProps {
  caretakerId: string | null;
  onClose: () => void;
  onCallInitiate?: (wsUrl: string, callType: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL") => void;
  onCallInitiateStart?: (professionalName: string, callType: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL") => void;
}

export function CaretakerProfilePanel({ caretakerId, onClose, onCallInitiate, onCallInitiateStart }: CaretakerProfilePanelProps) {
  const [caretaker, setCaretaker] = useState<Professional | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [recentCalls, setRecentCalls] = useState<CallHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingCall, setLoadingCall] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalChats: 0,
    totalDuration: 0,
  });

  const fetchCaretaker = useCallback(async () => {
    if (!caretakerId) return;
    try {
      const response = await callAPI.browseOnline();
      const body: any = response.data;
      let professionals: Professional[] = [];
      if (Array.isArray(body)) {
        professionals = body as Professional[];
      } else if (Array.isArray(body?.data)) {
        professionals = body.data as Professional[];
      } else if (Array.isArray(body?.professionals)) {
        professionals = body.professionals as Professional[];
      }
      const found = professionals.find((p) => p.id === caretakerId);
      if (found) {
        setCaretaker(found);
      }
    } catch (err: any) {
      console.error("Error fetching caretaker:", err);
      toast.error("Failed to load caretaker profile");
    }
  }, [caretakerId]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await userAPI.getCurrentUser();
      setCurrentUser(response.data.data);
    } catch (err: any) {
      console.error("Error fetching user:", err);
    }
  }, []);

  const fetchRecentCalls = useCallback(async () => {
    if (!caretakerId) return;
    try {
      const response = await callAPI.getUserHistory();
      const allCalls: CallHistoryItem[] = response.data.data || [];
      const filteredCalls = allCalls.filter((call) => call.professional.id === caretakerId);
      const sorted = filteredCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentCalls(sorted.slice(0, 5));

      setStats({
        totalCalls: filteredCalls.filter((c) => c.type === "AUDIO_CALL" || c.type === "VIDEO_CALL").length,
        totalChats: filteredCalls.filter((c) => c.type === "CHAT").length,
        totalDuration: filteredCalls.reduce((sum, c) => sum + (c.callDuration || 0), 0),
      });
    } catch (err: any) {
      console.error("Error fetching recent calls:", err);
    }
  }, [caretakerId]);

  useEffect(() => {
    if (!caretakerId) {
      setCaretaker(null);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCaretaker(), fetchCurrentUser(), fetchRecentCalls()]);
      setIsLoading(false);
    };
    loadData();
  }, [caretakerId, fetchCaretaker, fetchCurrentUser, fetchRecentCalls]);

  const handleInitiateCall = useCallback(
    async (callType: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL") => {
      if (!caretaker) return;
      setLoadingCall(callType);
      
      // Show full-screen interface immediately
      if (onCallInitiateStart) {
        onCallInitiateStart(caretaker.name, callType);
      }
      
      try {
        let response;
        if (callType === "CHAT") {
          response = await callAPI.initiateChat(caretaker.id);
        } else if (callType === "VIDEO_CALL") {
          response = await callAPI.initiateVideoCall(caretaker.id);
        } else {
          response = await callAPI.initiateCall(caretaker.id);
        }
        const responseData: any = response.data;
        const url = responseData?.ws || responseData?.data?.ws;
        if (!url) {
          throw new Error("Missing WebSocket URL from server");
        }

        // For video calls, route to video call page
        if (callType === "VIDEO_CALL") {
          const params = new URLSearchParams({ wsUrl: url });
          window.location.href = `/video-call?${params.toString()}`;
          return;
        }

        // For audio and chat calls, use the callback to set up the call interface
        if (onCallInitiate) {
          onCallInitiate(url, callType);
          onClose();
        } else {
          // Fallback if no callback provided
          toast.success("Call initiated successfully");
          onClose();
        }
      } catch (e: any) {
        toast.error(e?.response?.data?.error || "Call failed");
      } finally {
        setLoadingCall(null);
      }
    },
    [caretaker, onClose, onCallInitiate, onCallInitiateStart]
  );
console.log("caretaker",caretaker)
  const isOpen = !!caretakerId;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl transition-transform duration-300 ease-out overflow-y-auto"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {!caretakerId ? null : isLoading ? (
          <div className="min-h-dvh flex flex-col bg-white">
            <div className="sticky top-0 z-40 bg-white px-4 py-3 flex items-center">
              <Button variant="outline" onClick={onClose} className="text-black hover:bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            </div>
            <main className="flex-1 overflow-y-auto pb-4 p-4">
              <p className="text-center text-gray-500">Loading profile...</p>
            </main>
          </div>
        ) : !caretaker ? (
          <div className="min-h-dvh flex flex-col bg-white">
            <div className="sticky top-0 z-40 bg-white px-4 py-3 flex items-center">
              <Button variant="outline" onClick={onClose} className="text-black hover:bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            </div>
            <main className="flex-1 overflow-y-auto pb-4 p-4">
              <p className="text-center text-red-500">Caretaker not found</p>
            </main>
          </div>
        ) : (
          <div className="min-h-dvh flex flex-col bg-white">
            {/* Header with back button */}
            <div className="sticky top-0 z-40 bg-white px-4 py-3 flex items-center">
              <Button variant="outline" onClick={onClose} className="text-black hover:bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            </div>

            <main className="flex-1 overflow-y-auto pb-4 bg-white">
              {/* Profile Banner */}
              <div className="relative h-40 mx-4 mt-4 rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 20%, #f59e0b 40%, #3b82f6 100%)" }}>
                <div className="absolute inset-0 opacity-30 flex items-center justify-center">
                  <div className="text-7xl">📚</div>
                </div>
              </div>

              {/* Profile Picture - Centered and overlapping banner */}
              <div className="flex justify-center -mt-16 relative z-10">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-semibold text-gray-700 border-4 border-white shadow-lg">
                    {getInitial(caretaker.name)}
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              </div>

              {/* Profile Info - Centered */}
              <div className="px-4 mt-4 mb-6">
                <div className="flex flex-col items-center mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-black">{caretaker.name}</h2>
                    <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 w-full justify-center mb-4">
                    <p className="text-sm text-gray-600">@{caretaker.name.toLowerCase().replace(/\s+/g, "_")}</p>
                    <Button className="bg-[var(--purple-primary)] text-white hover:opacity-90 rounded-full px-6 py-2 font-semibold text-sm">
                      Follow
                    </Button>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{stats.totalCalls + stats.totalChats}</div>
                    <div className="text-xs text-gray-600">Total Calls</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{stats.totalChats}</div>
                    <div className="text-xs text-gray-600">Chats</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{formatDuration(stats.totalDuration)}</div>
                    <div className="text-xs text-gray-600">Total Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{caretaker.totalChats || 0}</div>
                    <div className="text-xs text-gray-600">Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{caretaker?.rating || "0.0"}</div>
                    <div className="text-xs text-gray-600">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{stats.totalCalls}</div>
                    <div className="text-xs text-gray-600">Calls</div>
                  </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex gap-2 mb-6">
                  <button className="flex-1 rounded-full border-2 border-[var(--purple-primary)] py-2 px-4 text-sm font-medium text-[var(--purple-primary)] hover:bg-purple-50">
                    Profile
                  </button>
                  <button className="flex-1 rounded-full bg-[var(--purple-primary)] text-white py-2 px-4 text-sm font-medium">
                    Calls
                  </button>
                  <button className="flex-1 rounded-full border-2 border-[var(--purple-primary)] py-2 px-4 text-sm font-medium text-[var(--purple-primary)] hover:bg-purple-50">
                    About
                  </button>
                </div>

                {/* Call Action Buttons */}
                <div className="flex flex-col gap-2 mb-6">
                  <Button
                    onClick={() => handleInitiateCall("VIDEO_CALL")}
                    disabled={!!loadingCall}
                    className="w-full bg-[var(--purple-primary)] text-white hover:opacity-90 h-12 text-base font-semibold"
                  >
                    <Video className="w-5 h-5 mr-2" />
                    Video Call
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleInitiateCall("CHAT")}
                      disabled={!!loadingCall}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Chat
                    </Button>
                    <Button
                      onClick={() => handleInitiateCall("AUDIO_CALL")}
                      disabled={!!loadingCall}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      <Phone className="w-5 h-5 mr-2" />
                      Audio Call
                    </Button>
                  </div>
                </div>

                {/* Recent Calls */}
                {recentCalls.length > 0 && (
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <h3 className="font-bold text-black mb-4">Recent Calls</h3>
                      <div className="space-y-3">
                        {recentCalls.map((call) => (
                          <div key={call.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                              {getInitial(caretaker.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {getCallTypeIcon(call.type)}
                                <span className="text-sm font-medium text-black">
                                  {call.type === "CHAT" ? "Chat" : call.type === "VIDEO_CALL" ? "Video Call" : "Audio Call"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Clock className="w-3 h-3" />
                                {call.callDuration > 0 && <span>{formatDuration(call.callDuration)}</span>}
                                <span>•</span>
                                <span>{formatDate(call.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Reviews Section */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-black mb-4">Reviews</h3>
                    <div className="space-y-4">
                      <div className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                          <div>
                            <div className="text-sm font-semibold text-black">Anonymous User</div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < 5 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">Great caretaker! Very helpful and professional. Highly recommended.</p>
                      </div>
                      <div className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                          <div>
                            <div className="text-sm font-semibold text-black">Anonymous User</div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">Excellent service and communication. Always available when needed.</p>
                      </div>
                    </div>
                  </CardContent>
              </Card>
            </div>
          </main>
        </div>
      )}
      </div>
    </>
  );
}

