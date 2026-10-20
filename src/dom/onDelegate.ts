/**
 * 在根元素上进行事件委托：监听 `root` 上的事件，按选择器匹配实际目标。
 *
 * 子元素（尤其是动态增删的列表项）不需要逐个绑定/解绑监听器——
 * 事件冒泡到 `root` 后沿祖先链用 `closest(selector)` 匹配，
 * 新增的子元素无需任何操作即自动生效：
 * - 回调第二参数直接给出匹配到的元素，省去回调内再 `closest` 一次
 * - `capture` 选项透传给原生监听（`focus` / `blur` 等不冒泡事件需要 `true`）
 * - 返回 `stop()` 取消监听
 *
 * 非浏览器环境（SSR）或 `root` 无效时返回 noop，不抛错。
 *
 * 边界：不穿透 Shadow DOM——冒泡出 shadow root 后 `event.target`
 * 已被重定向为 host 元素，需要精确处理时请基于 `composedPath()` 自行实现。
 *
 * @param root 委托根元素（通常是 `document` 或列表容器）
 * @param type 事件类型（如 `"click"`）
 * @param selector 匹配委托目标的 CSS 选择器
 * @param listener 命中时的回调，`matched` 为匹配到的元素（可能是 target 自身或其祖先）
 * @param options 配置项
 * @returns 取消监听的函数
 *
 * @example
 * ```ts
 * // 动态列表：只绑定一次，项随便增删
 * const stop = onDelegate(document, "click", ".item", (event, item) => {
 *   console.log("点击了", (item as HTMLElement).dataset.id);
 * });
 *
 * stop(); // 组件卸载时取消
 * ```
 */
export interface OnDelegateOptions {
  /** 是否在捕获阶段监听，默认 `false`（冒泡阶段）。`focus` / `blur` 等不冒泡事件需传 `true` */
  capture?: boolean;
}

export function onDelegate<K extends keyof DocumentEventMap>(
  root: Document | Element,
  type: K,
  selector: string,
  listener: (event: DocumentEventMap[K], matched: Element) => void,
  options?: OnDelegateOptions,
): () => void {
  if (!root || typeof root.addEventListener !== "function") return () => {};

  const handler = (event: Event): void => {
    const target = event.target;
    // target 可能是非元素节点（如 document），没有 closest，直接跳过
    if (!target || typeof (target as Element).closest !== "function") return;
    const matched = (target as Element).closest(selector);
    if (matched) listener(event as DocumentEventMap[K], matched);
  };

  const { capture = false } = options ?? {};
  root.addEventListener(type, handler, { capture });

  return () => {
    root.removeEventListener(type, handler, { capture });
  };
}
