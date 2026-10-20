// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onBlankScreen } from "./onBlankScreen.js";
import { isPageBlank } from "./isPageBlank.js";

function stubElementsFromPoint(byPoint: (x: number, y: number) => Element[]): void {
  Object.defineProperty(document, "elementsFromPoint", {
    value: vi.fn((x: number, y: number) => byPoint(x, y)),
    configurable: true,
  });
}

function makeEl(tag: string, attrs: Record<string, string> = {}): Element {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

const BLANK_CHAIN = () => [makeEl("div", { id: "root" }), document.body, document.documentElement];

describe("onBlankScreen（白屏轮询监测）", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 默认整页空白
    stubElementsFromPoint(() => BLANK_CHAIN());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("连续 3 次白屏后触发一次，携带最后一次结果", () => {
    const cb = vi.fn();
    onBlankScreen(cb);
    expect(cb).not.toHaveBeenCalled(); // immediate 首次检测是第 1 次，未达 3

    vi.advanceTimersByTime(2000); // 第 2 次
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000); // 第 3 次
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]?.[0]).toEqual({ blank: true, blankCount: 9, total: 9 });
  });

  it("持续白屏期间不重复回调", () => {
    const cb = vi.fn();
    onBlankScreen(cb);
    vi.advanceTimersByTime(20000); // 白屏持续 10 次
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("中途恢复会重置计数，恢复后再连续白屏才再次回调", () => {
    const cb = vi.fn();
    onBlankScreen(cb);
    vi.advanceTimersByTime(4000); // 连续 3 次白，第 1 次触发
    expect(cb).toHaveBeenCalledTimes(1);

    // 恢复：中心出现内容
    stubElementsFromPoint((x, y) => {
      if (x > 300 && x < 700 && y > 250 && y < 550) {
        return [makeEl("p"), ...BLANK_CHAIN()];
      }
      return BLANK_CHAIN();
    });
    vi.advanceTimersByTime(2000);
    expect(cb).toHaveBeenCalledTimes(1); // 非白，不触发

    // 再次全白
    stubElementsFromPoint(() => BLANK_CHAIN());
    vi.advanceTimersByTime(6000); // 重新累计 3 次（3 个 interval）
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("白-非白-白 抖动不触发（streak 重置）", () => {
    const cb = vi.fn();
    let blank = true;
    stubElementsFromPoint(() => (blank ? BLANK_CHAIN() : [makeEl("p"), ...BLANK_CHAIN()]));

    onBlankScreen(cb, { immediate: false });
    vi.advanceTimersByTime(2000); // 白 1
    blank = false;
    vi.advanceTimersByTime(2000); // 非白，重置
    blank = true;
    vi.advanceTimersByTime(2000); // 白 1（重新计）
    vi.advanceTimersByTime(2000); // 白 2
    expect(cb).not.toHaveBeenCalled();
  });

  it("immediate: false 时订阅时不立即检测", () => {
    const spy = vi.spyOn(document, "elementsFromPoint");
    const cb = vi.fn();
    onBlankScreen(cb, { immediate: false });
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(spy).toHaveBeenCalled();
  });

  it("consecutive 自定义：1 次白屏即触发", () => {
    const cb = vi.fn();
    onBlankScreen(cb, { immediate: false, consecutive: 1 });
    vi.advanceTimersByTime(2000);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("stop 后停止检测", () => {
    const spy = vi.spyOn(document, "elementsFromPoint");
    const stop = onBlankScreen(() => {}, { immediate: false });
    expect(spy).not.toHaveBeenCalled();
    stop();
    vi.advanceTimersByTime(10000);
    expect(spy).not.toHaveBeenCalled();
  });

  it("非浏览器环境返回 noop", () => {
    vi.stubGlobal("window", undefined);
    const stop = onBlankScreen(() => {});
    expect(() => stop()).not.toThrow();
  });

  it("containers 透传给 isPageBlank（immediate + consecutive:1 同步触发）", () => {
    const shell = makeEl("div", { class: "shell" });
    stubElementsFromPoint(() => [shell, document.body, document.documentElement]);
    const cb = vi.fn();
    onBlankScreen(cb, { consecutive: 1, containers: [".shell"] });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]?.[0]).toEqual({ blank: true, blankCount: 9, total: 9 });
    expect(isPageBlank({ containers: [".shell"] }).blank).toBe(true);
  });
});
