// src/lib/utils/permissions.ts
import { Capacitor } from "@capacitor/core";

// Check if we have MANAGE_EXTERNAL_STORAGE permission
export async function hasAllFilesPermission(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return true;

  try {
    const { Filesystem } = await import("@capacitor/filesystem");
    const status = await Filesystem.checkPermissions();
    return status.publicStorage === "granted";
  } catch {
    return false;
  }
}

// Open Android settings page for All Files Access
export async function openAllFilesSettings(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;

  try {
    const { AppLauncher } = await import("@capacitor/app-launcher");
    // Deep link to app's "All files access" settings page
    await AppLauncher.openUrl({
      url: "package:com.binfazal.enterprises",
    });
  } catch (error) {
    console.error("Failed to open settings:", error);
    // Fallback: try direct intent
    try {
      const { AppLauncher } = await import("@capacitor/app-launcher");
      await AppLauncher.openUrl({
        url: "intent:#Intent;action=android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION;data=package:com.binfazal.enterprises;end",
      });
    } catch (e) {
      console.error("Fallback failed too:", e);
    }
  }
}
