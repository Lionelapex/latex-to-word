# SEO

Status: **shipped** for the static converter at https://latextodocx.com/.

Search discovery for queries like **latex to word**, **latex word**, **latex2word**, and **chatgpt to word** without sending document content to a server.

## What we ship

| Asset | Role |
| --- | --- |
| `index.html` title / description / keywords | Primary ranking signals + SERP snippet |
| Open Graph + Twitter cards | Link previews |
| Canonical `https://latextodocx.com/` | Prefer custom domain over github.io |
| WebApplication JSON-LD | App identity |
| FAQPage JSON-LD | FAQ rich results for common queries |
| Crawlable How it works + FAQ below the converter | Keyword-rich copy without blocking the tool UX |
| `public/robots.txt` | Allow crawl; point to sitemap |
| `public/sitemap.xml` | Single URL: site root |

Vite copies `public/` into `dist/` on build (GitHub Actions Pages deploy).

## Privacy boundary

SEO copy and structured data are static. They never include user paste. Conversion remains local; see [PRIVACY.md](PRIVACY.md).

## Operator follow-ups (not in repo)

1. Google Search Console → property `https://latextodocx.com/` → submit `https://latextodocx.com/sitemap.xml`.
2. Confirm custom domain DNS + Pages HTTPS.
3. After deploy, spot-check [rich results](https://search.google.com/test/rich-results) for FAQPage / WebApplication.
4. Optional: Bing Webmaster Tools with the same sitemap.

## Do not

- Keyword-stuff the converter chrome or hide text with CSS tricks
- Add a second marketing SPA that duplicates the converter
- Put secrets or user documents in meta tags
