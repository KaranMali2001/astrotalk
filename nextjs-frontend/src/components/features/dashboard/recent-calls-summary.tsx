"use client";

import { callAPI } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/utils";
import { Clock, MessageSquare, Phone, Video } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
  reasonToReject: string | null;
  professional: {
    id: string;
    name: string;
    phoneNumber: string;
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

export function RecentCallsSummary() {
  const [recentCalls, setRecentCalls] = useState<CallHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecentCalls = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await callAPI.getUserHistory();
      const allCalls: CallHistoryItem[] = response.data.data || [];
      // Get the 5 most recent calls
      const sorted = allCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentCalls(sorted.slice(0, 5));
    } catch (err: any) {
      console.error("Error fetching recent calls:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentCalls();
  }, [fetchRecentCalls]);

  if (isLoading) {
    return (
      <div className="px-4 mb-6">
        <h2 className="text-2xl font-bold text-black mb-4">Recent Calls</h2>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (recentCalls.length === 0) {
    return (
      <div className="px-4 mb-6">
        <h2 className="text-2xl font-bold text-black mb-4">Recent Calls</h2>
        <p className="text-sm text-gray-500">No recent calls</p>
      </div>
    );
  }

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-black">Recent Calls</h2>
        <Link href="/call-history" className="text-[var(--purple-primary)] font-medium text-sm">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {recentCalls.map((call) => {
          const statusBadge = getCallStatusBadge(call.callState);
          return (
            <div key={call.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold text-gray-700">
                  {getInitial(call.professional.name)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-black text-sm truncate">{call.professional.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.className}`}>{statusBadge.label}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    {getCallTypeIcon(call.type)}
                    <span>{call.type === "CHAT" ? "Chat" : call.type === "VIDEO_CALL" ? "Video" : "Audio"}</span>
                  </div>
                  {call.callDuration > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(call.callDuration)}</span>
                    </div>
                  )}
                  <span>{formatDate(call.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

