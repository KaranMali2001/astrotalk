"use client";

import { ProtectedClient } from "@/components/features/auth/protected-client";
import { VideoCallInterface } from "@/components/features/call/shared/video-call-interface";
import { getProfessionalIdFromAuth } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function ProfVideoCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [professionalId, setProfessionalId] = useState<string | null>(null);

  // Get call tokens from URL params
  const agoraToken = searchParams.get("token");
  const channelId = searchParams.get("channelId");
  const callId = searchParams.get("callId");

  // Get professionalId from auth token on mount
  useEffect(() => {
    const profId = getProfessionalIdFromAuth();
    setProfessionalId(profId);
  }, []);

  const handleCallEnd = useCallback(() => {
    router.push("/prof-dashboard");
  }, [router]);

  // Show loading if no professionalId
  if (!professionalId) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto"></div>
          <div className="text-xl font-semibold">Loading Professional ID...</div>
          <p className="text-sm text-gray-400">Please wait while we identify your account</p>
        </div>
      </div>
    );
  }

  // Show error if call tokens not in URL
  if (!agoraToken || !channelId || !callId) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4 max-w-md px-4">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Call Tokens Missing</h2>
            <p className="text-gray-300">Unable to start video call. Call information is missing.</p>
            <p className="text-sm text-gray-400 mt-4">Professional ID: {professionalId}</p>
          </div>
          <button onClick={() => router.push("/prof-dashboard")} className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render VideoCallInterface with professionalId and tokens from URL
  return <VideoCallInterface token={agoraToken} channelId={channelId} callId={callId} userId={professionalId} onCallEnd={handleCallEnd} />;
}

export default function ProfVideoCallPage() {
  return (
    <ProtectedClient>
      <ProfVideoCallContent />
    </ProtectedClient>
  );
}
