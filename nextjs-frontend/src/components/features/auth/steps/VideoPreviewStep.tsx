"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type React from "react";

type Props = {
  loading: boolean;
  error: string | null;
  info: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
};

export function VideoPreviewStep({ loading, error, info, onSubmit, onBack }: Props) {
  return (
    <>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-black/60 hover:text-black">
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold text-black mb-2">
        Watch this video
      </h1>
      <p className="text-sm text-black/80 mb-6">
        Please watch this video to understand how our platform works.
      </p>

      <div className="w-full rounded-xl overflow-hidden mb-6">
        <iframe
          width="100%"
          height="315"
          src="https://www.youtube.com/embed/2hHz25Xf6bI"
          title="TakeCare Platform Introduction"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-xl"
        ></iframe>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-full bg-black text-white hover:bg-black/80 flex items-center justify-center gap-2"
        >
          <span>{loading ? "Completing..." : "Complete"}</span>
          {!loading && <ArrowRight className="w-5 h-5" />}
        </Button>
      </form>

      {info && info.includes("2 hours") && (
        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 text-center">
            We will take 2 hours to verify your profile. You'll be notified once it's approved.
          </p>
        </div>
      )}
    </>
  );
}

