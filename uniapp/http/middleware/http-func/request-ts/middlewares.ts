import { TOKEN_CONFIG, ERROR_CODE, RETRY_CONFIG, MIDDLEWARE_TYPE } from './config'
import { use } from './middleware'
import { RequestConfig, Response, RequestMiddleware, ResponseMiddleware, RequestError } from './types'

// Token刷新锁
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

// 订阅Token刷新
const subscribeTokenRefresh = (cb: (token: string) => void): void => {
  refreshSubscribers.push(cb)
}

// 执行Token刷新订阅
const onTokenRefreshed = (token: string): void => {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

// Token中间件
const tokenMiddleware: RequestMiddleware = async (config: RequestConfig): Promise<RequestConfig> => {
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
const refreshTokenMiddleware: ResponseMiddleware = async (response: Response): Promise<Response> => {
  const { statusCode, data } = response
  
  if (statusCode !== ERROR_CODE.TOKEN_EXPIRED) {
    return response
  }

  if (isRefreshing) {
    return new Promise(resolve => {
      subscribeTokenRefresh(token => {
        if (response.config.header) {
          response.config.header['Authorization'] = `Bearer ${token}`
        }
        resolve(response)
      })
    })
  }

  isRefreshing = true

  try {
    const refreshToken = uni.getStorageSync(TOKEN_CONFIG.refreshTokenKey)
    const res = await uni.request({
      url: '/api/auth/refresh',
      method: 'POST',
      data: { refreshToken }
    })

    if (res.statusCode === 200) {
      const { access_token, refresh_token } = res.data
      uni.setStorageSync(TOKEN_CONFIG.tokenKey, access_token)
      uni.setStorageSync(TOKEN_CONFIG.refreshTokenKey, refresh_token)
      
      if (response.config.header) {
        response.config.header['Authorization'] = `Bearer ${access_token}`
      }
      onTokenRefreshed(access_token)
      
      return uni.request(response.config)
    } else {
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
const retryMiddleware: ResponseMiddleware = async (response: Response): Promise<Response> => {
  const { config, statusCode } = response
  
  if (!config?.retryCount || !RETRY_CONFIG.retryableStatus.includes(statusCode)) {
    return response
  }

  const newConfig = { ...config, retryCount: config.retryCount - 1 }
  await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay))
  return uni.request(newConfig)
}

// 错误处理中间件
const errorMiddleware: ResponseMiddleware = async (response: Response): Promise<Response> => {
  const { statusCode, data } = response
  
  if (statusCode >= 200 && statusCode < 300) {
    return response
  }

  const error = new Error(data.message || '请求失败') as RequestError
  error.response = response
  error.statusCode = statusCode
  error.config = response.config
  
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
use(MIDDLEWARE_TYPE.REQUEST, tokenMiddleware)
use(MIDDLEWARE_TYPE.RESPONSE, refreshTokenMiddleware)
use(MIDDLEWARE_TYPE.RESPONSE, retryMiddleware)
use(MIDDLEWARE_TYPE.RESPONSE, errorMiddleware) 
