/**
 * 上报的事件结构。
 */
export interface ReportEvent {
  /** 事件名（如 `"白屏"`、`"js-error"`） */
  event: string;
  /** 事件负载，任意可 JSON 序列化的数据 */
  payload?: unknown;
  /** 入队时间戳（毫秒） */
  timestamp: number;
  /** createReporter 的 commonData 会合并进每条事件 */
  [key: string]: unknown;
}

/**
 * createReporter 的配置项。
 */
export interface CreateReporterOptions {
  /** 采集端点 URL（POST 接收 JSON 数组） */
  endpoint: string;
  /** 自动 flush 间隔毫秒数，默认 `5000`；传 `0` 关闭定时 flush（仅手动 / 满批 / 卸载时发送） */
  flushInterval?: number;
  /** 队列达到多少条立即发送（不等间隔），默认 `20` */
  maxBatchSize?: number;
  /** 采样率 0~1，默认 `1`（全量）。入队时判定，未采样的数据直接丢弃 */
  sampleRate?: number;
  /** `sendBeacon` 不可用或排队失败时降级 fetch 的重试次数，默认 `0` */
  retries?: number;
  /** 请求体 Content-Type，默认 `"application/json"`（会触发 CORS 预检；采集端支持裸文本读 JSON 时可用 `"text/plain;charset=UTF-8"` 规避） */
  contentType?: string;
  /** 附加请求头（仅 fetch 降级路径携带；`sendBeacon` 无法自定义头） */
  headers?: Record<string, string>;
  /** 合并进每条事件的公共字段（应用 ID、版本号、用户标识等） */
  commonData?: Record<string, unknown>;
  /** 页面进入后台（`visibilitychange` → hidden）或卸载（`pagehide`）时自动 flush，默认 `true`——卸载时 fetch 会被浏览器掐断，这是监控数据丢失的头号原因 */
  flushOnHide?: boolean;
  /** fetch 降级路径重试耗尽后仍失败时回调，参数为错误与本次丢失的事件（sendBeacon 路径无响应，不触发） */
  onError?: (error: unknown, events: ReportEvent[]) => void;
}

/**
 * 数据上报器。
 */
export interface Reporter {
  /**
   * 事件入队（先按采样率判定）。队列满 `maxBatchSize` 立即发送，否则等定时 flush。
   *
   * @param event 事件名
   * @param payload 事件负载
   */
  report(event: string, payload?: unknown): void;
  /** 立即发送队列中的全部事件（队列为空时不发送） */
  flush(): void;
  /** 当前队列中待发送的事件数 */
  readonly pendingCount: number;
  /** 销毁：尽力发送剩余事件，停止定时器与卸载监听，之后 `report` 静默丢弃 */
  destroy(): void;
}

/**
 * 创建数据上报器：批量合并 + 采样 + `sendBeacon` 优先 / `fetch(keepalive)` 降级。
 *
 * 发送策略：
 * - 优先 `navigator.sendBeacon`（异步不阻塞、页面卸载时浏览器仍尽力送达）
 * - `sendBeacon` 不可用或返回 `false`（如超过队列大小限制）时，降级
 *   `fetch` 并带 `keepalive: true`（同样具备卸载送达能力，可自定义头与重试）
 *
 * 非浏览器环境（SSR）安全：`report` 静默丢弃、`flush` / `destroy` 为空操作，不抛错。
 *
 * 边界：`sendBeacon` 与 `keepalive` 均有约 64KB 的请求体限制，
 * 超大负载请拆分或自行直传；`sendBeacon` 无响应，无法感知服务端错误。
 *
 * @param options 配置项
 * @returns 上报器实例
 *
 * @example
 * ```ts
 * import { createReporter, isPageBlank } from "@huangqi_an/hqa-utils";
 *
 * const reporter = createReporter({
 *   endpoint: "/api/collect",
 *   commonData: { appId: "web", version: "1.0.0" },
 * });
 *
 * // 配合白屏检测
 * const result = isPageBlank();
 * if (result.blank) reporter.report("白屏", result);
 *
 * reporter.report("js-error", { message: "..." });
 * reporter.destroy(); // 组件卸载 / 页面退出前调用，尽力发完剩余
 * ```
 */
export function createReporter(options: CreateReporterOptions): Reporter {
  const {
    endpoint,
    flushInterval = 5000,
    maxBatchSize = 20,
    sampleRate = 1,
    retries = 0,
    contentType = "application/json",
    headers,
    commonData,
    flushOnHide = true,
    onError,
  } = options;

  const queue: ReportEvent[] = [];
  const isBrowser =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof Blob === "function";
  let destroyed = false;
  let timer: number | undefined;

  const deliver = (events: ReportEvent[]): void => {
    const body = JSON.stringify(events);
    // sendBeacon 优先：异步、不阻塞、卸载时仍尽力送达
    if (typeof navigator.sendBeacon === "function") {
      try {
        if (navigator.sendBeacon(endpoint, new Blob([body], { type: contentType }))) return;
      } catch {
        // 部分环境对未知类型抛错，走降级
      }
    }
    // fetch(keepalive) 降级：可自定义头、可重试，卸载时同样尽力送达
    void (async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          await fetch(endpoint, {
            method: "POST",
            body,
            keepalive: true,
            headers: { "Content-Type": contentType, ...headers },
          });
          return;
        } catch (error) {
          lastError = error;
        }
      }
      onError?.(lastError, events);
    })();
  };

  const flush = (): void => {
    if (!isBrowser || queue.length === 0) return;
    const events = queue.splice(0, queue.length);
    deliver(events);
  };

  const onHide = (): void => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") flush();
  };

  if (isBrowser) {
    if (flushInterval > 0) {
      timer = window.setInterval(flush, flushInterval);
    }
    if (flushOnHide) {
      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("pagehide", flush);
    }
  }

  return {
    report(event, payload) {
      if (destroyed || !isBrowser) return;
      if (sampleRate < 1 && Math.random() > sampleRate) return;
      queue.push({
        event,
        payload,
        timestamp: Date.now(),
        ...commonData,
      });
      if (queue.length >= maxBatchSize) flush();
    },
    flush,
    get pendingCount() {
      return queue.length;
    },
    destroy() {
      if (destroyed || !isBrowser) return;
      destroyed = true;
      if (timer !== undefined) window.clearInterval(timer);
      if (flushOnHide) {
        document.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("pagehide", flush);
      }
      flush();
    },
  };
}
