// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.binfazal.enterprises",
  appName: "BinFazal",
  webDir: "public",
  server: {
    androidScheme: "https",
    url: "https://binfazal-enterprises.vercel.app",
    cleartext: false, // Changed to false since we're using HTTPS
    allowNavigation: ["binfazal-enterprises.vercel.app"],
  },
  android: {
    allowMixedContent: false, // Changed to false (HTTPS only)
  },
};

export default config;
