"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { professionalAPI } from "@/lib/api";
import type { PendingCall } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function PendingCallsList() {
  const [data, setData] = useState<PendingCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [endingCallId, setEndingCallId] = useState<string | null>(null);

  const fetchPendingCalls = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await professionalAPI.getPendingCalls();
      console.log("response", response.data);
      // Handle both response structures: { data: PendingCall[] } or PendingCall[]
      const responseData: any = response.data;
      setData(responseData?.data || responseData || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Fetch failed"));
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
        await fetchPendingCalls();
      } catch (err: any) {
        const errorMessage = err?.response?.data?.error || err?.message || "Failed to end call";
        toast.error(errorMessage);
        console.error("Error ending call:", err);
      } finally {
        setEndingCallId(null);
      }
    },
    [fetchPendingCalls]
  );

  useEffect(() => {
    fetchPendingCalls();
  }, [fetchPendingCalls]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-balance">Pending Calls</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button onClick={fetchPendingCalls} className="text-sm px-3 py-2 rounded bg-primary text-primary-foreground" disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {isLoading ? (
          <div className="text-sm">Loading...</div>
        ) : error ? (
          <div className="text-sm text-red-600">Load failed: {error.message}</div>
        ) : !data || data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending calls.</div>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.length > 0 &&
              data.map((p) => (
                <li key={p.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">
                      User: {p.user?.username ?? "Unknown"} ({p.user?.id})
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {p.callState}
                      </Badge>
                      {p.callState !== "ENDED" && p.callState !== "REJECTED" && p.callState !== "CALL_END" && p.callState !== "CALL_REJECTED" && p.callState !== "CALL_CANCELLED" && (
                        <Button variant="destructive" size="sm" onClick={() => handleEndCall(p.id)} disabled={endingCallId === p.id} className="text-xs">
                          {endingCallId === p.id ? "Ending..." : "End"}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <div>ID: {p.id}</div>
                    <div>Type: {p.type || "N/A"}</div>
                    <div>Rate: ₹{p.rate != null && !isNaN(p.rate) ? (p.rate / 100).toFixed(2) : "0.00"}/min</div>
                    <div>Max Duration: {p.maxCallDuration || 0}s</div>
                    <div>Duration: {p.callDuration || 0}s</div>
                    <div>Total: ₹{p.totalCharge != null && !isNaN(p.totalCharge) ? (p.totalCharge / 100).toFixed(2) : "0.00"}</div>
                    <div>Channel: {p.agoraChannelId || "N/A"}</div>
                    {p.reasonToReject ? <div>Rejected: {p.reasonToReject}</div> : null}
                    <div>
                      Created: {formatDate(p.createdAt)} • Updated: {formatDate(p.updatedAt)}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
