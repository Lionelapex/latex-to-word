# Privacy

## Today (free GitHub Pages app)

**True and required:** pasted content is processed **only in the browser**. No accounts, no upload, no analytics of document text.

UI copy: *Your document is processed locally in your browser.*

Do not add analytics that send paste contents. Page views without content are a later optional decision.

## After SaaS accounts

Still true **if** we follow [ARCHITECTURE.md](ARCHITECTURE.md):

- Conversion still local
- Server stores email, auth ids, plan, usage counts
- Server does **not** store LaTeX or .docx

Privacy policy must list: auth provider, Stripe (payment data on Stripe’s side), hosting.

## If we add image OCR or any server-side parse

We **must** drop or qualify the local-only claim:

- Images (and maybe derived LaTeX) go to our API and/or a vendor
- Retention: delete immediately after OCR unless the user opts into history
- Pro-only, disclosed in UI before upload

## Agent rule

Never implement “save documents in the cloud” without a DECISIONS.md entry and a privacy copy change.
