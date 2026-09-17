"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WalletInfo } from "@/lib/types/wallet.types";
import { Coins, Gift, Wallet } from "lucide-react";

interface CoinsDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: WalletInfo;
  coins?: number;
}

export function CoinsDetailSheet({ open, onOpenChange, wallet, coins }: CoinsDetailSheetProps) {
  const mainBalance = wallet ? wallet.balance / 100 : 0;
  const bonusBalance = wallet ? wallet.bonus / 100 : 0;
  const totalBalance = wallet ? wallet.totalBalence / 100 : 0;
  const totalCoins = coins ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-yellow-500" />
            Coins & Balance
          </SheetTitle>
          <SheetDescription>View your coins, bonus, and wallet balance details</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Coins className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Coins</p>
                    <p className="text-2xl font-bold text-black">{totalCoins}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {wallet && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Wallet Balance
                </h3>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Main Balance</p>
                        <p className="text-xl font-semibold text-black">₹{mainBalance.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-full">
                          <Gift className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Bonus Balance</p>
                          <p className="text-xl font-semibold text-green-600">₹{bonusBalance.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Balance</p>
                        <p className="text-2xl font-bold text-primary">₹{totalBalance.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <p className="text-xs text-gray-600">Coins can be earned through various activities and used for services. Bonus balance is added to your account through promotions and referrals.</p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
