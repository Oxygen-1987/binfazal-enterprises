// src/lib/utils/share.ts
import { Capacitor } from "@capacitor/core";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

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

export async function saveFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
): Promise<void> {
  if (isNativeApp()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const base64Data = await blobToBase64(blob);

    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      if (Capacitor.getPlatform() === "android") {
        try {
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
        } catch (e) {
          console.log("External storage not available");
        }
      }
      return;
    } catch (error) {
      console.error("Error saving file with Capacitor:", error);
      throw error;
    }
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
      await saveFile(blob, fileName, blob.type);
      return false;
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

export function getSaveLocationMessage(): string {
  if (isNativeApp()) {
    if (Capacitor.getPlatform() === "android") {
      return "File saved to Documents folder";
    } else if (Capacitor.getPlatform() === "ios") {
      return "File saved to Files app → On My iPhone → BinFazal";
    }
  }
  return "File downloaded";
}
