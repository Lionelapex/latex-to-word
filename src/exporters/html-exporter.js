import { renderToFragmentHTML } from "../renderers/html-renderer.js";
import { escapeHtml } from "../utils/xml.js";

export function documentToHtmlFile(documentModel) {
  const body = renderToFragmentHTML(documentModel);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>LaTeX to Word export</title>
  <style>
    body { font-family: Cambria, 'Times New Roman', serif; max-width: 800px; margin: 2rem auto; line-height: 1.5; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; }
    math { font-size: 1.05em; }
  </style>
</head>
<body>
${body}
<p><small>${escapeHtml("Your document is processed locally in your browser.")}</small></p>
</body>
</html>`;
}
