// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { getConnectionInfo } from "./getConnectionInfo.js";

describe("getConnectionInfo（网络质量信息）", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "connection");
  });

  it("无 connection API 时返回 null（jsdom 默认）", () => {
    expect(getConnectionInfo()).toBeNull();
  });

  it("有 connection API 时返回映射字段", () => {
    Object.defineProperty(navigator, "connection", {
      value: { effectiveType: "4g", downlink: 10, rtt: 50, saveData: false },
      configurable: true,
    });
    expect(getConnectionInfo()).toEqual({
      effectiveType: "4g",
      downlink: 10,
      rtt: 50,
      saveData: false,
    });
  });

  it("connection 字段缺失时给出默认值", () => {
    Object.defineProperty(navigator, "connection", {
      value: { effectiveType: "3g" },
      configurable: true,
    });
    expect(getConnectionInfo()).toEqual({
      effectiveType: "3g",
      downlink: 0,
      rtt: 0,
      saveData: false,
    });
  });

  it("非浏览器环境返回 null", () => {
    vi.stubGlobal("window", undefined);
    expect(getConnectionInfo()).toBeNull();
  });
});
