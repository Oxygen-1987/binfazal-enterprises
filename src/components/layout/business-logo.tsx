// src/components/layout/business-logo.tsx
"use client";

import { useBusiness } from "@/context/business-context";
import { Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function BusinessLogo() {
  const { businessInfo, loading } = useBusiness();

  if (loading) {
    return (
      <Skeleton className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex-shrink-0" />
    );
  }

  // Has uploaded logo → show it
  if (businessInfo?.business_logo_url) {
    return (
      <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <img
          src={businessInfo.business_logo_url}
          alt={businessInfo.business_name || "Logo"}
          className="w-full h-full object-contain p-0.5"
        />
      </div>
    );
  }

  // No logo → fallback to printer icon
  return (
    <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-[#FF6B00] flex items-center justify-center flex-shrink-0">
      <Printer className="h-5 w-5 md:h-6 md:w-6 text-white" />
    </div>
  );
}
