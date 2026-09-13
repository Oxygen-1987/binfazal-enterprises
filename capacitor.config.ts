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
};

export default config;
