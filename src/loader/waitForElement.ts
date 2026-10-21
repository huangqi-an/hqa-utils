import { TimeoutError } from "../async/withTimeout.js";

/**
 * waitForElement 的配置项。
 */
export interface WaitForElementOptions {
  /** 查找的根节点，默认 `document` */
  root?: ParentNode;
  /** 超时毫秒数，超时以 `TimeoutError` reject；默认 `0` 不超时 */
  timeout?: number;
}

/**
 * 等待匹配选择器的元素出现：已存在立即 resolve，否则用
 * MutationObserver 监听 DOM 变化，出现时 resolve 该元素。
 *
 * 等第三方脚本渲染组件、等弹窗 / 徽标节点挂载后再操作的
 * 标准姿势（比轮询 `setInterval` 查询干净且及时）：
 * - 已存在时立即 resolve，不做无谓观察
 * - `timeout` 防止元素永远不出现时 Promise 挂死（超时抛 `TimeoutError`）
 * - `root` 支持在指定容器（如 Shadow DOM 宿主的 light DOM 容器）内查找
 *
 * 非浏览器环境（SSR）resolve `null`，不抛错、不挂起服务端。
 *
 * @param selector 等待的元素选择器
 * @param options 配置项
 * @returns 出现的元素；SSR 环境为 `null`
 *
 * @example
 * ```ts
 * import { loadScript, waitForElement } from "@huangqi_an/hqa-utils";
 *
 * // 等第三方 SDK 加载并渲染出组件，再拿引用操作
 * await loadScript("https://widget.example.com/embed.js");
 * const widget = await waitForElement(".third-party-widget", { timeout: 5000 });
 * ```
 */
export function waitForElement<T extends Element = Element>(
  selector: string,
  options?: WaitForElementOptions,
): Promise<T | null> {
  if (typeof document === "undefined") return Promise.resolve(null);

  const { root = document, timeout = 0 } = options ?? {};

  return new Promise((resolve, reject) => {
    const existing = root.querySelector<T>(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = (): void => {
      observer.disconnect();
      if (timer !== undefined) clearTimeout(timer);
    };
    const observer = new MutationObserver(() => {
      const found = root.querySelector<T>(selector);
      if (found) {
        cleanup();
        resolve(found);
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    if (timeout > 0) {
      timer = setTimeout(() => {
        cleanup();
        reject(new TimeoutError(`waitForElement("${selector}") timed out after ${timeout}ms`));
      }, timeout);
    }
  });
}
