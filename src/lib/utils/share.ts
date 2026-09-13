// src/lib/utils/share.ts
export async function shareFile(
  blob: Blob,
  fileName: string,
  title: string,
  text?: string,
): Promise<boolean> {
  // Check if Web Share API is supported with files
  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare
  ) {
    try {
      const file = new File([blob], fileName, { type: blob.type });

      // Check if sharing this specific file is supported
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: text || title,
        });
        return true;
      }
    } catch (error: any) {
      // User cancelled sharing - not an error
      if (error.name === "AbortError") {
        return false;
      }
      console.error("Error sharing file:", error);
    }
  }

  // Fallback: Download the file instead
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  return false;
}

export function canShareFiles(): boolean {
  if (typeof navigator === "undefined") return false;
  if (!navigator.share || !navigator.canShare) return false;

  try {
    // Test with a small dummy file
    const testFile = new File(["test"], "test.txt", { type: "text/plain" });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}
