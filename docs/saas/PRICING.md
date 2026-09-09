# Pricing (draft)

Status: **not live**. Numbers are placeholders until we set Stripe products.

## Intent

- Keep a usable **free** public converter (goodwill, Reddit, SEO).
- **Pro** pays for unlimited (or high) exports and later extras.

## Draft plans

| | Free | Pro (monthly) |
| --- | --- | --- |
| Convert + preview | Yes | Yes |
| Download .docx / HTML | Limited (e.g. N per day) **or** unlimited on GitHub Pages until SaaS ships | Unlimited |
| Document content on our servers | Never | Never |
| Image OCR | No | Later, metered |
| Support | GitHub issues | Email / form (optional) |

**Placeholder price:** not decided (e.g. $5–12/month is a typical range for a small utility; lock in DECISIONS.md).

## Metering

If we meter, count **successful exports** (docx or html), not keystrokes. Store only `{ userId, day, count }` — not the document.

Anonymous users: IP or device fingerprint is hostile; prefer “free unlimited on static site” until login exists, then attach quota to account.

## Stripe artifacts (when implementing)

- Product: LaTeX to Word Pro
- Prices: monthly + optional yearly
- Checkout success URL → app with session
- Customer Portal for cancel / invoices
- Webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

Update this file when prices are real.
