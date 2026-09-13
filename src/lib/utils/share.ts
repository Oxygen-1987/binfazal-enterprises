// src/lib/utils/share.ts
import { Capacitor } from "@capacitor/core";

// Check if running inside a native app (Capacitor)
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

// Convert Blob to Base64 (required by Capacitor Filesystem)
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Save file to device
export async function saveFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
): Promise<void> {
  if (isNativeApp()) {
    // NATIVE: Use Capacitor Filesystem
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const base64Data = await blobToBase64(blob);

    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      // On Android, also save to external Downloads for visibility
      if (Capacitor.getPlatform() === "android") {
        try {
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
        } catch (e) {
          // External storage might not be available, ignore
          console.log("External storage not available");
        }
      }
      return;
    } catch (error) {
      console.error("Error saving file with Capacitor:", error);
      throw error;
    }
  } else {
    // WEB: Use standard download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Share file
export async function shareFile(
  blob: Blob,
  fileName: string,
  title: string,
  text?: string,
): Promise<boolean> {
  if (isNativeApp()) {
    // NATIVE: Use Capacitor Filesystem + Share
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const base64Data = await blobToBase64(blob);

    try {
      // Write to cache directory first
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      // Share the file
      await Share.share({
        title,
        text: text || title,
        url: result.uri,
        dialogTitle: "Share Ledger",
      });
      return true;
    } catch (error: any) {
      console.error("Error sharing file:", error);
      // If sharing fails, try saving instead
      if (
        error.message?.includes("cancel") ||
        error.message?.includes("abort")
      ) {
        return false;
      }
      // Fallback to save
      await saveFile(blob, fileName, blob.type);
      return false;
    }
  } else {
    // WEB: Use Web Share API if available
    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare
    ) {
      try {
        const file = new File([blob], fileName, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title,
            text: text || title,
          });
          return true;
        }
      } catch (error: any) {
        if (error.name === "AbortError") return false;
        console.error("Error sharing file:", error);
      }
    }
    // Fallback: download
    await saveFile(blob, fileName, blob.type);
    return false;
  }
}

export function canShareFiles(): boolean {
  if (isNativeApp()) return true;
  if (typeof navigator === "undefined") return false;
  if (!navigator.share || !navigator.canShare) return false;
  try {
    const testFile = new File(["test"], "test.txt", { type: "text/plain" });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

// Helper to alert user where file was saved (mobile)
export function getSaveLocationMessage(): string {
  if (isNativeApp()) {
    if (Capacitor.getPlatform() === "android") {
      return "File saved to Documents folder and Downloads";
    } else if (Capacitor.getPlatform() === "ios") {
      return "File saved to Files app → On My iPhone → BinFazal";
    }
  }
  return "File downloaded";
}
