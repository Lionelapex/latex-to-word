import Tesseract from "tesseract.js";

const DEFAULT_LANG = "eng";

export function isImageFile(file) {
  return Boolean(file?.type?.startsWith("image/"));
}

export function getImageFileFromDataTransfer(dataTransfer) {
  if (!dataTransfer?.items) return null;
  for (const item of dataTransfer.items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
}

export function formatOcrProgress(progress) {
  const percent = Math.max(0, Math.min(100, Math.round((progress || 0) * 100)));
  return `Reading image… ${percent}%`;
}

export async function extractTextFromImage(source, { lang = DEFAULT_LANG, onProgress } = {}) {
  const result = await Tesseract.recognize(source, lang, {
    logger: (message) => {
      if (message.status === "recognizing text" && onProgress) {
        onProgress(message.progress ?? 0);
      }
    },
  });
  return (result.data.text || "").trim();
}
