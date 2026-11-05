/**
 * 默认字母表：base64url 标准 64 个字符（RFC 4648 §5），全部 URL-safe。
 * 长度恰为 2^6，可用 6-bit 掩码无偏采样，无需拒绝重试。
 */
export const DEFAULT_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * 生成随机唯一 ID。
 *
 * 基于 `crypto.getRandomValues`（Web Crypto）——与 `crypto.randomUUID`
 * 不同，`getRandomValues` **不要求 secure context**，HTTP 环境同样可用；
 * Node 18+ 亦内置，SSR 可直接使用。
 *
 * - 默认 21 字符、64 进制，约 126 bits 熵（与 nanoid 同规格）
 * - `size` 定制长度，`alphabet` 定制字符集（任意 2~256 个字符，自动无偏采样）
 *
 * 随机性来自加密级熵源，适合 URL、临时文件名、追踪 ID 等用途；
 * 注意：它**不是** UUID 格式，需要标准 UUID（如数据库主键约定）时
 * 用 `crypto.randomUUID()`。
 *
 * 环境缺少 `crypto.getRandomValues` 时抛错（不静默降级 `Math.random`，
 * 避免产生可预测 ID 被误用于安全场景）。
 *
 * @param size ID 长度（不含前缀），默认 `21`；`0` 返回空串
 * @param alphabet 字符集，默认 64 字符 URL-safe 字母表；长度需在 2~256 之间
 * @returns 随机 ID
 * @throws {RangeError} `size` 非负整数、`alphabet` 长度越界时
 * @throws {Error} 环境缺少 `crypto.getRandomValues` 时
 *
 * @example
 * ```ts
 * randomId();          // "V1StGXR8_Z5jdHi6B-myT"（21 字符）
 * randomId(8);         // 短 ID："ND-k0Yk2"
 * randomId(6, "01");   // 二进制串："011010"
 * ```
 */
export function randomId(size = 21, alphabet: string = DEFAULT_ALPHABET): string {
  if (!Number.isInteger(size) || size < 0) {
    throw new RangeError(`size must be a non-negative integer, got ${size}`);
  }
  if (alphabet.length < 2 || alphabet.length > 256) {
    throw new RangeError(`alphabet length must be between 2 and 256, got ${alphabet.length}`);
  }

  const randomBytes = globalThis.crypto?.getRandomValues;
  if (typeof randomBytes !== "function") {
    throw new Error(
      "randomId requires crypto.getRandomValues (available in browsers and Node 18+)",
    );
  }
  const getRandomValues = randomBytes.bind(globalThis.crypto);

  if (size === 0) return "";

  // 快路径：字母表恰 64 字符时，6-bit 掩码完美无偏，无需拒绝采样
  if (alphabet.length === 64) {
    const bytes = getRandomValues(new Uint8Array(size));
    let id = "";
    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i]! & 63];
    }
    return id;
  }

  // 通用路径：任意字母表，掩码 + 拒绝采样消除 modulo bias
  const len = alphabet.length;
  const mask = (2 << Math.floor(Math.log2(len - 1))) - 1;
  const step = Math.ceil((1.6 * mask * size) / len);
  let id = "";
  for (;;) {
    const bytes = getRandomValues(new Uint8Array(step));
    for (let i = 0; i < step; i++) {
      const index = bytes[i]! & mask;
      if (index < len) {
        id += alphabet[index];
        if (id.length === size) return id;
      }
    }
  }
}
