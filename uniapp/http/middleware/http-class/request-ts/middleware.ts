import { MiddlewareType, RequestMiddleware, ResponseMiddleware, RequestConfig, Response } from './types'
import { MIDDLEWARE_TYPE } from './config'

export class MiddlewareManager {
  private middlewares: {
    request: RequestMiddleware[],
    response: ResponseMiddleware[]
  }

  constructor() {
    this.middlewares = {
      [MIDDLEWARE_TYPE.REQUEST]: [],
      [MIDDLEWARE_TYPE.RESPONSE]: []
    }
  }

  // 添加中间件
  use(type: 'request', middleware: RequestMiddleware): this
  use(type: 'response', middleware: ResponseMiddleware): this
  use(type: MiddlewareType, middleware: RequestMiddleware | ResponseMiddleware): this {
    if (!this.middlewares[type]) {
      throw new Error(`不支持的中间件类型: ${type}`)
    }
    this.middlewares[type].push(middleware as any)
    return this
  }

  // 执行中间件链
  async runMiddlewareChain<T extends RequestConfig | Response>(
    type: T extends RequestConfig ? 'request' : 'response',
    initialValue: T
  ): Promise<T> {
    if (!this.middlewares[type]) {
      throw new Error(`不支持的中间件类型: ${type}`)
    }

    let result = initialValue
    for (const middleware of this.middlewares[type]) {
      if (type === 'request') {
        result = await (middleware as RequestMiddleware)(result as RequestConfig) as T
      } else {
        result = await (middleware as ResponseMiddleware)(result as Response) as T
      }
    }
    return result
  }

  // 获取中间件列表
  getMiddlewares(type: MiddlewareType): (RequestMiddleware | ResponseMiddleware)[] {
    return this.middlewares[type] || []
  }

  // 清空中间件
  clearMiddlewares(type: MiddlewareType): void {
    if (this.middlewares[type]) {
      this.middlewares[type] = []
    }
  }
}

// 导出中间件类型
export { MIDDLEWARE_TYPE } 
