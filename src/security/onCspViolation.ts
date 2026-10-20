/**
 * 监听 CSP 违规事件：页面尝试加载被策略禁止的资源、执行被禁止的
 * 内联代码时触发，回调收到原生 `SecurityPolicyViolationEvent`。
 *
 * 典型用途是安全监控上报——尤其值得做的原因：**meta 方式声明的 CSP
 * 不支持 `report-uri` / `report-to`（浏览器直接忽略），事件监听是
 * meta 场景下唯一的违规上报通道**。与 `createReporter` 配合即可接入
 * 监控链路：
 *
 * - `e.violatedDirective`：被违反的指令（如 `script-src`）
 * - `e.blockedURL`：被拦截的资源 URL
 * - `e.sample`：命中的内联代码片段
 *
 * 非浏览器环境（SSR）返回 noop，不抛错。
 *
 * @param callback 违规发生时的回调
 * @returns 取消监听的函数
 *
 * @example
 * ```ts
 * const stop = onCspViolation((event) => {
 *   reporter.report("csp-violation", {
 *     directive: event.violatedDirective,
 *     blockedURL: event.blockedURL,
 *   });
 * });
 *
 * stop(); // 组件卸载时取消
 * ```
 */
export function onCspViolation(
  callback: (event: SecurityPolicyViolationEvent) => void,
): () => void {
  if (typeof document === "undefined" || typeof document.addEventListener !== "function") {
    return () => {};
  }

  const handler = (event: Event): void => {
    callback(event as SecurityPolicyViolationEvent);
  };

  document.addEventListener("securitypolicyviolation", handler);

  return () => {
    document.removeEventListener("securitypolicyviolation", handler);
  };
}
