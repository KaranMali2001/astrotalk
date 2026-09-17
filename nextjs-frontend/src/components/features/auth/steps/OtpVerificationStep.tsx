"use client";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type React from "react";

type Props = {
  otp: string;
  setOtp: (value: string) => void;
  phoneNumber: string;
  countryCode: string;
  loading: boolean;
  error: string | null;
  info: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
};

export function OtpVerificationStep({ otp, setOtp, phoneNumber, countryCode, loading, error, info, onSubmit, onBack }: Props) {
  return (
    <>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-black/60 hover:text-black">
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold text-black mb-2">Verify your number</h1>
      <p className="text-sm text-black/80 mb-2">
        Enter the code we've sent by text to
        <br />
        <span className="font-medium">
          {countryCode} {phoneNumber}
        </span>
        <button
          onClick={onBack}
          className="ml-2 underline text-[#FF6B35]"
        >
          Change
        </button>
      </p>

      <form onSubmit={onSubmit} className="space-y-4 mt-6">
        <div className="w-full">
          <label className="block text-sm font-medium text-black mb-1">Enter OTP</label>
          <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} disabled={loading} containerClassName="w-full">
            <InputOTPGroup className="w-full gap-2">
              <InputOTPSlot index={0} className="h-16 flex-1 text-2xl rounded-xl !border !border-black/20 !border-b-2 !border-b-black/40 !border-l !border-r !border-t data-[active=true]:!border data-[active=true]:!border-black/20 data-[active=true]:!border-b-2 data-[active=true]:!border-b-blue-400 data-[active=true]:!ring-0 !shadow-none" />
              <InputOTPSlot index={1} className="h-16 flex-1 text-2xl rounded-xl !border !border-black/20 !border-b-2 !border-b-black/40 !border-l !border-r !border-t data-[active=true]:!border data-[active=true]:!border-black/20 data-[active=true]:!border-b-2 data-[active=true]:!border-b-blue-400 data-[active=true]:!ring-0 !shadow-none" />
              <InputOTPSlot index={2} className="h-16 flex-1 text-2xl rounded-xl !border !border-black/20 !border-b-2 !border-b-black/40 !border-l !border-r !border-t data-[active=true]:!border data-[active=true]:!border-black/20 data-[active=true]:!border-b-2 data-[active=true]:!border-b-blue-400 data-[active=true]:!ring-0 !shadow-none" />
              <InputOTPSlot index={3} className="h-16 flex-1 text-2xl rounded-xl !border !border-black/20 !border-b-2 !border-b-black/40 !border-l !border-r !border-t data-[active=true]:!border data-[active=true]:!border-black/20 data-[active=true]:!border-b-2 data-[active=true]:!border-b-blue-400 data-[active=true]:!ring-0 !shadow-none" />
              <InputOTPSlot index={4} className="h-16 flex-1 text-2xl rounded-xl !border !border-black/20 !border-b-2 !border-b-black/40 !border-l !border-r !border-t data-[active=true]:!border data-[active=true]:!border-black/20 data-[active=true]:!border-b-2 data-[active=true]:!border-b-blue-400 data-[active=true]:!ring-0 !shadow-none" />
              <InputOTPSlot index={5} className="h-16 flex-1 text-2xl rounded-xl !border !border-black/20 !border-b-2 !border-b-black/40 !border-l !border-r !border-t data-[active=true]:!border data-[active=true]:!border-black/20 data-[active=true]:!border-b-2 data-[active=true]:!border-b-blue-400 data-[active=true]:!ring-0 !shadow-none" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <p className="text-xs text-black/70 text-center">This text should arrive within 30s</p>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        {info && <p className="text-sm text-green-700 text-center">{info}</p>}

        <Button type="submit" disabled={loading || otp.length !== 6} className="w-full h-12 rounded-full bg-black text-white hover:bg-black/80 flex items-center justify-center gap-2">
          <span>Next</span>
          <ArrowRight className="w-5 h-5" />
        </Button>
      </form>
    </>
  );
}

