import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

let client = null;

/**
 * True when both public Supabase env vars are set.
 * Never expects or uses service_role.
 */
export function isAuthConfigured() {
  return Boolean(String(url).trim() && String(anonKey).trim());
}

/**
 * Lazy singleton. Returns null when env is unset so the converter still works logged out.
 */
export function getSupabaseClient() {
  if (!isAuthConfigured()) return null;
  if (!client) {
    client = createClient(String(url).trim(), String(anonKey).trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export async function signUp(email, password) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Supabase Auth is not configured.") };
  }
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email, password) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Supabase Auth is not configured.") };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Starts Google OAuth via Supabase. Redirects the browser to Google, then back to the app.
 * Requires Google provider enabled in the Supabase dashboard (Client ID + secret).
 */
export async function signInWithGoogle() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Supabase Auth is not configured.") };
  }
  const base = import.meta.env.BASE_URL || "/";
  const redirectTo = new URL(base, window.location.origin).href;
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export async function signOut() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: new Error("Supabase Auth is not configured.") };
  }
  return supabase.auth.signOut();
}

export async function getSession() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: { session: null }, error: null };
  }
  return supabase.auth.getSession();
}

/**
 * Subscribe to auth changes. Returns an unsubscribe function (no-op if unset).
 */
export function onAuthStateChange(callback) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => {};
  }
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => {
    data?.subscription?.unsubscribe?.();
  };
}
