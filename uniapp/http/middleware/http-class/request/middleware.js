// 中间件管理器
class MiddlewareManager {
  constructor() {
    this.requestMiddlewares = []
    this.responseMiddlewares = []
  }

  // 添加请求中间件
  useRequest(middleware) {
    this.requestMiddlewares.push(middleware)
    return this
  }

  // 添加响应中间件
  useResponse(middleware) {
    this.responseMiddlewares.push(middleware)
    return this
  }

  // 执行请求中间件链
  async runRequestMiddlewares(config) {
    let result = { ...config }
    for (const middleware of this.requestMiddlewares) {
      result = await middleware(result)
    }
    return result
  }

  // 执行响应中间件链
  async runResponseMiddlewares(response) {
    let result = response
    for (const middleware of this.responseMiddlewares) {
      result = await middleware(result)
    }
    return result
  }
}

export default new MiddlewareManager() 
