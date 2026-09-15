// src/lib/utils/portal.ts
import { supabase } from "@/lib/supabase/client";

export function generatePortalToken(): string {
  // Generate a random secure token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function createPortalLink(
  clientId: string,
  createdBy: string,
  expiresInDays: number = 7,
): Promise<{ token: string; expiresAt: string } | null> {
  const token = generatePortalToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data, error } = await supabase
    .from("client_portal_links")
    .insert({
      client_id: clientId,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating portal link:", error);
    return null;
  }

  return {
    token: data.token,
    expiresAt: data.expires_at,
  };
}

export async function revokePortalLink(linkId: string): Promise<boolean> {
  const { error } = await supabase
    .from("client_portal_links")
    .update({ is_revoked: true })
    .eq("id", linkId);

  return !error;
}

export function buildPortalUrl(token: string): string {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://binfazal-enterprises.vercel.app";
  return `${baseUrl}/portal/${token}`;
}
