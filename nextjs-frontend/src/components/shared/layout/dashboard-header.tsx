"use client";

import { CoinsDetailSheet } from "@/components/features/wallet/coins-detail-sheet";
import { WalletInfo } from "@/lib/types/wallet.types";
import { Logo } from "@/components/shared/logo";

import { cn } from "@/lib/utils";
import { Coins, Search, Bell } from "lucide-react";
import { useState } from "react";

interface DashboardHeaderProps {
  name?: string;
  phoneNumber?: string;
  coins?: number;
  balance?: number;
  wallet?: WalletInfo;
  className?: string;
}

export function DashboardHeader({ name, phoneNumber, coins, balance, wallet, className }: DashboardHeaderProps) {
  const [isCoinsSheetOpen, setIsCoinsSheetOpen] = useState(false);

  const hasCoinsOrBalance = coins !== undefined || balance !== undefined || wallet !== undefined;

  return (
    <>
      <header className={cn("sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm", className)}>
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <Logo size="md" showText={true} />
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Search className="h-5 w-5 text-gray-700" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="h-5 w-5 text-gray-700" />
            </button>
            {hasCoinsOrBalance && (
              <button
                onClick={() => setIsCoinsSheetOpen(true)}
                className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-full px-4 py-2 transition-colors cursor-pointer active:scale-95"
              >
                <Coins className="h-5 w-5 text-yellow-500" />
                <span className="text-base font-semibold text-black">
                  {coins !== undefined ? coins : balance !== undefined ? `₹${balance.toFixed(2)}` : wallet ? `₹${(wallet.totalBalence / 100).toFixed(2)}` : "0"}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>
      <CoinsDetailSheet open={isCoinsSheetOpen} onOpenChange={setIsCoinsSheetOpen} wallet={wallet} coins={coins} />
    </>
  );
}
