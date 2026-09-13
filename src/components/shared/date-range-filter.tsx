// src/components/shared/date-range-filter.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/shared/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DateFilterType =
  | "current_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "current_year"
  | "all_time"
  | "custom";

interface DateRangeFilterProps {
  value: DateFilterType;
  customFrom?: string;
  customTo?: string;
  onChange: (value: DateFilterType, from?: string, to?: string) => void;
}

export function DateRangeFilter({
  value,
  customFrom,
  customTo,
  onChange,
}: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(value === "custom");
  const [from, setFrom] = useState(customFrom || "");
  const [to, setTo] = useState(customTo || "");

  const handleSelectChange = (newValue: DateFilterType) => {
    if (newValue === "custom") {
      setShowCustom(true);
      onChange(newValue, from, to);
    } else {
      setShowCustom(false);
      onChange(newValue);
    }
  };

  const handleApplyCustom = () => {
    if (from && to) {
      onChange("custom", from, to);
    }
  };

  const options: { value: DateFilterType; label: string }[] = [
    { value: "current_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "last_3_months", label: "Last 3 Months" },
    { value: "last_6_months", label: "Last 6 Months" },
    { value: "current_year", label: "This Year" },
    { value: "all_time", label: "All Time" },
    { value: "custom", label: "Custom Range" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Select value={value} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showCustom && (
        <div className="flex flex-col sm:flex-row gap-2 items-end p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex-1 w-full">
            <Label className="text-xs mb-1 block">From Date</Label>
            <DatePicker
              value={from}
              onChange={setFrom}
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div className="flex-1 w-full">
            <Label className="text-xs mb-1 block">To Date</Label>
            <DatePicker value={to} onChange={setTo} placeholder="DD/MM/YYYY" />
          </div>
          <Button
            onClick={handleApplyCustom}
            disabled={!from || !to}
            className="w-full sm:w-auto"
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper function to get date range from filter type
export function getDateRange(
  filter: DateFilterType,
  customFrom?: string,
  customTo?: string,
): { from: string | null; to: string | null } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (filter) {
    case "current_month": {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0);
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    }
    case "last_month": {
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    }
    case "last_3_months": {
      const from = new Date(year, month - 3, 1);
      const to = new Date(year, month + 1, 0);
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    }
    case "last_6_months": {
      const from = new Date(year, month - 6, 1);
      const to = new Date(year, month + 1, 0);
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    }
    case "current_year": {
      const from = new Date(year, 0, 1);
      const to = new Date(year, 11, 31);
      return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      };
    }
    case "custom": {
      return {
        from: customFrom || null,
        to: customTo || null,
      };
    }
    case "all_time":
    default:
      return { from: null, to: null };
  }
}
