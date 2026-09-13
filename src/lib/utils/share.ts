// src/lib/utils/share.ts
import { Capacitor } from "@capacitor/core";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function requestStoragePermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  if (Capacitor.getPlatform() !== "android") return true;

  try {
    const { Filesystem } = await import("@capacitor/filesystem");
    const status = await Filesystem.checkPermissions();

    if (status.publicStorage === "granted") return true;

    const result = await Filesystem.requestPermissions();
    return result.publicStorage === "granted";
  } catch (error) {
    console.error("Permission request failed:", error);
    return false;
  }
}

export async function saveFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
): Promise<void> {
  if (isNativeApp()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const base64Data = await blobToBase64(blob);

    // Try Documents first (worked for PDF)
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
      console.log("Saved to Documents:", fileName);
      return;
    } catch (docError) {
      console.log("Documents failed, trying ExternalStorage:", docError);
    }

    // Fallback to ExternalStorage
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.ExternalStorage,
      recursive: true,
    });
    console.log("Saved to ExternalStorage:", fileName);
    return;
  } else {
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

export async function shareFile(
  blob: Blob,
  fileName: string,
  title: string,
  text?: string,
): Promise<boolean> {
  if (isNativeApp()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const base64Data = await blobToBase64(blob);

    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      await Share.share({
        title,
        text: text || title,
        url: result.uri,
        dialogTitle: "Share Ledger",
      });
      return true;
    } catch (error: any) {
      console.error("Error sharing file:", error);
      if (
        error.message?.includes("cancel") ||
        error.message?.includes("abort")
      ) {
        return false;
      }
      throw error;
    }
  } else {
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
    await saveFile(blob, fileName, blob.type);
    return false;
  }
}

export function getSaveLocationMessage(): string {
  if (isNativeApp()) {
    if (Capacitor.getPlatform() === "android") {
      return "File saved to Documents folder";
    } else if (Capacitor.getPlatform() === "ios") {
      return "File saved to Files app";
    }
  }
  return "File downloaded";
}
