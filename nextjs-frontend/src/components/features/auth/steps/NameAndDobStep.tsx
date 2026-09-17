"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type React from "react";

type Props = {
  name: string;
  setName: (value: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (value: string) => void;
  loading: boolean;
  error: string | null;
  info: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  role: "user" | "professional";
};

export function NameAndDobStep({ name, setName, dateOfBirth, setDateOfBirth, loading, error, info, onSubmit, onBack, role }: Props) {
  return (
    <>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-black/60 hover:text-black">
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold text-black mb-2">
        Tell us about
        <br />
        yourself
      </h1>
      <p className="text-sm text-black/80 mb-6">
        This is how you'll appear on {role === "user" ? "TakeCare" : "TakeCare Pro"}.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="w-full">
          <label className="block text-sm font-medium text-black mb-1">Username</label>
          <Input
            type="text"
            placeholder="Enter your username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 bg-white rounded-xl border border-black/20 border-b-2 border-b-black/40 focus:border focus:border-black/20 focus:border-b-2 focus:border-b-blue-400 focus:outline-none focus:ring-0 shadow-none text-lg transition-colors"
            disabled={loading}
            required
          />
        </div>

        <div className="w-full">
          <label className="block text-sm font-medium text-black mb-1">Date of birth</label>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            className="h-12 bg-white rounded-xl border border-black/20 border-b-2 border-b-black/40 focus:border focus:border-black/20 focus:border-b-2 focus:border-b-blue-400 focus:outline-none focus:ring-0 shadow-none text-lg transition-colors"
            disabled={loading}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}

        <Button type="submit" disabled={loading || !name.trim() || !dateOfBirth} className="w-full h-12 rounded-full bg-black text-white hover:bg-black/80 flex items-center justify-center gap-2">
          <span>Next</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </form>
    </>
  );
}

