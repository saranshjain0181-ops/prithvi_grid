import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Alert } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '@/api/alerts.api'

interface AlertBannerProps {
  alerts?: Alert[]
  message?: string
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'WARNING'
}

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  LOW: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-900', icon: 'ℹ️' },
  MEDIUM: { bg: 'bg-yellow-100 border-yellow-300', text: 'text-yellow-900', icon: '⚠️' },
  HIGH: { bg: 'bg-orange-100 border-orange-300', text: 'text-orange-900', icon: '🚨' },
  WARNING: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-900', icon: '⚠️' },
  CRITICAL: { bg: 'bg-red-100 border-red-300', text: 'text-red-900', icon: '🛑' },
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, message, severity = 'WARNING' }) => {
  const queryClient = useQueryClient()

  const ackMutation = useMutation({
    mutationFn: (alertId: string) => alertsApi.acknowledge(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  if (message) {
    const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.WARNING
    return (
      <div className={`flex items-start gap-3 p-4 rounded-2xl border-2 ${config.bg}`}>
        <span className="text-2xl flex-shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-base font-bold font-devanagari ${config.text}`}>
            {message}
          </p>
        </div>
      </div>
    )
  }

  const activeAlerts = (alerts || []).filter((a) => !a.isAcknowledged)

  if (activeAlerts.length === 0) return null

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {activeAlerts.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.MEDIUM
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex items-start gap-3 p-4 rounded-2xl border-2 ${config.bg}`}
            >
              <span className="text-2xl flex-shrink-0">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-base font-bold font-devanagari ${config.text}`}>
                  {alert.messageHi}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(alert.triggeredAt).toLocaleTimeString('hi-IN')}
                </p>
              </div>
              <button
                onClick={() => ackMutation.mutate(alert.id)}
                className="flex-shrink-0 text-sm font-semibold text-slate-500 hover:text-slate-700 font-devanagari"
              >
                देखा (Acknowledge)
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
