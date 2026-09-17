"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type React from "react";

type Props = {
  gender: "male" | "female" | null;
  setGender: (value: "male" | "female") => void;
  loading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
};

export function GenderSelectionStep({ gender, setGender, loading, error, onSubmit, onBack }: Props) {
  return (
    <>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-black/60 hover:text-black">
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold text-black mb-2">
        What's your
        <br />
        gender?
      </h1>
      <p className="text-sm text-black/80 mb-6">
        This helps us personalize your experience.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setGender("male")}
            className={`w-full h-14 rounded-xl border-2 transition-all ${
              gender === "male"
                ? "border-black bg-black/5"
                : "border-black/20 bg-white hover:border-black/40"
            }`}
          >
            <span className="text-lg font-medium text-black">Male</span>
          </button>

          <button
            type="button"
            onClick={() => setGender("female")}
            className={`w-full h-14 rounded-xl border-2 transition-all ${
              gender === "female"
                ? "border-black bg-black/5"
                : "border-black/20 bg-white hover:border-black/40"
            }`}
          >
            <span className="text-lg font-medium text-black">Female</span>
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading || !gender} className="w-full h-12 rounded-full bg-black text-white hover:bg-black/80 flex items-center justify-center gap-2 mt-6">
          <span>Next</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </form>
    </>
  );
}

