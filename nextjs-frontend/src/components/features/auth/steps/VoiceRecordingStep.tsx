"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type React from "react";

type Props = {
  isRecording: boolean;
  voiceRecording: Blob | null;
  randomSentence: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onReRecord: () => void;
  onSubmit: () => void;
  onBack: () => void;
  error: string | null;
};

export function VoiceRecordingStep({
  isRecording,
  voiceRecording,
  randomSentence,
  onStartRecording,
  onStopRecording,
  onReRecord,
  onSubmit,
  onBack,
  error,
}: Props) {
  return (
    <>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-black/60 hover:text-black">
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold text-black mb-2">
        Voice Verification
      </h1>
      <p className="text-sm text-black/80 mb-6">
        {randomSentence}
      </p>

      <div className="space-y-4">
        <div className="w-full p-6 rounded-xl border border-black/20 bg-white">
          {isRecording ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500 animate-pulse"></div>
              <p className="text-lg font-medium text-black">Recording...</p>
              <p className="text-sm text-black/60 mt-2">Click stop when finished</p>
            </div>
          ) : voiceRecording ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-lg font-medium text-black">Recording Complete</p>
              <audio src={URL.createObjectURL(voiceRecording)} controls className="mt-4 w-full" />
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-lg font-medium text-black">Ready to Record</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!isRecording && !voiceRecording && (
            <Button
              type="button"
              onClick={onStartRecording}
              className="flex-1 h-12 rounded-full bg-black text-white hover:bg-black/80"
            >
              Start Recording
            </Button>
          )}
          {isRecording && (
            <Button
              type="button"
              onClick={onStopRecording}
              className="flex-1 h-12 rounded-full bg-red-600 text-white hover:bg-red-700"
            >
              Stop Recording
            </Button>
          )}
          {voiceRecording && (
            <>
              <Button
                type="button"
                onClick={onReRecord}
                className="flex-1 h-12 rounded-full bg-gray-200 text-black hover:bg-gray-300"
              >
                Re-record
              </Button>
              <Button
                type="button"
                onClick={onSubmit}
                className="flex-1 h-12 rounded-full bg-black text-white hover:bg-black/80 flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </>
  );
}

