// src/components/layout/top-bar.tsx
"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { UserMenu } from "./user-menu";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { BusinessLogo } from "./business-logo";
import { useBusiness } from "@/context/business-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function TopBar() {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const { businessInfo, loading } = useBusiness();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center h-16 px-3 md:px-4 gap-2 md:gap-4">
        {/* LEFT: Logo + Company Name */}
        <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
          <BusinessLogo />
          <div className="hidden sm:block">
            {loading ? (
              <>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-40" />
              </>
            ) : (
              <>
                <h1 className="font-bold text-sm md:text-base leading-tight">
                  {businessInfo?.business_name || "BinFazal Enterprises"}
                </h1>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 -mt-0.5">
                  Printing Management System
                </p>
              </>
            )}
          </div>
        </div>

        {/* CENTER: Global Search (desktop) */}
        <div className="hidden md:flex flex-1 justify-center px-2">
          <GlobalSearch />
        </div>

        {/* Spacer for mobile */}
        <div className="flex-1 md:hidden" />

        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* RIGHT: Theme + User Menu */}
        <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showMobileSearch && (
        <div className="md:hidden px-3 pb-3">
          <GlobalSearch />
        </div>
      )}
    </header>
  );
}
