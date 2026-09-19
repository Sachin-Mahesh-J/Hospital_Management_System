export type HealthStatus = {
  status: 'ok'
  service: 'hms-api'
  timestamp: string
}

export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    service: 'hms-api',
    timestamp: new Date().toISOString(),
  }
}
