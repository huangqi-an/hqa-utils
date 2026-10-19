import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { preloadImage } from "./preloadImage.js";

/** 可控的 Image 替身：捕获实例，手动触发 load/error */
const created: FakeImage[] = [];

class FakeImage {
  src = "";
  naturalWidth = 0;
  naturalHeight = 0;
  listeners = new Map<string, EventListener>();

  constructor() {
    created.push(this);
  }

  addEventListener(type: string, fn: EventListener): void {
    this.listeners.set(type, fn);
  }

  removeEventListener(type: string, fn: EventListener): void {
    if (this.listeners.get(type) === fn) this.listeners.delete(type);
  }

  fire(type: "load" | "error"): void {
    this.listeners.get(type)?.(new Event(type));
  }
}

beforeEach(() => {
  created.length = 0;
  vi.stubGlobal("Image", FakeImage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function findByUrl(url: string): FakeImage {
  // 取最后一个匹配实例：重试场景会创建新 Image，应操作最新的
  const matches = created.filter((i) => i.src === url);
  const img = matches[matches.length - 1];
  if (!img) throw new Error(`未找到 src 为 ${url} 的 Image 实例`);
  return img;
}

describe("preloadImage", () => {
  it("load 时 resolve 固有尺寸", async () => {
    const url = "https://cdn.example.com/a.png";
    const p = preloadImage(url);
    const img = findByUrl(url);
    expect(img.src).toBe(url);
    img.naturalWidth = 800;
    img.naturalHeight = 600;
    img.fire("load");
    await expect(p).resolves.toEqual({ width: 800, height: 600 });
  });

  it("error 时 reject，且重试可重新发起", async () => {
    const url = "https://cdn.example.com/bad.png";
    const first = preloadImage(url);
    findByUrl(url).fire("error");
    await expect(first).rejects.toThrow("图片加载失败");

    const second = preloadImage(url);
    const img = findByUrl(url);
    img.naturalWidth = 10;
    img.naturalHeight = 20;
    img.fire("load");
    await expect(second).resolves.toEqual({ width: 10, height: 20 });
  });

  it("相同 URL 去重复用同一 Promise，Image 只创建一次", async () => {
    const url = "https://cdn.example.com/dup.png";
    const a = preloadImage(url);
    const b = preloadImage(url);
    expect(created.length).toBe(1);
    findByUrl(url).fire("load");
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toEqual(rb);
  });

  it("成功后事件监听被清理", async () => {
    const url = "https://cdn.example.com/cleanup.png";
    const p = preloadImage(url);
    const img = findByUrl(url);
    img.fire("load");
    await p;
    expect(img.listeners.size).toBe(0);
  });

  it("SSR（无 Image）resolve 零尺寸", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("Image", undefined);
    await expect(preloadImage("https://cdn.example.com/ssr.png")).resolves.toEqual({
      width: 0,
      height: 0,
    });
  });
});
