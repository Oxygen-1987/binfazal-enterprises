// src/lib/utils/errors.ts

const ERROR_MESSAGES: { [key: string]: string } = {
  // Network
  "Failed to fetch": "Network error. Please check your internet connection.",
  ERR_CACHE_MISS: "Connection issue. Please check your internet and try again.",
  ERR_NETWORK: "Network error. Please check your internet connection.",

  // Auth
  "Invalid login credentials": "Incorrect email or password.",
  "Email not confirmed": "Please verify your email before logging in.",
  "User already registered": "This email is already registered.",

  // Supabase codes
  "23505": "This record already exists.",
  "23503": "Related record not found.",
  "42501": "You don't have permission to do this.",
  PGRST116: "Record not found.",

  // Android permissions
  "Operation not permitted":
    "Storage permission required. Please enable it in Settings.",
  EACCES:
    "Storage permission denied. Please enable file access in phone settings.",
  ENOENT: "File not found.",
  EISDIR: "Invalid file location.",
  "couldn't find meta-data for provider":
    "File sharing not configured. Please reinstall the app.",

  // Generic
  "NetworkError when attempting to fetch resource.": "No internet connection.",
  "Load failed": "Could not load data. Please try again.",
};

export function getErrorMessage(error: any): string {
  if (!error) return "Something went wrong. Please try again.";

  // If it's a string
  if (typeof error === "string") {
    return ERROR_MESSAGES[error] || error;
  }

  // If it's an Error object
  const message = error.message || error.error_description || error.toString();

  // Check for exact matches
  if (ERROR_MESSAGES[message]) {
    return ERROR_MESSAGES[message];
  }

  // Check for partial matches
  for (const [key, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(key)) {
      return friendlyMessage;
    }
  }

  // Check Supabase error codes
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }

  // Fallback: return original message if it's short, else generic
  if (message.length < 150) return message;
  return "Something went wrong. Please try again.";
}

export function getErrorCode(error: any): string | undefined {
  return error?.code;
}
