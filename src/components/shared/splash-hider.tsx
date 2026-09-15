// src/components/shared/splash-hider.tsx
"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function SplashHider() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const hideSplash = async () => {
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
        console.log("✅ Splash hidden");
      } catch (error) {
        console.error("Error hiding splash:", error);
      }
    };

    // Hide as soon as possible
    hideSplash();
  }, []);

  return null;
}
