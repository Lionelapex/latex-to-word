export const MAX_EXPORT_HISTORY = 5;

export function addExportEntry(history, entry, max = MAX_EXPORT_HISTORY) {
  const next = [entry, ...history.filter((item) => item.id !== entry.id)];
  return next.slice(0, max);
}

export function getLastExport(history, type = null) {
  if (type) return history.find((item) => item.type === type) || null;
  return history[0] || null;
}

export function createExportEntry(type, blob, filename, id = null, createdAt = Date.now()) {
  return {
    id: id || `${type}-${createdAt}`,
    type,
    filename,
    createdAt,
    blob,
  };
}
