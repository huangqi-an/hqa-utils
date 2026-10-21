import { TimeoutError } from "../async/withTimeout.js";

/**
 * 资源加载配置项（loadScript / loadStyle 共用）。
 */
export interface ResourceLoadOptions {
  /** 附加到标签上的属性（如 `integrity`、`crossOrigin`、`async`） */
  attrs?: Record<string, string>;
  /** 插入的父容器，默认 `document.head` */
  parent?: HTMLElement;
  /** 超时毫秒数，超时以 `TimeoutError` reject；默认 `0` 不超时 */
  timeout?: number;
}

export type ResourceLoader = (url: string, options?: ResourceLoadOptions) => Promise<void>;

/**
 * 创建带去重缓存的资源加载器（loadScript / loadStyle 的共享实现）。
 * - 同 URL 的并发 / 后续调用共享同一次加载（模块级缓存）
 * - 加载失败时清缓存，下次调用重新加载
 * - SSR（无 document）resolve 空操作
 */
export function createResourceLoader(kind: "script" | "style"): ResourceLoader {
  const cache = new Map<string, Promise<void>>();

  return (url, options) => {
    const cached = cache.get(url);
    if (cached) return cached;

    const promise = inject(url, kind, options).catch((error: unknown) => {
      cache.delete(url);
      throw error;
    });
    cache.set(url, promise);
    return promise;
  };
}

function inject(url: string, kind: "script" | "style", options?: ResourceLoadOptions): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const { attrs, parent, timeout = 0 } = options ?? {};
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const el: HTMLScriptElement | HTMLLinkElement =
      kind === "script"
        ? Object.assign(document.createElement("script"), { src: url })
        : Object.assign(document.createElement("link"), { rel: "stylesheet", href: url });

    // attrs 不得覆盖 URL 相关属性（URL 是主参数，防呆 + 防意外篡改）
    const urlAttrs = kind === "script" ? ["src"] : ["href", "rel"];
    for (const [key, value] of Object.entries(attrs ?? {})) {
      if (urlAttrs.includes(key.toLowerCase())) continue;
      el.setAttribute(key, value);
    }

    const cleanup = (): void => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
      if (timer !== undefined) clearTimeout(timer);
    };
    const onLoad = (): void => {
      cleanup();
      resolve();
    };
    const onError = (): void => {
      cleanup();
      reject(new Error(`Failed to load ${kind}: ${url}`));
    };

    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);

    if (timeout > 0) {
      timer = setTimeout(() => {
        cleanup();
        reject(new TimeoutError(`${kind} "${url}" timed out after ${timeout}ms`));
      }, timeout);
    }

    (parent ?? document.head).appendChild(el);
  });
}
