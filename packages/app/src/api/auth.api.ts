import apiClient from './client'
import type { ApiResponse, Tokens, User } from '@/types'

export interface SendOtpPayload {
  phone: string
  countryCode?: string
}

export interface VerifyOtpPayload {
  phone: string
  otp: string
  sessionId?: string
}

export interface AuthResponseData {
  accessToken: string
  refreshToken: string
  tokens?: Tokens
  user: User
}

export const authApi = {
  sendOtp: async (payload: SendOtpPayload | string): Promise<ApiResponse<{ message: string; sessionId: string }>> => {
    const body = typeof payload === 'string' ? { phone: payload } : payload
    const { data } = await apiClient.post<ApiResponse<{ message: string; sessionId: string }>>('/auth/send-otp', body)
    return data
  },

  verifyOtp: async (payload: VerifyOtpPayload): Promise<ApiResponse<AuthResponseData>> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/verify-otp', payload)
    return data
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<Tokens>> => {
    const { data } = await apiClient.post<ApiResponse<Tokens>>('/auth/refresh', { refreshToken })
    return data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },
}
