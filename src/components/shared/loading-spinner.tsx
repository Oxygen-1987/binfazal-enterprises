// src/components/shared/loading-spinner.tsx
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /** Page-level variant: bigger spinner. Used by the route loading files. */
  page?: boolean;
  /** Inline variant: no full-screen overlay (for small in-page spots). */
  inline?: boolean;
  /** Wrapper size in px. Defaults: 50 (base), 60 (page), 20 (inline). */
  size?: number;
  /** Optional text shown below the spinner. */
  label?: string;
  className?: string;
}

/**
 * App-wide loading indicator: four equal dots orbiting in a circle
 * (2 green + 2 orange). Markup and classes match .spinner /
 * .spinner-wrapper / .spinner-dot in globals.css.
 *
 * Server-safe (no "use client"), so it can be used from loading.tsx.
 */
export function LoadingSpinner({
  page = false,
  inline = false,
  size,
  label,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "spinner",
        page && "page-spinner",
        inline && "spinner-inline",
        className,
      )}
      style={
        size ? ({ "--spinner-size": `${size}px` } as CSSProperties) : undefined
      }
    >
      <div className="spinner-wrapper">
        {[1, 2, 3, 4].map((dot) => (
          <div key={dot} className="spinner-dot">
            <svg viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="16" />
            </svg>
          </div>
        ))}
      </div>

      {label ? (
        <p className="text-sm text-gray-500">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
