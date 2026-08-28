import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractTextFromImage } from "../src/ui/image-ocr.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "../tests/fixtures/hello-ocr.png");
const imagePath = process.argv[2] || fixturePath;

if (!existsSync(imagePath)) {
  console.error(`Missing image: ${imagePath}`);
  console.error("Run: powershell -ExecutionPolicy Bypass -File scripts/generate-ocr-fixture.ps1");
  process.exit(1);
}

console.log(`OCR on: ${imagePath}`);
const buffer = readFileSync(imagePath);
const text = await extractTextFromImage(buffer, {
  onProgress: (progress) => {
    const pct = Math.round(progress * 100);
    if (pct % 25 === 0) process.stdout.write(`\rProgress: ${pct}%`);
  },
});
console.log(`\nExtracted:\n${text}\n`);

if (!/hello/i.test(text) && !/ocr/i.test(text)) {
  console.error("OCR verification failed: expected 'Hello' or 'OCR' in output.");
  process.exit(1);
}

console.log("OCR verification passed.");
