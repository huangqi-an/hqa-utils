/**
 * 读取当前页面的 CSP nonce，供运行时动态注入 script / style 使用。
 *
 * CSP 模式下（`script-src 'nonce-xxx'`），动态创建的脚本和样式必须带上
 * 同一个 nonce 才能通过浏览器校验——框架（React / Vue）的运行时注入、
 * 埋点脚本加载都依赖它。本函数按以下顺序探测：
 *
 * 1. 页面元素上的 nonce：`script[nonce]` / `style[nonce]` 的 IDL 属性
 *    （注意：CSP 页面上 `getAttribute("nonce")` 会被浏览器隐藏返回空——
 *    防止攻击者用 CSS 选择器逐字符探测 nonce——必须用 `.nonce` 属性）
 * 2. `<meta http-equiv="Content-Security-Policy">` content 中
 *    `script-src` 指令里的 `'nonce-xxx'`
 *
 * 都不存在时返回 `null`。非浏览器环境（SSR）返回 `null`，不抛错。
 *
 * @returns nonce 字符串或 `null`
 *
 * @example
 * ```ts
 * const nonce = getCspNonce();
 * const script = document.createElement("script");
 * if (nonce) script.setAttribute("nonce", nonce);
 * script.src = "/analytics.js";
 * document.head.appendChild(script);
 * ```
 */
export function getCspNonce(): string | null {
  if (typeof document === "undefined") return null;

  // 1. 元素 IDL nonce（CSP 下 getAttribute("nonce") 被隐藏，IDL 属性不受影响）
  const el = document.querySelector<HTMLScriptElement | HTMLStyleElement>(
    "script[nonce], style[nonce]",
  );
  const fromElement = el?.nonce;
  if (fromElement) return fromElement;

  // 2. meta CSP content 里 script-src 的 'nonce-xxx'
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[http-equiv="Content-Security-Policy" i]',
  );
  const match = /(?:^|;)\s*script-src[^;]*'nonce-([^']+)'/.exec(meta?.content ?? "");
  return match?.[1] ?? null;
}
