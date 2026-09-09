import {
  MAX_EXPORT_HISTORY,
  addExportEntry,
  createExportEntry,
  getLastExport,
} from "../utils/export-history.js";

const DB_NAME = "latex-to-word";
const DB_VERSION = 1;
const STORE = "exports";

export class ExportCache {
  constructor(max = MAX_EXPORT_HISTORY) {
    this.max = max;
    this.entries = [];
    this.ready = this.hydrate();
  }

  async hydrate() {
    const stored = await readAllFromIndexedDB();
    this.entries = stored.slice(0, this.max);
  }

  async add(type, blob, filename) {
    await this.ready;
    const entry = createExportEntry(type, blob, filename);
    this.entries = addExportEntry(this.entries, entry, this.max);
    await writeEntryToIndexedDB(entry);
    await trimIndexedDB(this.max);
    return entry;
  }

  getLast(type = null) {
    return getLastExport(this.entries, type);
  }

  getById(id) {
    return this.entries.find((entry) => entry.id === id) || null;
  }

  list() {
    return [...this.entries];
  }
}

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function readAllFromIndexedDB() {
  const db = await openDatabase().catch(() => null);
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const entries = (request.result || []).sort((a, b) => b.createdAt - a.createdAt);
      resolve(entries);
    };
    request.onerror = () => resolve([]);
  });
}

async function writeEntryToIndexedDB(entry) {
  const db = await openDatabase().catch(() => null);
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function trimIndexedDB(max) {
  const db = await openDatabase().catch(() => null);
  if (!db) return;
  const entries = await readAllFromIndexedDB();
  for (const stale of entries.slice(max)) {
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(stale.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}

export const exportCache = new ExportCache();
