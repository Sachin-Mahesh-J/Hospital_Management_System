import { apiClient } from './client'

export type HealthResponse = {
  status: 'ok'
  service: string
  timestamp: string
}

export function getHealth(): Promise<HealthResponse> {
  return apiClient.get<HealthResponse>('/health')
}
