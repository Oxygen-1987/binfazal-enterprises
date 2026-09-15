// src/components/shared/empty-state.tsx
"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Icon shown above the title (e.g. Printer, Users, Wallet). */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /**
   * "default" — nothing has been created yet, renders the call to action.
   * "search"  — a search or filter returned no results.
   */
  variant?: "default" | "search";
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  variant = "default",
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  const hasAction = Boolean(actionLabel && (actionHref || onAction));

  return (
    <Card
      className={cn(
        variant === "search" &&
          "border-dashed bg-gray-50/60 dark:bg-gray-900/40",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {Icon && (
          <Icon
            className={cn(
              "h-12 w-12 mb-4",
              variant === "search"
                ? "text-gray-300 dark:text-gray-600"
                : "text-gray-400",
            )}
          />
        )}

        <p className="text-gray-500 text-lg">{title}</p>

        {description && (
          <p className="text-gray-400 text-sm mt-2 max-w-md">{description}</p>
        )}

        {hasAction && (
          <div className="mt-6">
            {actionHref ? (
              <Button asChild>
                <Link href={actionHref}>{actionLabel}</Link>
              </Button>
            ) : (
              <Button onClick={onAction}>{actionLabel}</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
