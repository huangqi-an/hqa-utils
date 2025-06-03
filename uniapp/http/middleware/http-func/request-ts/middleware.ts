import { MiddlewareType, RequestMiddleware, ResponseMiddleware, RequestConfig, Response } from './types'
import { MIDDLEWARE_TYPE } from './config'

// 中间件存储
const middlewares = {
  [MIDDLEWARE_TYPE.REQUEST]: [] as RequestMiddleware[],
  [MIDDLEWARE_TYPE.RESPONSE]: [] as ResponseMiddleware[]
}

// 添加中间件
export const use = <T extends RequestConfig | Response>(
  type: T extends RequestConfig ? 'request' : 'response',
  middleware: T extends RequestConfig ? RequestMiddleware : ResponseMiddleware
) => {
  if (!middlewares[type]) {
    throw new Error(`不支持的中间件类型: ${type}`)
  }
  middlewares[type].push(middleware as any)
  return middleware
}

// 执行中间件链
export const runMiddlewareChain = async <T extends RequestConfig | Response>(
  type: T extends RequestConfig ? 'request' : 'response',
  initialValue: T
): Promise<T> => {
  if (!middlewares[type]) {
    throw new Error(`不支持的中间件类型: ${type}`)
  }

  let result = initialValue
  for (const middleware of middlewares[type]) {
    if (type === 'request') {
      result = await (middleware as RequestMiddleware)(result as RequestConfig) as T
    } else {
      result = await (middleware as ResponseMiddleware)(result as Response) as T
    }
  }
  return result
}

// 导出中间件类型
export { MIDDLEWARE_TYPE } 
