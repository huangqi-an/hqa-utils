import { TOKEN_CONFIG, ERROR_CODE, RETRY_CONFIG } from './config'
import middlewareManager from './middleware'

// Token刷新锁
let isRefreshing = false
let refreshSubscribers = []

// 订阅Token刷新
const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb)
}

// 执行Token刷新订阅
const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

// Token中间件
const tokenMiddleware = async (config) => {
  const token = uni.getStorageSync(TOKEN_CONFIG.tokenKey)
  if (token) {
    config.header = {
      ...config.header,
      'Authorization': `Bearer ${token}`
    }
  }
  return config
}

// Token刷新中间件
const refreshTokenMiddleware = async (response) => {
  const { statusCode, data } = response
  
  // 如果不是token过期，直接返回
  if (statusCode !== ERROR_CODE.TOKEN_EXPIRED) {
    return response
  }

  // 如果已经在刷新token，将请求加入队列
  if (isRefreshing) {
    return new Promise(resolve => {
      subscribeTokenRefresh(token => {
        response.config.header['Authorization'] = `Bearer ${token}`
        resolve(response)
      })
    })
  }

  isRefreshing = true

  try {
    const refreshToken = uni.getStorageSync(TOKEN_CONFIG.refreshTokenKey)
    // 调用刷新token的接口
    const res = await uni.request({
      url: '/api/auth/refresh',
      method: 'POST',
      data: { refreshToken }
    })

    if (res.statusCode === 200) {
      const { access_token, refresh_token } = res.data
      uni.setStorageSync(TOKEN_CONFIG.tokenKey, access_token)
      uni.setStorageSync(TOKEN_CONFIG.refreshTokenKey, refresh_token)
      
      // 更新当前请求的token
      response.config.header['Authorization'] = `Bearer ${access_token}`
      
      // 通知其他等待的请求
      onTokenRefreshed(access_token)
      
      // 重试当前请求
      return uni.request(response.config)
    } else {
      // token刷新失败，清除登录状态
      uni.removeStorageSync(TOKEN_CONFIG.tokenKey)
      uni.removeStorageSync(TOKEN_CONFIG.refreshTokenKey)
      uni.navigateTo({ url: '/pages/login/login' })
      return Promise.reject(response)
    }
  } catch (error) {
    return Promise.reject(error)
  } finally {
    isRefreshing = false
  }
}

// 请求重试中间件
const retryMiddleware = async (response) => {
  const { config = {}, statusCode } = response
  
  // 如果没有配置重试次数，或者不在可重试状态码列表中，直接返回
  if (!config.retryCount || !RETRY_CONFIG.retryableStatus.includes(statusCode)) {
    return response
  }

  config.retryCount--

  // 延迟重试
  await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay))
  
  // 重试请求
  return uni.request(config)
}

// 错误处理中间件
const errorMiddleware = async (response) => {
  const { statusCode, data } = response
  
  if (statusCode >= 200 && statusCode < 300) {
    return response
  }

  // 统一错误处理
  const error = new Error(data.message || '请求失败')
  error.response = response
  error.statusCode = statusCode
  
  // 根据状态码处理不同错误
  switch (statusCode) {
    case ERROR_CODE.TOKEN_EXPIRED:
      error.message = '登录已过期，请重新登录'
      break
    case ERROR_CODE.TOKEN_INVALID:
      error.message = '登录已失效，请重新登录'
      break
    case ERROR_CODE.SERVER_ERROR:
      error.message = '服务器错误，请稍后重试'
      break
    default:
      error.message = '请求失败，请稍后重试'
  }

  return Promise.reject(error)
}

// 注册中间件
middlewareManager
  .useRequest(tokenMiddleware)
  .useResponse(refreshTokenMiddleware)
  .useResponse(retryMiddleware)
  .useResponse(errorMiddleware)

export default middlewareManager 
