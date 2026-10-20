# client 客户端信息

环境守卫、User-Agent 解析、平台检测与客户端环境快照。

| 导出 | 说明 |
| --- | --- |
| `isBrowser()` | 是否浏览器环境 |
| `getUserAgent()` | 安全获取 User-Agent |
| `parseUserAgent(ua)` | 解析 UA 字符串 |
| `isIOS` / `isAndroid` / `isMac` / `isWindows` / `isLinux` | 平台检测 |
| `isMobile` / `isTablet` / `isDesktop` | 设备类型检测 |
| `isWeChat()` | 微信内置浏览器检测 |
| `getClientInfo()` | 客户端环境信息快照 |

## isBrowser() / getUserAgent()

环境守卫：判断是否浏览器环境、安全获取 User-Agent。

```ts
import { isBrowser, getUserAgent } from "@huangqi_an/hqa-utils";

if (isBrowser()) {
  document.title = "hello";
}

const ua = getUserAgent(); // 浏览器: "Mozilla/5.0 ..."；Node / SSR: null
```

## parseUserAgent(ua)

解析 User-Agent 字符串，提取浏览器 / 操作系统 / 设备类型，零依赖轻量实现。

```ts
import { parseUserAgent } from "@huangqi_an/hqa-utils";

const info = parseUserAgent(navigator.userAgent);
// {
//   browser: "Chrome", browserVersion: "131.0.0.0",
//   os: "Windows", osVersion: "10",
//   deviceType: "desktop" // "mobile" | "tablet" | "desktop" | "unknown"
// }
```

已知局限：

- Windows 11 的 UA 与 Windows 10 相同（NT 10.0），统一识别为 `"10"`
- iPadOS 13+ 桌面模式伪装成 macOS Safari UA，会识别为 macOS desktop
- iOS 上所有第三方浏览器内核均为 WKWebView，仅名称 / 版本可能准确

## 平台检测：isIOS / isAndroid / isMac / isWindows / isLinux / isMobile / isTablet / isDesktop / isWeChat

全部基于当前 UA 判断，无 UA（Node / SSR）时一律返回 `false`。

```ts
import { isIOS, isWeChat } from "@huangqi_an/hqa-utils";

if (isIOS()) {
  // iOS 特有逻辑，如处理安全区
}
if (isWeChat()) {
  // 微信内置浏览器，接入 JS-SDK
}
```

- `isIOS()` 兼容 iPadOS 13+ 桌面模式（Mac UA + 多点触控特征）
- `isMac()` 在 iPadOS 13+ 桌面模式下会与 `isIOS()` 同时返回 true（UA 无法区分），需区分时以 `isIOS()` 为准
- Android 平板 / 手机的区分依据 UA 中的 `Mobile` 标识

## getClientInfo()

一次性收集客户端环境信息快照，非浏览器环境返回全 `null` 字段对象，不抛错。

```ts
import { getClientInfo, parseUserAgent } from "@huangqi_an/hqa-utils";

const info = getClientInfo();
// {
//   userAgent, language: "zh-CN", languages: ["zh-CN", "en"], timezone: "Asia/Shanghai",
//   screenWidth: 2560, screenHeight: 1440, viewportWidth: 1920, viewportHeight: 1080,
//   devicePixelRatio: 2, colorDepth: 24, touchPoints: 5, networkType: "4g"
// }

// 组合 UA 解析获得完整画像
const ua = info.userAgent ? parseUserAgent(info.userAgent) : null;
```

- `networkType` 依赖 Network Information API（Chrome 系支持），不支持的浏览器为 `null`
- 各字段相互独立，单个字段取不到时仅该字段为 `null`
