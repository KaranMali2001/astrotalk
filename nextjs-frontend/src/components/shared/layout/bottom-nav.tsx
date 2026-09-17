"use client";

import { getRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Gamepad2, Home, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    name: "Games",
    href: "/games",
    icon: Gamepad2,
  },
  {
    name: "Home",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const role = getRole();
  
  // Adjust home href based on role
  const navigationWithRole = navigation.map((item) => {
    if (item.name === "Home" && role === "professional") {
      return { ...item, href: "/prof-dashboard" };
    }
    return item;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 shadow-lg safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navigationWithRole.map((item, index) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const isCenter = item.name === "Home";
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-full transition-colors px-4",
                isCenter ? "flex-1" : "flex-1",
                isActive ? "text-black" : "text-gray-500"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-black")} />
              <span className={cn("text-xs font-medium", isActive ? "text-black" : "text-gray-500")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
