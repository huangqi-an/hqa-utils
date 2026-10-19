import { isBrowser } from "./env.js";

export interface ClientInfo {
  /** User-Agent 字符串，无 navigator 时为 null */
  userAgent: string | null;
  /** 首选语言（navigator.language），如 "zh-CN" */
  language: string | null;
  /** 全部语言偏好列表（navigator.languages），为空时为 null */
  languages: readonly string[] | null;
  /** IANA 时区（Intl 解析），如 "Asia/Shanghai" */
  timezone: string | null;
  /** 屏幕分辨率宽（screen.width，CSS 像素） */
  screenWidth: number | null;
  /** 屏幕分辨率高（screen.height，CSS 像素） */
  screenHeight: number | null;
  /** 浏览器视口宽（window.innerWidth，CSS 像素） */
  viewportWidth: number | null;
  /** 浏览器视口高（window.innerHeight，CSS 像素） */
  viewportHeight: number | null;
  /** 设备像素比（window.devicePixelRatio） */
  devicePixelRatio: number | null;
  /** 屏幕颜色深度（screen.colorDepth） */
  colorDepth: number | null;
  /** 最大触点数（navigator.maxTouchPoints），无触屏时为 null */
  touchPoints: number | null;
  /** 网络类型（navigator.connection.effectiveType），如 "4g"；浏览器不支持时为 null */
  networkType: string | null;
}

const EMPTY_INFO: ClientInfo = {
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
};

/**
 * 获取客户端环境信息快照，一次性收集屏幕、视口、语言、时区、网络等常用字段
 *
 * 非浏览器环境（Node / SSR）返回所有字段为 null 的对象，不会抛错。
 * 各字段相互独立，单个字段取不到时仅该字段为 null。
 *
 * @example
 * const info = getClientInfo();
 * if (info.networkType === "2g") {
 *   // 弱网降级策略
 * }
 * @example
 * // 组合 UA 解析获得完整画像
 * const info = getClientInfo();
 * const ua = info.userAgent ? parseUserAgent(info.userAgent) : null;
 */
export function getClientInfo(): ClientInfo {
  if (!isBrowser()) return EMPTY_INFO;

  // Network Information API 尚未进入 TypeScript 标准 DOM 类型
  const conn = (
    navigator as Navigator & { connection?: { effectiveType?: string } }
  ).connection;

  return {
    userAgent: navigator.userAgent || null,
    language: navigator.language || null,
    languages: navigator.languages?.length
      ? [...navigator.languages]
      : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    colorDepth: screen.colorDepth,
    touchPoints: navigator.maxTouchPoints > 0 ? navigator.maxTouchPoints : null,
    networkType: conn?.effectiveType || null,
  };
}
