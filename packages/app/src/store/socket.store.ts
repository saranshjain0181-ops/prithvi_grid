import { create } from 'zustand'
import type { Alert, TelemetryReading, VerificationStatus } from '@/types'

interface SocketState {
  isConnected: boolean
  latestReadings: Record<string, TelemetryReading> // key: `${boxId}:${nodeId}`
  activeAlerts: Alert[]
  lastVerificationUpdate: {
    actionId: string
    status: VerificationStatus
    remark?: string
  } | null
  setConnected: (connected: boolean) => void
  updateReading: (reading: TelemetryReading) => void
  addAlert: (alert: Alert) => void
  acknowledgeAlert: (alertId: string) => void
  setVerificationUpdate: (
    actionId: string,
    status: VerificationStatus,
    remark?: string
  ) => void
}

export const useSocketStore = create<SocketState>()((set) => ({
  isConnected: false,
  latestReadings: {},
  activeAlerts: [],
  lastVerificationUpdate: null,

  setConnected: (connected) => set({ isConnected: connected }),

  updateReading: (reading) =>
    set((state) => ({
      latestReadings: {
        ...state.latestReadings,
        [`${reading.boxId}:${reading.nodeId}`]: reading,
      },
    })),

  addAlert: (alert) =>
    set((state) => ({
      activeAlerts: [alert, ...state.activeAlerts.filter((a) => a.id !== alert.id)],
    })),

  acknowledgeAlert: (alertId) =>
    set((state) => ({
      activeAlerts: state.activeAlerts.map((a) =>
        a.id === alertId ? { ...a, isAcknowledged: true } : a
      ),
    })),

  setVerificationUpdate: (actionId, status, remark) =>
    set({ lastVerificationUpdate: { actionId, status, remark } }),
}))
