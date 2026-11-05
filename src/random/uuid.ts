const UUID_V4_TEMPLATE = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

/**
 * uuid 的配置项。
 */
export interface UuidOptions {
  /**
   * 跳过 `Math.random` 兜底：环境缺少 crypto 时抛错，而不是产出低熵、
   * 可预测的 ID。默认 `false`。
   *
   * ID 若会参与安全决策（防伪造的令牌、会话标识、防碰撞抽奖等），
   * 或你希望在部署早期就暴露 crypto 缺失问题，开启它。
   */
  secure?: boolean;
}

/**
 * 生成 UUID v4 格式的唯一 ID，**全环境可用**（HTTP / HTTPS / SSR 均可）。
 *
 * `crypto.randomUUID` 要求 secure context，HTTP 环境下不存在——本函数
 * 三级降级，且**每一级都产出相同的 UUID v4 格式**（长度恒定 36 字符）：
 *
 * 1. secure context：原生 `crypto.randomUUID()`
 * 2. HTTP 环境：`crypto.getRandomValues` 按 RFC 4122 手拼（设版本位与
 *    变体位），与原生实现同格式、同 122 bits 熵
 * 3. 最终兜底：`Math.random` 模板——格式不变但熵弱且可预测，
 *    **不可用于安全场景**（token、会话凭证等）
 *
 * 典型用途：`requestId`、列表 key、日志追踪 ID 等无安全要求的场景。
 * ID 需要参与安全决策时传 `{ secure: true }` 跳过第 3 级兜底；
 * 需要**短 ID**（URL、缓存 key）用 `randomId`。
 *
 * @param options 配置项
 * @returns UUID v4 格式字符串（36 字符）
 * @throws {Error} `secure: true` 且环境缺少 crypto 时
 *
 * @example
 * ```ts
 * import { uuid } from "@huangqi_an/hqa-utils";
 *
 * // 给每个请求带上追踪 ID
 * fetch("/api/data", { headers: { "X-Request-Id": uuid() } });
 *
 * // 列表 key
 * items.map((item) => ({ key: uuid(), ...item }));
 *
 * // ID 参与安全决策：拒绝低熵兜底
 * const sessionId = uuid({ secure: true });
 * ```
 */
export function uuid(options?: UuidOptions): string {
  const { secure = false } = options ?? {};

  // 1. secure context：原生实现
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // 2. getRandomValues（HTTP 环境可用）：按 RFC 4122 手拼 v4
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40; // 版本 4
    bytes[8] = (bytes[8]! & 0x3f) | 0x80; // 变体 RFC 4122
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // 3. 最终兜底：Math.random（格式不变，熵弱，仅保障可用性）
  if (secure) {
    throw new Error(
      "uuid({ secure: true }) requires crypto.randomUUID or crypto.getRandomValues, neither is available in this environment",
    );
  }
  return UUID_V4_TEMPLATE.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
