"use client";

import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export function PurpleBanner() {
  return (
    <div className="relative mx-4 my-6 rounded-3xl overflow-hidden border-b-2 border-purple-300" style={{ background: "linear-gradient(135deg, var(--purple-gradient-start) 0%, var(--purple-gradient-end) 100%)" }}>
      <div className="p-6 flex flex-col gap-4 relative z-10">
        <h2 className="text-white text-xl font-bold leading-tight">Play games with friends now!</h2>
        <Button className="bg-white text-[var(--purple-primary)] hover:bg-gray-100 rounded-full font-semibold w-fit px-6 py-2">
          Find Friends
        </Button>
      </div>
      <div className="absolute right-4 top-4 bottom-4 flex items-center gap-2 opacity-20">
        <div className="w-10 h-10 rounded-full bg-white"></div>
        <div className="w-8 h-8 rounded-full bg-white"></div>
        <div className="w-12 h-12 rounded-full bg-white"></div>
        <div className="w-9 h-9 rounded-full bg-white"></div>
      </div>
    </div>
  );
}

