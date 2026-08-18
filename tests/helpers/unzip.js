import JSZip from "jszip";

export async function unzipDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const files = {};
  const names = Object.keys(zip.files);
  for (const name of names) {
    if (zip.files[name].dir) continue;
    files[name] = await zip.files[name].async("string");
  }
  return files;
}

export function documentXml(files) {
  return files["word/document.xml"] || "";
}
