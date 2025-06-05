// Vue Suspense 风格请求缓存工具（兼容 TS/JS）
// 用法：在setup或组件中调用 fetchWithSuspenseVue，未命中缓存时抛出 Promise，命中时返回数据

const cache = new Map<string, any>();

type CacheValue<T> =
  | { status: 'pending'; promise: Promise<T> }
  | { status: 'fulfilled'; data: T }
  | { status: 'rejected'; error: any };

export function fetchWithSuspenseVue<T>(key: string, fetcher: () => Promise<T>): T {
  if (cache.has(key)) {
    const value = cache.get(key) as CacheValue<T>;
    if (value.status === 'fulfilled') return value.data;
    if (value.status === 'rejected') throw value.error;
    throw value.promise;
  }
  const promise = fetcher()
    .then(data => {
      cache.set(key, { status: 'fulfilled', data });
    })
    .catch(error => {
      cache.set(key, { status: 'rejected', error });
    });
  cache.set(key, { status: 'pending', promise });
  throw promise;
}

export function clearSuspenseCacheVue(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
} 
