import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabase() {
  if (!url || !anon) throw new Error("Supabase is not configured. Add the environment variables.");
  return createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } });
}

export function isAdmin(email?: string | null) {
  return !!email && (process.env.ADMIN_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).includes(email.toLowerCase());
}