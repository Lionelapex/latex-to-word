# Pricing (draft)

Status: **partial** — anonymous export trial is live; Stripe / Pro not live. Numbers for Pro are placeholders.

## Intent

- Keep a usable **free** public converter (goodwill, Reddit, SEO) with a small anonymous download cap.
- **Sign-in (free plan)** unlocks unlimited exports for now.
- **Pro** (later) pays for extras (OCR metering, support, etc.).

## Live limits (today)

| | Anonymous | Signed-in free | Pro (planned) |
| --- | --- | --- | --- |
| Convert + preview | Yes (unlimited) | Yes | Yes |
| Download .docx / plain DOCX / HTML | **3 successful exports** (persisted in browser `localStorage`) | Unlimited | Unlimited |
| Redownload from history | Counts against the same 3 / requires remaining trial or sign-in | Unlimited | Unlimited |
| Document content on our servers | Never | Never | Never |
| Image OCR | Local Tesseract (browser) | Same | Later metered cloud OCR possible |
| Support | GitHub issues | GitHub issues | Email / form (optional) |

Trial rules are locked in [DECISIONS.md](DECISIONS.md). Preview never consumes a trial.

**Placeholder Pro price:** not decided (e.g. $5–12/month). Lock in DECISIONS.md when Stripe ships.

## Metering notes

- Count **successful exports** (docx, plain docx, html, redownload), not keystrokes or preview refreshes.
- Anonymous counter is **device-local** only (`latextodocx-anon-exports`). Clearing site data resets it; that is accepted until server-side usage exists.
- Signed-in usage is not stored server-side yet (unlimited free plan).

## Stripe artifacts (when implementing)

- Product: LaTeX to Word Pro
- Prices: monthly + optional yearly
- Checkout success URL → app with session
- Customer Portal for cancel / invoices
- Webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

Update this file when prices are real.
