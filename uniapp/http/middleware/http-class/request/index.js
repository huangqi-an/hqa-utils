import { BASE_CONFIG, RETRY_CONFIG } from './config'
import middlewareManager from './middleware'

class Request {
  constructor(config = {}) {
    this.config = {
      ...BASE_CONFIG,
      ...config
    }
  }

  // 请求方法
  async request(options) {
    const config = {
      ...this.config,
      ...options,
      retryCount: RETRY_CONFIG.maxRetries
    }

    try {
      // 执行请求中间件
      const processedConfig = await middlewareManager.runRequestMiddlewares(config)
      
      // 发起请求
      const response = await uni.request(processedConfig)
      
      // 执行响应中间件
      return await middlewareManager.runResponseMiddlewares({
        ...response,
        config: processedConfig
      })
    } catch (error) {
      return Promise.reject(error)
    }
  }

  // GET请求
  get(url, data = {}, options = {}) {
    return this.request({
      url,
      data,
      method: 'GET',
      ...options
    })
  }

  // POST请求
  post(url, data = {}, options = {}) {
    return this.request({
      url,
      data,
      method: 'POST',
      ...options
    })
  }

  // PUT请求
  put(url, data = {}, options = {}) {
    return this.request({
      url,
      data,
      method: 'PUT',
      ...options
    })
  }

  // DELETE请求
  delete(url, data = {}, options = {}) {
    return this.request({
      url,
      data,
      method: 'DELETE',
      ...options
    })
  }
}

// 创建请求实例
const request = new Request()

export default request 
