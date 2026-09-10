import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("supabase auth helpers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports unset when env is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const { isAuthConfigured, getSupabaseClient, getSession, onAuthStateChange } =
      await import("../../src/auth/supabase-client.js");
    expect(isAuthConfigured()).toBe(false);
    expect(getSupabaseClient()).toBeNull();
    const session = await getSession();
    expect(session.data.session).toBeNull();
    expect(typeof onAuthStateChange(() => {})).toBe("function");
  });

  it("signIn returns a clear error when unset", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const { signIn, signUp, signOut, signInWithGoogle } = await import(
      "../../src/auth/supabase-client.js"
    );
    const inResult = await signIn("a@b.com", "secret");
    expect(inResult.error).toBeInstanceOf(Error);
    expect(inResult.error.message).toMatch(/not configured/i);
    const upResult = await signUp("a@b.com", "secret");
    expect(upResult.error).toBeInstanceOf(Error);
    const outResult = await signOut();
    expect(outResult.error).toBeInstanceOf(Error);
    const googleResult = await signInWithGoogle();
    expect(googleResult.error).toBeInstanceOf(Error);
    expect(googleResult.error.message).toMatch(/not configured/i);
  });
});
