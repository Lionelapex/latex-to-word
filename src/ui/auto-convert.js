export const AUTO_CONVERT_DELAY_MS = 350;

export function createAutoConvert(callback, delayMs = AUTO_CONVERT_DELAY_MS) {
  let timer = null;

  return {
    schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        callback();
      }, delayMs);
    },
    flush() {
      if (timer) clearTimeout(timer);
      timer = null;
      callback();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
    get pending() {
      return timer !== null;
    },
  };
}
