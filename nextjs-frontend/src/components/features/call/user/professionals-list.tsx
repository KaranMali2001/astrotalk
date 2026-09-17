"use client";

import { Button } from "@/components/ui/button";
import type { Professional } from "@/lib/types";
import { Heart, MessageSquare, Phone, Star, Users, Video } from "lucide-react";

interface ProfessionalsListProps {
  items: Professional[];
  onInitiate: (professionalId: string, callType: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL") => Promise<void>;
  loadingId: string | null;
}

export function ProfessionalsList({ items, onInitiate, loadingId }: ProfessionalsListProps) {
  if (!items?.length) {
    return <p className="text-sm text-muted-foreground">No caretakers online right now.</p>;
  }

  const getInitial = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || "?";
  };

  return (
    <div className="space-y-3">
      {items.map((p) => (
        <div key={p.id} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-shrink-0">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-700">{getInitial(p.name)}</div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-black truncate">{p.name}</h3>
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const rating = p.rating ? Math.round(p.rating) : 4;
                    const isFilled = i < rating;
                    return <Star key={i} className={`w-4 h-4 ${isFilled ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />;
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border-none flex items-center gap-1">
                <Users className="w-3 h-3" />
                Lonely Care
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-700 border-none flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Love Care
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 flex-shrink-0 self-end">
            <div className="flex flex-col gap-1.5 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                <span>{p.totalCallDuration || 0} Calls</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                <span>{p.totalChats || 0} Chats</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => onInitiate(p.id, "CHAT")} disabled={loadingId === p.id} variant="outline" size="sm" className="w-full flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </Button>
              <Button onClick={() => onInitiate(p.id, "AUDIO_CALL")} disabled={loadingId === p.id} variant="outline" size="sm" className="w-full flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Audio Call
              </Button>
              <Button
                onClick={() => onInitiate(p.id, "VIDEO_CALL")}
                disabled={loadingId === p.id}
                variant="default"
                size="sm"
                className="w-full flex items-center gap-2 bg-black text-white hover:bg-black/80"
              >
                <Video className="w-4 h-4" />
                Video Call
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
