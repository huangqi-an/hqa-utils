// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestNotificationPermission } from "./requestNotificationPermission.js";

type RequestPermissionMock = (callback?: (state: string) => void) => Promise<string> | undefined;

function stubNotification(requestPermission: RequestPermissionMock): void {
  vi.stubGlobal("Notification", { requestPermission });
}

describe("requestNotificationPermission（申请通知授权）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Promise 式 API：透传授权结果", async () => {
    stubNotification(vi.fn(async () => "granted" as string));
    await expect(requestNotificationPermission()).resolves.toBe("granted");
  });

  it("用户关闭授权框 → default", async () => {
    stubNotification(vi.fn(async () => "default" as string));
    await expect(requestNotificationPermission()).resolves.toBe("default");
  });

  it("旧版 Safari 仅回调式签名：经回调 resolve", async () => {
    const requestPermission = vi.fn((callback?: (state: string) => void) => {
      // 旧 Safari：返回 undefined，只走回调
      setTimeout(() => callback?.("denied"), 0);
      return undefined;
    });
    stubNotification(requestPermission);
    await expect(requestNotificationPermission()).resolves.toBe("denied");
  });

  it("回调与 Promise 双通道并存时只取第一个结果", async () => {
    const requestPermission = vi.fn((callback?: (state: string) => void) => {
      // 新版浏览器：回调与 Promise 都触发，且顺序不定
      callback?.("granted");
      return Promise.resolve("denied");
    });
    stubNotification(requestPermission);
    await expect(requestNotificationPermission()).resolves.toBe("granted");
  });

  it("requestPermission reject 时返回 null 不抛错", async () => {
    stubNotification(vi.fn(async () => {
      throw new Error("blocked");
    }));
    await expect(requestNotificationPermission()).resolves.toBeNull();
  });

  it("非浏览器环境返回 null", async () => {
    vi.stubGlobal("window", undefined);
    await expect(requestNotificationPermission()).resolves.toBeNull();
  });
});
