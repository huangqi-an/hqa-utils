import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientInfo } from "./getClientInfo.js";

const CHROME_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** mock 一套完整的浏览器全局环境 */
function stubBrowserEnv(extraNavigator: Record<string, unknown> = {}) {
  vi.stubGlobal("window", {
    document: {},
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 2,
  });
  vi.stubGlobal("navigator", {
    userAgent: CHROME_WIN,
    language: "zh-CN",
    languages: ["zh-CN", "en"],
    maxTouchPoints: 5,
    ...extraNavigator,
  });
  vi.stubGlobal("screen", { width: 2560, height: 1440, colorDepth: 24 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getClientInfo", () => {
  it("浏览器环境下返回完整信息", () => {
    stubBrowserEnv({ connection: { effectiveType: "4g" } });
    expect(getClientInfo()).toEqual({
      userAgent: CHROME_WIN,
      language: "zh-CN",
      languages: ["zh-CN", "en"],
      timezone: expect.any(String),
      screenWidth: 2560,
      screenHeight: 1440,
      viewportWidth: 1920,
      viewportHeight: 1080,
      devicePixelRatio: 2,
      colorDepth: 24,
      touchPoints: 5,
      networkType: "4g",
    });
  });

  it("Node / SSR 环境下所有字段为 null", () => {
    expect(getClientInfo()).toEqual({
      userAgent: null,
      language: null,
      languages: null,
      timezone: null,
      screenWidth: null,
      screenHeight: null,
      viewportWidth: null,
      viewportHeight: null,
      devicePixelRatio: null,
      colorDepth: null,
      touchPoints: null,
      networkType: null,
    });
  });

  it("浏览器不支持 Network Information API 时 networkType 为 null", () => {
    stubBrowserEnv();
    const info = getClientInfo();
    expect(info.networkType).toBeNull();
  });

  it("无触屏设备（maxTouchPoints 为 0）touchPoints 为 null", () => {
    stubBrowserEnv({ maxTouchPoints: 0 });
    expect(getClientInfo().touchPoints).toBeNull();
  });

  it("languages 为空数组时返回 null", () => {
    stubBrowserEnv({ languages: [] });
    expect(getClientInfo().languages).toBeNull();
  });

  it("userAgent 为空字符串时返回 null", () => {
    stubBrowserEnv({ userAgent: "" });
    expect(getClientInfo().userAgent).toBeNull();
  });

  it("timezone 返回合法的 IANA 时区字符串（含斜杠或 UTC）", () => {
    stubBrowserEnv();
    const tz = getClientInfo().timezone;
    expect(tz).toBeTruthy();
    expect(tz).toMatch(/^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/);
  });

  it("返回的 languages 是快照拷贝，修改不影响后续调用", () => {
    stubBrowserEnv();
    const first = getClientInfo();
    (first.languages as string[]).push("ja-JP");
    expect(getClientInfo().languages).toEqual(["zh-CN", "en"]);
  });
});
