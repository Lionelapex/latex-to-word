import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AUTO_CONVERT_DELAY_MS, createAutoConvert } from "../../src/ui/auto-convert.js";

describe("auto convert scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces conversion until typing pauses", () => {
    const callback = vi.fn();
    const autoConvert = createAutoConvert(callback, AUTO_CONVERT_DELAY_MS);

    autoConvert.schedule();
    autoConvert.schedule();
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(AUTO_CONVERT_DELAY_MS - 1);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("flushes pending conversion immediately", () => {
    const callback = vi.fn();
    const autoConvert = createAutoConvert(callback, AUTO_CONVERT_DELAY_MS);

    autoConvert.schedule();
    autoConvert.flush();
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(AUTO_CONVERT_DELAY_MS);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending conversion", () => {
    const callback = vi.fn();
    const autoConvert = createAutoConvert(callback, AUTO_CONVERT_DELAY_MS);

    autoConvert.schedule();
    autoConvert.cancel();
    vi.advanceTimersByTime(AUTO_CONVERT_DELAY_MS);
    expect(callback).not.toHaveBeenCalled();
  });
});
