"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Lock } from "lucide-react";
import type React from "react";

type Props = {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  loading: boolean;
  error: string | null;
  info: string | null;
  onSubmit: (e: React.FormEvent) => void;
  role: "user" | "professional";
};

export function PhoneNumberStep({ phoneNumber, setPhoneNumber, loading, error, info, onSubmit, role }: Props) {
  return (
    <>
      <h1 className="text-3xl font-bold text-black mb-2">
        What's your
        <br />
        number?
      </h1>
      <p className="text-sm text-black/80 mb-6">
        We protect our community by making sure
        <br />
        everyone on {role === "user" ? "TakeCare" : "TakeCare Pro"} is real.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex gap-3">
          <div className="w-[20%]">
            <label className="block text-sm font-medium text-black mb-1">Country</label>
            <div className="h-12 bg-white rounded-xl border border-black/20 flex items-center justify-center text-lg font-medium">
              +91
            </div>
          </div>
          <div className="w-[80%]">
            <label className="block text-sm font-medium text-black mb-1">Phone number</label>
            <Input
              type="tel"
              placeholder="Phone number"
              value={phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhoneNumber(value);
              }}
              className="h-12 bg-white rounded-xl border border-black/20 border-b-2 border-b-black/40 focus:border focus:border-black/20 focus:border-b-2 focus:border-b-blue-400 focus:outline-none focus:ring-0 shadow-none text-lg transition-colors"
              disabled={loading}
              required
              minLength={10}
              maxLength={10}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}

        <div className="flex items-center gap-2 text-xs text-black/70 mb-4">
          <Lock className="w-3 h-3" />
          <span>
            We never share this with anyone and
            <br />
            it won't be on your profile.
          </span>
        </div>

        <Button type="submit" disabled={loading || !phoneNumber} className="w-full h-12 rounded-full bg-black text-white hover:bg-black/80 flex items-center justify-center gap-2">
          <span>Send OTP</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </form>
    </>
  );
}

