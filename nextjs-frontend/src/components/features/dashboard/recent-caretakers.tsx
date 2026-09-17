"use client";

import { callAPI } from "@/lib/api";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface RecentCaretaker {
  id: string;
  name: string;
  rating: number | null;
}

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

export function RecentCaretakers({ onCaretakerClick }: { onCaretakerClick?: (caretakerId: string) => void }) {
  const [recentCaretakers, setRecentCaretakers] = useState<RecentCaretaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecentCaretakers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await callAPI.getUserHistory();
      const allCalls: any[] = response.data.data || [];
      
      // Get unique professionals from call history
      const uniqueCaretakersMap = new Map<string, RecentCaretaker>();
      allCalls.forEach((call) => {
        if (call.professional && !uniqueCaretakersMap.has(call.professional.id)) {
          uniqueCaretakersMap.set(call.professional.id, {
            id: call.professional.id,
            name: call.professional.name,
            rating: call.professional.rating,
          });
        }
      });
      
      // Sort by most recent call (assuming calls are already sorted)
      const uniqueCaretakers = Array.from(uniqueCaretakersMap.values()).slice(0, 10);
      setRecentCaretakers(uniqueCaretakers);
    } catch (err: any) {
      console.error("Error fetching recent caretakers:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentCaretakers();
  }, [fetchRecentCaretakers]);

  if (isLoading) {
    return (
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-black">Recent Caretakers</h2>
          <Link href="/call-history" className="flex items-center gap-1 text-[var(--purple-primary)] font-medium">
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (recentCaretakers.length === 0) {
    return (
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-black">Recent Caretakers</h2>
          <Link href="/call-history" className="flex items-center gap-1 text-[var(--purple-primary)] font-medium">
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="text-sm text-gray-500">No recent caretakers</p>
      </div>
    );
  }

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-black">Recent Caretakers</h2>
        <Link href="/call-history" className="flex items-center gap-1 text-[var(--purple-primary)] font-medium">
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {recentCaretakers.map((caretaker) => (
          <div
            key={caretaker.id}
            className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => onCaretakerClick?.(caretaker.id)}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-700">
                {getInitial(caretaker.name)}
              </div>
            </div>
            <span className="text-xs font-medium text-black text-center max-w-[80px] truncate">{caretaker.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

