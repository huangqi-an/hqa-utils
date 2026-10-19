import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isAndroid,
  isDesktop,
  isIOS,
  isLinux,
  isMac,
  isMobile,
  isTablet,
  isWeChat,
  isWindows,
} from "./platform.js";

const CHROME_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const SAFARI_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const SAFARI_IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID_PHONE =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const CHROME_ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const CHROME_LINUX =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const WECHAT_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-G9910 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.49.2600";

/** mock navigator 全局对象，maxTouchPoints 默认 0（桌面设备无触屏） */
function stubUA(ua: string, maxTouchPoints = 0) {
  vi.stubGlobal("navigator", { userAgent: ua, maxTouchPoints });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isIOS", () => {
  it("iPhone UA 返回 true", () => {
    stubUA(SAFARI_IPHONE);
    expect(isIOS()).toBe(true);
  });

  it("iPad UA 返回 true", () => {
    stubUA(SAFARI_IPAD);
    expect(isIOS()).toBe(true);
  });

  it("iPadOS 13+ 桌面模式（Mac UA + 多点触控）返回 true", () => {
    stubUA(SAFARI_MAC, 5);
    expect(isIOS()).toBe(true);
  });

  it("桌面 Mac（无多点触控）返回 false", () => {
    stubUA(SAFARI_MAC);
    expect(isIOS()).toBe(false);
  });

  it("Windows UA 返回 false", () => {
    stubUA(CHROME_WIN);
    expect(isIOS()).toBe(false);
  });
});

describe("isAndroid", () => {
  it("Android 手机与平板 UA 均返回 true", () => {
    stubUA(CHROME_ANDROID_PHONE);
    expect(isAndroid()).toBe(true);
    stubUA(CHROME_ANDROID_TABLET);
    expect(isAndroid()).toBe(true);
  });

  it("桌面 Linux UA 返回 false", () => {
    stubUA(CHROME_LINUX);
    expect(isAndroid()).toBe(false);
  });

  it("Windows UA 返回 false", () => {
    stubUA(CHROME_WIN);
    expect(isAndroid()).toBe(false);
  });
});

describe("isMac", () => {
  it("macOS UA 返回 true", () => {
    stubUA(SAFARI_MAC);
    expect(isMac()).toBe(true);
  });

  it("iPhone UA 返回 false（其 UA 含 like Mac OS X，需排除）", () => {
    stubUA(SAFARI_IPHONE);
    expect(isMac()).toBe(false);
  });

  it("Windows UA 返回 false", () => {
    stubUA(CHROME_WIN);
    expect(isMac()).toBe(false);
  });
});

describe("isWindows", () => {
  it("Windows UA 返回 true", () => {
    stubUA(CHROME_WIN);
    expect(isWindows()).toBe(true);
  });

  it("macOS UA 返回 false", () => {
    stubUA(SAFARI_MAC);
    expect(isWindows()).toBe(false);
  });
});

describe("isLinux", () => {
  it("桌面 Linux UA 返回 true", () => {
    stubUA(CHROME_LINUX);
    expect(isLinux()).toBe(true);
  });

  it("Android UA 返回 false（Android 是独立平台）", () => {
    stubUA(CHROME_ANDROID_PHONE);
    expect(isLinux()).toBe(false);
  });
});

describe("isMobile", () => {
  it("iPhone 与 Android 手机 UA 返回 true", () => {
    stubUA(SAFARI_IPHONE);
    expect(isMobile()).toBe(true);
    stubUA(CHROME_ANDROID_PHONE);
    expect(isMobile()).toBe(true);
  });

  it("Android 平板返回 false（属于 tablet）", () => {
    stubUA(CHROME_ANDROID_TABLET);
    expect(isMobile()).toBe(false);
  });

  it("桌面 UA 返回 false", () => {
    stubUA(CHROME_WIN);
    expect(isMobile()).toBe(false);
  });
});

describe("isTablet", () => {
  it("iPad 与 Android 平板 UA 返回 true", () => {
    stubUA(SAFARI_IPAD);
    expect(isTablet()).toBe(true);
    stubUA(CHROME_ANDROID_TABLET);
    expect(isTablet()).toBe(true);
  });

  it("Android 手机返回 false（属于 mobile）", () => {
    stubUA(CHROME_ANDROID_PHONE);
    expect(isTablet()).toBe(false);
  });
});

describe("isDesktop", () => {
  it("Windows / macOS / Linux 桌面 UA 返回 true", () => {
    stubUA(CHROME_WIN);
    expect(isDesktop()).toBe(true);
    stubUA(SAFARI_MAC);
    expect(isDesktop()).toBe(true);
    stubUA(CHROME_LINUX);
    expect(isDesktop()).toBe(true);
  });

  it("iPhone UA 返回 false", () => {
    stubUA(SAFARI_IPHONE);
    expect(isDesktop()).toBe(false);
  });
});

describe("isWeChat", () => {
  it("微信 UA 返回 true", () => {
    stubUA(WECHAT_ANDROID);
    expect(isWeChat()).toBe(true);
  });

  it("普通 Chrome UA 返回 false", () => {
    stubUA(CHROME_WIN);
    expect(isWeChat()).toBe(false);
  });
});

describe("无 UA 环境（Node / SSR）", () => {
  it("所有平台检测函数返回 false", () => {
    vi.stubGlobal("navigator", undefined);
    expect(isIOS()).toBe(false);
    expect(isAndroid()).toBe(false);
    expect(isMac()).toBe(false);
    expect(isWindows()).toBe(false);
    expect(isLinux()).toBe(false);
    expect(isMobile()).toBe(false);
    expect(isTablet()).toBe(false);
    expect(isDesktop()).toBe(false);
    expect(isWeChat()).toBe(false);
  });
});
