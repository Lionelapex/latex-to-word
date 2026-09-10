# SaaS and living documentation

This folder is the **source of truth for product and architecture** as we build a paid subscription version of LaTeX to Word.

Use it when:

- You open a **new Cursor chat** on another PC
- You need the **current free app** vs **planned paid product**
- You add features, billing, or UI — **update these files in the same change**

## Start here (agents)

| Order | File | What it is |
| --- | --- | --- |
| 1 | [CURRENT-PRODUCT.md](CURRENT-PRODUCT.md) | Live free app: stack, pipeline, URLs, constraints |
| 2 | [VISION.md](VISION.md) | What the paid product is for |
| 3 | [ARCHITECTURE.md](ARCHITECTURE.md) | Accounts, Stripe, entitlements; conversion stays local |
| 4 | [AUTH.md](AUTH.md) | Supabase Auth setup, env vars, redirect URLs, sign-in flow |
| 5 | [UI-LAYOUT.md](UI-LAYOUT.md) | How the paid UI should look (layout, not implementation) |
| 6 | [PRICING.md](PRICING.md) | Draft plans + anonymous 3-export trial (live) |
| 7 | [PRIVACY.md](PRIVACY.md) | What we can claim about local processing |
| 8 | [SEO.md](SEO.md) | Meta, FAQ, robots/sitemap for latextodocx.com |
| 9 | [ROADMAP.md](ROADMAP.md) | Build order |
| 10 | [DECISIONS.md](DECISIONS.md) | Dated decisions (append, do not rewrite history) |
| 11 | [CHANGELOG.md](CHANGELOG.md) | What we shipped in docs/product |

Existing converter technical notes (free app): [../TECH.md](../TECH.md).

## Product names

| Name | Use |
| --- | --- |
| **LaTeX to Word** | User-facing name |
| `math-to-word` | Local folder, npm package name |
| `latex-to-word` | GitHub repo, GitHub Pages path |

## Links

- Live (free): https://latextodocx.com/
- Repo: https://github.com/Lionelapex/latex-to-word
- GitHub user: https://github.com/Lionelapex

## How to keep this folder honest

1. Implementation without a doc update is incomplete.
2. Speculative ideas go in VISION or ROADMAP with status **planned**, not as if they shipped.
3. If we reverse a decision, add a new row in DECISIONS.md; strike through the old one in place.
