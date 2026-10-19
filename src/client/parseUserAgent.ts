export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export interface UAInfo {
  /** 浏览器名称：Chrome / Safari / Firefox / Edge / Opera / IE，无法识别时为 "unknown" */
  browser: string;
  /** 浏览器完整版本号（如 "131.0.2903.86"），无法识别时为空字符串 */
  browserVersion: string;
  /** 操作系统名称：Windows / macOS / iOS / Android / Linux，无法识别时为 "unknown" */
  os: string;
  /** 操作系统版本号（如 "10"、"17.5"），无法识别时为空字符串 */
  osVersion: string;
  /** 设备类型 */
  deviceType: DeviceType;
}

/** 取正则第一个捕获组，未命中返回空字符串 */
function match(ua: string, re: RegExp): string {
  const m = ua.match(re);
  return m?.[1] ?? "";
}

/**
 * 从 UA 中识别 Windows NT 版本号到用户可读的版本名
 * 注意：Windows 11 的 UA 仍是 NT 10.0，无法与 Windows 10 区分
 */
const WINDOWS_VERSION_MAP: Record<string, string> = {
  "10.0": "10",
  "6.3": "8.1",
  "6.2": "8",
  "6.1": "7",
  "6.0": "Vista",
  "5.2": "XP",
  "5.1": "XP",
};

function detectBrowser(ua: string): { name: string; version: string } {
  // 顺序敏感：Edge 的 UA 同时包含 Chrome 和 Safari，
  // Chrome 的 UA 包含 Safari，必须从特异到一般依次匹配
  if (/Edg(?:e|A|iOS)?\//.test(ua)) {
    return { name: "Edge", version: match(ua, /Edg(?:e|A|iOS)?\/([\d.]+)/) };
  }
  if (/OPR\//.test(ua) || /Opera/.test(ua)) {
    // 新版 Opera（Blink 内核）版本在 OPR/，旧版（Presto 内核）在 Version/
    const version = match(ua, /OPR\/([\d.]+)/) || match(ua, /Version\/([\d.]+)/);
    return { name: "Opera", version };
  }
  if (/Firefox\/|FxiOS\//.test(ua)) {
    return { name: "Firefox", version: match(ua, /(?:Firefox|FxiOS)\/([\d.]+)/) };
  }
  if (/Chrome\/|CriOS\//.test(ua)) {
    return { name: "Chrome", version: match(ua, /(?:Chrome|CriOS)\/([\d.]+)/) };
  }
  if (/Safari\//.test(ua)) {
    // Safari 版本在 Version/ 中，Safari/ 后跟的是 WebKit 版本
    return { name: "Safari", version: match(ua, /Version\/([\d.]+)/) };
  }
  if (/MSIE |Trident\//.test(ua)) {
    // IE11 的 UA 无 MSIE 字样，版本在 rv: 中
    return { name: "IE", version: match(ua, /MSIE ([\d.]+)/) || match(ua, /rv:([\d.]+)/) };
  }
  return { name: "unknown", version: "" };
}

function detectOS(ua: string): { name: string; version: string } {
  // iOS 判断必须在 macOS 之前：iPhone/iPad 的 UA 也包含 "like Mac OS X"
  const iosVersion =
    match(ua, /iPhone OS (\d+(?:_\d+)*)/) || match(ua, /CPU OS (\d+(?:_\d+)*)/);
  if (iosVersion) {
    return { name: "iOS", version: iosVersion.replace(/_/g, ".") };
  }
  const androidVersion = match(ua, /Android (\d+(?:\.\d+)*)/);
  if (androidVersion) {
    return { name: "Android", version: androidVersion };
  }
  const winVersion = match(ua, /Windows NT ([\d.]+)/);
  if (winVersion) {
    return {
      name: "Windows",
      version: WINDOWS_VERSION_MAP[winVersion] ?? winVersion,
    };
  }
  const macVersion = match(ua, /Mac OS X (\d+(?:_\d+)*)/);
  if (macVersion) {
    return { name: "macOS", version: macVersion.replace(/_/g, ".") };
  }
  if (/Linux/.test(ua)) {
    return { name: "Linux", version: "" };
  }
  return { name: "unknown", version: "" };
}

function detectDeviceType(ua: string): DeviceType {
  if (/iPad|Tablet/.test(ua)) return "tablet";
  // Android 平板的 UA 不含 "Mobile"，手机含（业界通用判别法）
  if (/Android/.test(ua)) return /\bMobile\b/.test(ua) ? "mobile" : "tablet";
  if (/\b(?:iPhone|iPod|Windows Phone)\b/.test(ua)) return "mobile";
  if (/Safari|Chrome|Firefox|Gecko|AppleWebKit|Opera/.test(ua)) return "desktop";
  return "unknown";
}

/**
 * 解析 User-Agent 字符串，提取浏览器、操作系统与设备类型信息
 *
 * 零依赖的轻量实现，覆盖主流浏览器与操作系统的常见场景；
 * 无法识别的字段返回 "unknown" 或空字符串。
 *
 * 已知局限：
 * - Windows 11 的 UA 与 Windows 10 相同（NT 10.0），统一识别为 "10"
 * - iPadOS 13+ 桌面模式伪装成 macOS Safari UA，会识别为 macOS desktop
 * - iOS 上所有第三方浏览器的内核均为 WKWebView，仅名称/版本可能准确
 *
 * @param ua User-Agent 字符串
 * @example
 * parseUserAgent(
 *   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
 * );
 * // => { browser: "Chrome", browserVersion: "131.0.0.0", os: "Windows", osVersion: "10", deviceType: "desktop" }
 */
export function parseUserAgent(ua: string): UAInfo {
  const browser = detectBrowser(ua);
  const os = detectOS(ua);
  return {
    browser: browser.name,
    browserVersion: browser.version,
    os: os.name,
    osVersion: os.version,
    deviceType: detectDeviceType(ua),
  };
}
