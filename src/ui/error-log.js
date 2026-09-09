import { addErrorEntry, MAX_ERROR_LOG } from "../utils/error-log.js";

const DB_NAME = "latex-to-word-errors";
const DB_VERSION = 1;
const STORE = "errors";

export class ErrorLog {
  constructor(max = MAX_ERROR_LOG) {
    this.max = max;
    this.entries = [];
    this.ready = this.hydrate();
  }

  async hydrate() {
    const stored = await readAllFromIndexedDB();
    this.entries = stored.slice(0, this.max);
  }

  async record(entry) {
    if (!entry) return null;
    await this.ready;
    this.entries = addErrorEntry(this.entries, entry, this.max);
    await replaceAllInIndexedDB(this.entries);
    return this.entries[0];
  }

  list() {
    return [...this.entries];
  }

  count() {
    return this.entries.length;
  }

  async clear() {
    await this.ready;
    this.entries = [];
    await replaceAllInIndexedDB([]);
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

async function replaceAllInIndexedDB(entries) {
  const db = await openDatabase().catch(() => null);
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      for (const entry of entries) {
        store.put(entry);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export const errorLog = new ErrorLog();
