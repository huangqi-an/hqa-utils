import { isBrowser } from "../client/env.js";

/** 网络质量信息（Network Information API，Chromium 系支持） */
export interface ConnectionInfo {
  /** 网络类型估算："slow-2g" | "2g" | "3g" | "4g" */
  effectiveType: string;
  /** 下行速度估算（Mbps） */
  downlink: number;
  /** 往返延迟估算（ms） */
  rtt: number;
  /** 用户是否开启省流量模式 */
  saveData: boolean;
}

interface NetworkInformationLike {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * 获取网络质量信息（Network Information API）
 *
 * 基于 navigator.connection 的估算值，适合弱网降级（如省流量时改加载缩略图）。
 * 仅 Chromium 系浏览器支持；Safari / Firefox 及非浏览器环境返回 null。
 * @returns 网络质量信息，不支持时为 null
 * @example
 * const conn = getConnectionInfo();
 * if (conn?.saveData || conn?.effectiveType === "2g") {
 *   loadThumbnailInstead();
 * }
 */
export function getConnectionInfo(): ConnectionInfo | null {
  if (!isBrowser()) return null;
  const conn = (navigator as Navigator & { connection?: NetworkInformationLike })
    .connection;
  if (!conn) return null;
  return {
    effectiveType: conn.effectiveType ?? "",
    downlink: conn.downlink ?? 0,
    rtt: conn.rtt ?? 0,
    saveData: conn.saveData ?? false,
  };
}
