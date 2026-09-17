"use client";

import { Button } from "@/components/ui/button";
import type { Professional } from "@/lib/types";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface CaretakersScrollProps {
  caretakers: Professional[];
  onCaretakerClick?: (caretakerId: string) => void;
}

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

export function CaretakersScroll({ caretakers, onCaretakerClick }: CaretakersScrollProps) {
  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-black">Top Caretakers</h2>
        <Link href="#" className="flex items-center gap-1 text-[var(--purple-primary)] font-medium">
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide mb-4">
        {caretakers.length === 0 ? (
          <p className="text-sm text-gray-500">No caretakers available</p>
        ) : (
          caretakers.map((caretaker) => (
            <div
              key={caretaker.id}
              className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer"
              onClick={() => onCaretakerClick?.(caretaker.id)}
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-700">
                  {getInitial(caretaker.name)}
                </div>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <span className="text-xs font-medium text-black text-center max-w-[80px] truncate">{caretaker.name}</span>
            </div>
          ))
        )}
      </div>
      <Button
        className="w-full bg-[var(--purple-primary)] text-white hover:opacity-90 rounded-lg font-semibold"
        onClick={() => {
          // Navigate to full caretakers list or trigger action
        }}
      >
        Connect with Caretakers
      </Button>
    </div>
  );
}

