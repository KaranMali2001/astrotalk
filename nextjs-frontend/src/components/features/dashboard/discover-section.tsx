"use client";

import type { Professional } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface DiscoverSectionProps {
  caretakers: Professional[];
  onCaretakerClick?: (caretakerId: string) => void;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

// Color palette matching the image: purple, pink, green, orange
const avatarColors = [
  "bg-purple-500", // Purple
  "bg-pink-500",   // Pink
  "bg-green-500",  // Green
  "bg-orange-500", // Orange
];

function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length];
}

export function DiscoverSection({ caretakers, onCaretakerClick, onSearch, searchQuery: externalSearchQuery }: DiscoverSectionProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(externalSearchQuery || "");

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    onSearch?.(value);
  };

  const handleClearSearch = () => {
    setLocalSearchQuery("");
    onSearch?.("");
  };

  const displayQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-black">Discover</h2>
        <Link href="#" className="flex items-center gap-1 text-[var(--purple-primary)] font-medium">
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search professionals by name..."
          value={displayQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {displayQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {caretakers.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          {displayQuery ? "No professionals found matching your search" : "No caretakers available"}
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {caretakers.map((caretaker, index) => (
            <div
              key={caretaker.id}
              onClick={() => onCaretakerClick?.(caretaker.id)}
              className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer"
            >
              <div className="relative">
                <div className={`w-16 h-16 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white text-xl font-semibold shadow-md`}>
                  {getInitial(caretaker.name)}
                </div>
                {caretaker.professionalSessions && (
                  <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full border-2 border-white">
                    Online
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-black text-center max-w-[80px] truncate">{caretaker.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

