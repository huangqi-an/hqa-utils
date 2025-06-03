import { MIDDLEWARE_TYPE } from './config'

// 中间件存储
const middlewares = {
  [MIDDLEWARE_TYPE.REQUEST]: [],
  [MIDDLEWARE_TYPE.RESPONSE]: []
}

// 添加中间件
export const use = (type, middleware) => {
  if (!middlewares[type]) {
    throw new Error(`不支持的中间件类型: ${type}`)
  }
  middlewares[type].push(middleware)
  return middleware
}

// 执行中间件链
export const runMiddlewareChain = async (type, initialValue) => {
  if (!middlewares[type]) {
    throw new Error(`不支持的中间件类型: ${type}`)
  }

  let result = initialValue
  for (const middleware of middlewares[type]) {
    result = await middleware(result)
  }
  return result
}

// 导出中间件类型
export { MIDDLEWARE_TYPE } 
