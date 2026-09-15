// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.binfazal.enterprises",
  appName: "BinFazal",
  webDir: "public",
  server: {
    androidScheme: "https",
    url: "https://binfazal-enterprises.vercel.app",
    cleartext: false,
    allowNavigation: ["binfazal-enterprises.vercel.app"],
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true, // ← AUTO HIDE (critical!)
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
