import { getUserAgent } from "./env.js";
import { parseUserAgent } from "./parseUserAgent.js";

/**
 * 是否 iOS 设备（iPhone / iPod / iPad）
 *
 * 兼容 iPadOS 13+ 桌面模式：此时 UA 伪装成 macOS Safari，
 * 但会保留多点触控特征（navigator.maxTouchPoints > 1）。
 * 无 UA（Node / SSR）时返回 false。
 * @example
 * if (isIOS()) {
 *   // 处理 iOS 特有逻辑，如禁用 300ms 延迟、处理安全区
 * }
 */
export function isIOS(): boolean {
  const ua = getUserAgent();
  if (!ua) return false;
  if (/iPhone|iPod|iPad/.test(ua)) return true;
  return (
    /Macintosh/.test(ua) &&
    typeof navigator !== "undefined" &&
    navigator.maxTouchPoints > 1
  );
}

/**
 * 是否 Android 设备，无 UA 时返回 false
 */
export function isAndroid(): boolean {
  const ua = getUserAgent();
  return ua !== null && /Android/.test(ua);
}

/**
 * 是否桌面版 macOS
 *
 * 注意：iPadOS 13+ 桌面模式的 UA 与 macOS 相同，
 * 此时 isMac() 与 isIOS() 会同时返回 true，如需区分请以 isIOS() 为准。
 * 无 UA 时返回 false。
 */
export function isMac(): boolean {
  const ua = getUserAgent();
  if (!ua) return false;
  // iPhone/iPad 的 UA 也包含 "like Mac OS X"，需要排除
  return /Macintosh|Mac OS X/.test(ua) && !/iPhone|iPod|iPad/.test(ua);
}

/**
 * 是否 Windows（桌面版），无 UA 时返回 false
 */
export function isWindows(): boolean {
  const ua = getUserAgent();
  return ua !== null && /Windows/.test(ua) && !/Windows Phone/.test(ua);
}

/**
 * 是否桌面版 Linux（Android 属于独立平台，不算 Linux），无 UA 时返回 false
 */
export function isLinux(): boolean {
  const ua = getUserAgent();
  return ua !== null && /Linux/.test(ua) && !/Android/.test(ua);
}

/**
 * 是否手机（含 iPhone / Android 手机 / Windows Phone），无 UA 时返回 false
 */
export function isMobile(): boolean {
  const ua = getUserAgent();
  return ua !== null && parseUserAgent(ua).deviceType === "mobile";
}

/**
 * 是否平板（iPad / Android 平板），无 UA 时返回 false
 */
export function isTablet(): boolean {
  const ua = getUserAgent();
  return ua !== null && parseUserAgent(ua).deviceType === "tablet";
}

/**
 * 是否桌面设备，无 UA 时返回 false
 */
export function isDesktop(): boolean {
  const ua = getUserAgent();
  return ua !== null && parseUserAgent(ua).deviceType === "desktop";
}

/**
 * 是否微信内置浏览器（含小程序 webview），无 UA 时返回 false
 * @example
 * if (isWeChat()) {
 *   // 引导用户右上角菜单分享，或接入 JS-SDK
 * }
 */
export function isWeChat(): boolean {
  const ua = getUserAgent();
  return ua !== null && /MicroMessenger/.test(ua);
}
