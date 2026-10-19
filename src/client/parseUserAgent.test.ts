import { describe, expect, it } from "vitest";
import { parseUserAgent, type UAInfo } from "./parseUserAgent.js";

describe("parseUserAgent", () => {
  it.each<{
    name: string;
    ua: string;
    expected: UAInfo;
  }>([
    {
      name: "Chrome 131 / Windows 10",
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      expected: {
        browser: "Chrome",
        browserVersion: "131.0.0.0",
        os: "Windows",
        osVersion: "10",
        deviceType: "desktop",
      },
    },
    {
      name: "Edge 优先于 Chrome（UA 同时包含两者标识）",
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.86",
      expected: {
        browser: "Edge",
        browserVersion: "131.0.2903.86",
        os: "Windows",
        osVersion: "10",
        deviceType: "desktop",
      },
    },
    {
      name: "Firefox 133 / Windows 10",
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
      expected: {
        browser: "Firefox",
        browserVersion: "133.0",
        os: "Windows",
        osVersion: "10",
        deviceType: "desktop",
      },
    },
    {
      name: "Safari 18 / macOS 10.15.7",
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
      expected: {
        browser: "Safari",
        browserVersion: "18.0",
        os: "macOS",
        osVersion: "10.15.7",
        deviceType: "desktop",
      },
    },
    {
      name: "Safari / iPhone（iOS 判断优先于 macOS）",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      expected: {
        browser: "Safari",
        browserVersion: "17.5",
        os: "iOS",
        osVersion: "17.5",
        deviceType: "mobile",
      },
    },
    {
      name: "Safari / iPad",
      ua: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      expected: {
        browser: "Safari",
        browserVersion: "17.5",
        os: "iOS",
        osVersion: "17.5",
        deviceType: "tablet",
      },
    },
    {
      name: "Chrome / Android 手机（含 Mobile 标识）",
      ua: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      expected: {
        browser: "Chrome",
        browserVersion: "131.0.0.0",
        os: "Android",
        osVersion: "13",
        deviceType: "mobile",
      },
    },
    {
      name: "Chrome / Android 平板（不含 Mobile 标识）",
      ua: "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      expected: {
        browser: "Chrome",
        browserVersion: "131.0.0.0",
        os: "Android",
        osVersion: "13",
        deviceType: "tablet",
      },
    },
    {
      name: "Chrome iOS 版（CriOS 标识）",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
      expected: {
        browser: "Chrome",
        browserVersion: "131.0.6778.73",
        os: "iOS",
        osVersion: "17.5",
        deviceType: "mobile",
      },
    },
    {
      name: "Firefox iOS 版（FxiOS 标识）",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15",
      expected: {
        browser: "Firefox",
        browserVersion: "132.0",
        os: "iOS",
        osVersion: "17.5",
        deviceType: "mobile",
      },
    },
    {
      name: "Opera（OPR 标识）优先于 Chrome",
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/116.0.0.0",
      expected: {
        browser: "Opera",
        browserVersion: "116.0.0.0",
        os: "Windows",
        osVersion: "10",
        deviceType: "desktop",
      },
    },
    {
      name: "旧版 Opera（Presto 内核，版本在 Version/ 中）",
      ua: "Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.16",
      expected: {
        browser: "Opera",
        browserVersion: "12.16",
        os: "Windows",
        osVersion: "7",
        deviceType: "desktop",
      },
    },
    {
      name: "IE11（无 MSIE 字样，版本在 rv: 中）",
      ua: "Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko",
      expected: {
        browser: "IE",
        browserVersion: "11.0",
        os: "Windows",
        osVersion: "7",
        deviceType: "desktop",
      },
    },
    {
      name: "微信内置浏览器（XWeb 内核，识别为 Chrome）",
      ua: "Mozilla/5.0 (Linux; Android 14; SM-G9910 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.49.2600",
      expected: {
        browser: "Chrome",
        browserVersion: "116.0.0.0",
        os: "Android",
        osVersion: "14",
        deviceType: "mobile",
      },
    },
    {
      name: "Linux 桌面 Chrome",
      ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      expected: {
        browser: "Chrome",
        browserVersion: "131.0.0.0",
        os: "Linux",
        osVersion: "",
        deviceType: "desktop",
      },
    },
    {
      name: "无法识别的 UA 全部返回 unknown",
      ua: "some-random-bot/1.0 (+http://example.com/bot)",
      expected: {
        browser: "unknown",
        browserVersion: "",
        os: "unknown",
        osVersion: "",
        deviceType: "unknown",
      },
    },
    {
      name: "Windows 7 Chrome（NT 6.1 映射为 7）",
      ua: "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      expected: {
        browser: "Chrome",
        browserVersion: "120.0.0.0",
        os: "Windows",
        osVersion: "7",
        deviceType: "desktop",
      },
    },
  ])("$name", ({ ua, expected }) => {
    expect(parseUserAgent(ua)).toEqual(expected);
  });
});
