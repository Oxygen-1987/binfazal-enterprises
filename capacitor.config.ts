// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.binfazal.enterprises",
  appName: "BinFazal",
  webDir: "public",
  server: {
    androidScheme: "https",
    // Use your deployed URL for production
    url: "https://binfazal-enterprises.vercel.app/", // Replace with your actual URL
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
