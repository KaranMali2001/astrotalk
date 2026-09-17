"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import type React from "react";

type Props = {
  selectedReasons: string[];
  toggleReason: (reason: string) => void;
  loading: boolean;
  error: string | null;
  info: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
};

const reasonOptions = [
  "A long-term relationship",
  "A life partner",
  "Fun, casual dates",
  "Intimacy, without commitment",
  "Marriage",
];

export function RelationshipGoalsStep({ selectedReasons, toggleReason, loading, error, info, onSubmit, onBack }: Props) {
  return (
    <>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-black/60 hover:text-black">
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold text-black mb-2">
        And what are you
        <br />
        hoping to find?
      </h1>
      <p className="text-sm text-black/80 mb-6">
        It's your dating journey, so choose 1 or 2 options that feel right for you.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-3">
          {reasonOptions.map((reason) => (
            <label
              key={reason}
              className="flex items-center justify-between p-4 rounded-xl border border-black/20 bg-white hover:border-black/40 transition-colors cursor-pointer"
            >
              <span className="text-base text-black">{reason}</span>
              <Checkbox
                checked={selectedReasons.includes(reason)}
                onCheckedChange={() => toggleReason(reason)}
                disabled={!selectedReasons.includes(reason) && selectedReasons.length >= 2}
              />
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-black/70 mt-6">
          <Eye className="w-3 h-3" />
          <span>
            This will show on your profile to help everyone find what they're looking for.
          </span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}

        <Button
          type="submit"
          disabled={loading || selectedReasons.length === 0 || selectedReasons.length > 2}
          className="w-full h-12 rounded-full bg-black text-white hover:bg-black/80 flex items-center justify-center gap-2 mt-6"
        >
          <span>{loading ? "Completing..." : "Next"}</span>
          {!loading && <ArrowRight className="w-5 h-5" />}
        </Button>
      </form>
    </>
  );
}

