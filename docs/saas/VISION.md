# Paid product vision

Status: **planned**. Not implemented.

## Problem

At work, people paste LaTeX (and ChatGPT-style Markdown + math) into Word and then convert equations by hand. The free tool already does: paste → convert → editable Word equations.

Paid SaaS is for **access, limits, and extras** — not for moving math parsing onto a server.

## What we sell

A hosted converter with:

- The same local conversion quality (OMML, tables, lists)
- Account + monthly/annual subscription (Stripe)
- Fair-use or plan limits on the free public site vs Pro
- Later extras: smarter filenames, session restore, samples, image OCR (if we ever add it, **paid** and **server-side**, with an honest privacy update)

## What we do not sell as v1 SaaS

- A generic LaTeX editor
- A Word replacement
- “AI that understands your document” unless we later decide that (would break local-only conversion)

## Success

A subscriber can: sign in, convert as today, download `.docx` / HTML, manage billing in Stripe Customer Portal, cancel without a support ticket.

## Positioning

Professional office utility: ChatGPT / LaTeX → Word. Calm UI, not a marketing landing page. See [UI-LAYOUT.md](UI-LAYOUT.md).
