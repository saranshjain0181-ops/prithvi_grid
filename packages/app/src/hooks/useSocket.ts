import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth.store'
import { useSocketStore } from '@/store/socket.store'
import type { AlertNewEvent, TelemetryUpdateEvent, VerificationResultEvent } from '@/types'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'

let socketInstance: Socket | null = null

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { accessToken, isAuthenticated } = useAuthStore()
  const { setConnected, updateReading, addAlert, setVerificationUpdate } = useSocketStore()

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    // Reuse existing socket if already connected
    if (!socketInstance || !socketInstance.connected) {
      socketInstance = io(SOCKET_URL, {
        auth: { token: accessToken },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
      })
    }

    socketRef.current = socketInstance

    const socket = socketInstance

    socket.on('connect', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message)
      setConnected(false)
    })

    socket.on('telemetry:update', (event: TelemetryUpdateEvent) => {
      updateReading(event.reading)
    })

    socket.on('alert:new', (event: AlertNewEvent) => {
      addAlert(event.alert)
    })

    socket.on('verification:result', (event: VerificationResultEvent) => {
      setVerificationUpdate(event.actionId, event.status, event.remark)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off('telemetry:update')
      socket.off('alert:new')
      socket.off('verification:result')
    }
  }, [isAuthenticated, accessToken, setConnected, updateReading, addAlert, setVerificationUpdate])

  return socketRef.current
}
