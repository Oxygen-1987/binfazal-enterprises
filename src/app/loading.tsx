// src/app/loading.tsx
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <LoadingSpinner page />
    </div>
  );
}
