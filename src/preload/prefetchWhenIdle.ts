import { createIdleQueue } from "../schedule/createIdleQueue.js";

export interface PrefetchWhenIdleOptions {
  /**
   * 传给底层空闲队列的超时毫秒数：页面长期不空闲时也强制执行，防止任务饥饿。
   * 不传则使用 `createIdleQueue` 的默认行为（不强制）。
   */
  timeout?: number;
}

/** 已插入 prefetch link 的 URL 集合（模块级去重） */
const prefetched = new Set<string>();

/** 幂等插入 `<link rel="prefetch">` */
function insertPrefetchLink(url: string): void {
  if (prefetched.has(url)) return;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  document.head.appendChild(link);
  prefetched.add(url);
}

/**
 * 在浏览器空闲时批量预取资源（`<link rel="prefetch">`），返回 `stop` 取消函数。
 *
 * 底层复用 {@link createIdleQueue} 空闲任务队列：URL 逐个入队，按空闲切片
 * 分帧插入 link，避免一次性插入大量预取请求抢占当前页面的网络与 CPU。
 * `stop()` 会销毁队列并放弃尚未执行的 URL（已插入的不撤销）。
 *
 * SSR / Node 下为静默空操作，返回的 `stop` 也是空函数。
 *
 * @param urls - 要预取的资源地址列表
 * @param options - 见 {@link PrefetchWhenIdleOptions}
 *
 * @example
 * ```ts
 * // 用户浏览列表页时，空闲预取详情页资源
 * const stop = prefetchWhenIdle(detailPages.map((d) => d.cover));
 *
 * // 组件卸载时取消未开始的预取
 * onUnmounted(stop);
 * ```
 */
export function prefetchWhenIdle(
  urls: string[],
  options?: PrefetchWhenIdleOptions,
): () => void {
  if (typeof document === "undefined") return () => {};

  const queue =
    options?.timeout !== undefined
      ? createIdleQueue({ timeout: options.timeout })
      : createIdleQueue();
  for (const url of urls) {
    // 任务即"插入 link"，同步完成；stop 时未入队任务被销毁，reject 静默
    void queue
      .push(() => {
        insertPrefetchLink(url);
        return undefined;
      })
      .catch(() => {});
  }
  return () => queue.destroy();
}
