import axios from 'axios'
import type { StationListResponse, PowerDataResponse } from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', error)

    if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请检查网络连接')
    }

    if (error.response) {
      const status = error.response.status
      switch (status) {
        case 400:
          throw new Error('请求参数错误')
        case 404:
          throw new Error('请求的资源不存在')
        case 500:
          throw new Error('服务器内部错误')
        default:
          throw new Error(`请求失败 (${status})`)
      }
    } else if (error.request) {
      throw new Error('网络连接失败，请检查后端服务是否启动')
    }

    throw error
  }
)

export const powerApiService = {
  async getStations(): Promise<StationListResponse> {
    const response = await api.get('/pv/stations')
    return response.data
  },

  async getPowerData(stationId: string, startTime: number, endTime: number): Promise<PowerDataResponse> {
    const response = await api.get(`/pv/${stationId}/power`, {
      params: {
        startTime,
        endTime
      }
    })
    return response.data
  }
}