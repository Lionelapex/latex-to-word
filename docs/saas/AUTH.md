# Authentication (Supabase)

Status: **in progress** (client sign-up / sign-in wired; billing and entitlements not yet).

Conversion stays in the browser. Auth only answers **who is this user?** Document paste is never sent to Supabase.

## Vendor

- **Auth:** [Supabase Auth](https://supabase.com/docs/guides/auth) (email + password for v1)
- **App:** existing Vite + GitHub Pages app (no Next.js)
- Locked in [DECISIONS.md](DECISIONS.md)

## Env vars (public only)

| Variable | Where | What |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | local `.env`, later CI secrets | Project URL from Supabase **Project Settings → API** |
| `VITE_SUPABASE_ANON_KEY` | local `.env`, later CI secrets | **anon public** key, or the newer **publishable** (`sb_publishable_…`) key from the same page |

Vite only exposes variables prefixed with `VITE_`. Names like `SUPABASE_URL` alone will not reach the browser client.

**Never** put **service_role**, **`sb_secret_…`**, or other secret keys in `.env` for this app, in `VITE_*`, chat, or the repo. Those belong only on a future server (billing / admin). If a secret was pasted into chat or a frontend `.env`, rotate it in the Supabase dashboard.

If either env var is unset, the auth UI shows a clear “not configured” message and the converter still works logged out.

Copy placeholders from [`.env.example`](../../.env.example). Do not commit real keys.

## Supabase dashboard URL config

**Authentication → URL configuration:**

| Setting | Value |
| --- | --- |
| Site URL (production) | `https://latextodocx.com/` |
| Redirect URLs | `https://latextodocx.com/**` |
| | `http://127.0.0.1:5173/**` |
| | `https://lionelapex.github.io/latex-to-word/**` |

Also add Google Cloud OAuth **Authorized JavaScript origins**: `https://latextodocx.com` and `http://127.0.0.1:5173`.

Enable the **Email** provider. Confirm-email can stay on; users then complete signup from their inbox before sign-in works.

## App flow (v1)

1. User opens Sign in / Register in the header (or from the trial banner when downloads are exhausted).
2. **Continue with Google** → `signInWithOAuth({ provider: "google" })` (redirect), **or** email + password → `signUp` / `signIn`.
3. Session JWT is stored in the browser (Supabase default local storage).
4. Header shows the signed-in email / display name, plan badge, and Sign out.
5. On sign-in, `ensureProfile` upserts `public.profiles` (RLS: own row). Downloads unlock immediately (unlimited free plan).
6. While logged out: preview is unlimited; **exports are capped at 3** successful downloads (see [PRICING.md](PRICING.md) and DECISIONS.md).

Helpers live in `src/auth/supabase-client.js`: `getSupabaseClient`, `signUp`, `signIn`, `signInWithGoogle`, `signOut`, `getSession`, `onAuthStateChange`, `isAuthConfigured`, `getProfile`, `ensureProfile`. Trial logic: `src/ui/trial-gate.js`.

## Google OAuth (dashboard)

1. Google Cloud → OAuth **Web application** client; redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Supabase → **Authentication → Providers → Google** → paste Google Client ID + Client secret.
3. Keep Site URL / Redirect URLs as above (local + GitHub Pages).
4. While Google consent is in **Testing**, add your Gmail as a test user.

## Profiles table (public schema) — your user list

Open **Supabase → Table Editor → `profiles`**. That is the clear user table (not `auth.users`).

| Column | Meaning |
| --- | --- |
| `email` | Login email |
| `display_name` | Name (Google or email prefix) |
| `plan` | `free` or `pro` |
| `auth_provider` | `email`, `google`, … |
| `last_sign_in_at` | Last Auth sign-in |
| `created_at` | When the profile was created |

- Migration SQL: [`supabase/migrations/20260910_profiles.sql`](../../supabase/migrations/20260910_profiles.sql)
- RLS: users can read/update their own row only (dashboard Table Editor still shows all rows for you as project owner)
- Trigger `on_auth_user_created` inserts a profile on each new signup; the app also upserts on sign-in

## What is out of scope for this phase

- Stripe / paid quotas
- Next.js or API routes
- Requiring login to **preview** (only downloads are gated after the anonymous trial)
- Cursor ↔ Supabase MCP (optional for inspecting tables later; not required for sign-in)

## GitHub Pages (later)

Same pattern as presence: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Actions secrets / env at build time. Do not bake service_role into the static build.
