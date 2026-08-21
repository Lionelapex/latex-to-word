# UI layout (paid product)

Status: **design intent**, not implemented. The live app is a simpler two-pane layout in `index.html`.

Visual direction: **office utility** (Word / Notion), not a SaaS marketing landing page. Neutral gray/white, **one** accent (blue), no gradients, no glass, no oversized hero.

## Desktop (primary)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  LaTeX to Word          [How it works]     Account ▾  Plan  [Upgrade]   │
│  Convert ChatGPT and LaTeX into editable Word.                           │
├──────────────────────────────┬───────────────────────────────────────────┤
│ INPUT                        │ PREVIEW                                   │
│ Math: Smart ▾                │ Converted  Warnings  Failed               │
│ [Paste] [Clear]              │ [Download .docx] [Download again] [HTML]   │
│                              │                                           │
│ ┌──────────────────────────┐ │  ┌─────────────────────────────────────┐  │
│ │ Paste ChatGPT, Markdown, │ │  │  (white page on gray canvas)        │  │
│ │ or LaTeX…                │ │  │  Headings, lists, tables, math      │  │
│ │                          │ │  │                                     │  │
│ └──────────────────────────┘ │  └─────────────────────────────────────┘  │
│ Processed locally in browser │  Detected: n headings, n tables, n eqns   │
└──────────────────────────────┴───────────────────────────────────────────┘
│ Footer: Privacy  Terms  Billing (Stripe portal)  GitHub                  │
└──────────────────────────────────────────────────────────────────────────┘
```

## Header (paid)

| Control | Purpose |
| --- | --- |
| Product name + short subtitle | Trust, search-friendly |
| Account menu | Sign in / out, email |
| Plan badge | Free / Pro |
| Upgrade | Stripe Checkout (hidden when Pro) |

Keep **How it works** as three short steps (paste → convert → download), not a long landing hero.

## Input column

Same as today: mode select, Paste, Clear, large textarea (preview auto-updates).

Optional later (free improvements, also useful for Pro):

- “Try an example” dropdown — **shipped**
- Autosave indicator — **shipped**

## Preview column

Same as today: stats, export buttons, Word-like page.

**Download .docx** is the export path into Word.

## Auth / billing screens (separate routes or modals)

Not part of the converter canvas:

1. **Sign in** — email magic link or OAuth; short; no illustration dump
2. **Pricing** — two columns: Free vs Pro, monthly price, what is limited
3. **Checkout** — Stripe-hosted Checkout (we do not design the card form)
4. **Billing** — link out to Stripe Customer Portal
5. **Quota exceeded** — modal on the converter: remaining count, Upgrade button, preview still visible if we allow it

## Mobile / narrow

Stack: header → input (textarea not tiny) → Convert → preview → export. Account in a simple menu. Desktop remains the design target (Word users on PC).

## What not to add

- Purple/neon gradients, glassmorphism, crypto cards
- Forcing users through a marketing homepage before the converter (optional thin marketing page at `/` later; converter can stay `/app`)

## Mapping to today’s DOM (for implementers)

Current IDs to keep unless we have a reason: `#input`, `#btn-paste`, `#btn-clear`, `#mode-select`, `#btn-docx`, `#btn-redownload`, `#btn-html`, `#preview`, `#stats`, `#btn-send-error-report`.
