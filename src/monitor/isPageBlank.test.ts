// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { isPageBlank } from "./isPageBlank.js";

/** 按 (x, y) 决定命中元素链的方式 stub document.elementsFromPoint */
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

/** 空壳链：SPA 未挂载时典型命中 [root, body, html] */
const BLANK_CHAIN = () => {
  const root = makeEl("div", { id: "root" });
  return [root, document.body, document.documentElement];
};

describe("isPageBlank（白屏检测）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("整页空白：九个点全白，判定白屏", () => {
    stubElementsFromPoint(() => BLANK_CHAIN());
    const result = isPageBlank();
    expect(result).toEqual({ blank: true, blankCount: 9, total: 9 });
  });

  it("中心区域有真实内容：非白", () => {
    stubElementsFromPoint((x, y) => {
      // 中央采样点（3x3 格子中心：x≈512, y≈384）
      if (x > 300 && x < 700 && y > 250 && y < 550) {
        const content = makeEl("p");
        return [content, ...BLANK_CHAIN()];
      }
      return BLANK_CHAIN();
    });
    const result = isPageBlank();
    expect(result.blank).toBe(false);
    expect(result.blankCount).toBe(8);
    expect(result.total).toBe(9);
  });

  it("threshold 调低后 8/9 白也判定白屏", () => {
    stubElementsFromPoint((x, y) => {
      if (x > 300 && x < 700 && y > 250 && y < 550) {
        return [makeEl("p"), ...BLANK_CHAIN()];
      }
      return BLANK_CHAIN();
    });
    expect(isPageBlank({ threshold: 0.8 }).blank).toBe(true);
    expect(isPageBlank({ threshold: 0.9 }).blank).toBe(false);
  });

  it("containers 自定义容器白名单", () => {
    const shell = makeEl("div", { class: "shell" });
    stubElementsFromPoint(() => [shell, document.body, document.documentElement]);
    // 默认白名单不认识 .shell，命中内容元素 → 非白
    expect(isPageBlank().blank).toBe(false);
    // 加入白名单 → 白
    expect(isPageBlank({ containers: [".shell"] }).blank).toBe(true);
  });

  it("默认白名单覆盖 React/Vue/Next 的挂载根", () => {
    const app = makeEl("div", { id: "app" });
    stubElementsFromPoint(() => [app, document.body, document.documentElement]);
    expect(isPageBlank().blank).toBe(true);
  });

  it("非法选择器不抛错", () => {
    stubElementsFromPoint(() => BLANK_CHAIN());
    expect(() => isPageBlank({ containers: ["[invalid"] })).not.toThrow();
  });

  it("非浏览器环境返回 blank: false，不抛错", () => {
    vi.stubGlobal("document", undefined);
    expect(isPageBlank()).toEqual({ blank: false, blankCount: 0, total: 0 });
  });

  it("环境不支持 elementsFromPoint 时返回 blank: false", () => {
    Object.defineProperty(document, "elementsFromPoint", { value: undefined, configurable: true });
    expect(isPageBlank()).toEqual({ blank: false, blankCount: 0, total: 0 });
  });
});
