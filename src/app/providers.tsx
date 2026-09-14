"use client";

import { ReactNode } from "react";

/**
 * Client provider shell. The browser Supabase client is created
 * per-component via createClient() : the current @supabase/ssr
 * pattern (no global context needed; each hook call binds RLS
 * to the session cookies automatically).
 */
export function SupabaseProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
