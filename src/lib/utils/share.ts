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

// Helper: Find a unique filename by appending (1), (2), etc. if file exists
async function getUniqueFileName(
  baseName: string,
  directory: any,
  extension: string,
): Promise<string> {
  const { Filesystem } = await import("@capacitor/filesystem");

  // First try the original name
  let fileName = extension ? `${baseName}.${extension}` : baseName;
  let counter = 1;

  // Try up to 100 times to find an available name
  while (counter <= 100) {
    try {
      await Filesystem.stat({
        path: fileName,
        directory: directory,
      });
      // File exists → try next name with (counter)
      fileName = extension
        ? `${baseName} (${counter}).${extension}`
        : `${baseName} (${counter})`;
      counter++;
    } catch {
      // File doesn't exist → use this name
      return fileName;
    }
  }

  // Fallback if somehow 100 files exist
  const timestamp = Date.now();
  return extension
    ? `${baseName} (${timestamp}).${extension}`
    : `${baseName} (${timestamp})`;
}

// Save file - uses the same flow as share (which works)
export async function saveFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
): Promise<void> {
  if (isNativeApp()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const base64Data = await blobToBase64(blob);

    // Split filename into base and extension
    const lastDotIndex = fileName.lastIndexOf(".");
    const baseName =
      lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
    const extension =
      lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : "";

    // Try Documents first (needs MANAGE_EXTERNAL_STORAGE)
    try {
      const uniqueName = await getUniqueFileName(
        baseName,
        Directory.Documents,
        extension,
      );
      await Filesystem.writeFile({
        path: uniqueName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
      console.log("✅ Saved to Documents:", uniqueName);
      return;
    } catch (e) {
      console.log("Documents failed, trying Downloads via External:", e);
    }

    // Try ExternalStorage
    try {
      const uniqueName = await getUniqueFileName(
        baseName,
        Directory.ExternalStorage,
        extension,
      );
      await Filesystem.writeFile({
        path: uniqueName,
        data: base64Data,
        directory: Directory.ExternalStorage,
        recursive: true,
      });
      console.log("✅ Saved to ExternalStorage:", uniqueName);
      return;
    } catch (e) {
      console.log("ExternalStorage failed:", e);
    }

    // Fallback: Cache + share sheet
    const uniqueName = await getUniqueFileName(
      baseName,
      Directory.Cache,
      extension,
    );
    const result = await Filesystem.writeFile({
      path: uniqueName,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });
    const { Share } = await import("@capacitor/share");
    await Share.share({
      title: uniqueName,
      url: result.uri,
      dialogTitle: "Save File",
    });
  } else {
    // Web download
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
  return "";
}

export async function requestStoragePermission(): Promise<boolean> {
  return true;
}
