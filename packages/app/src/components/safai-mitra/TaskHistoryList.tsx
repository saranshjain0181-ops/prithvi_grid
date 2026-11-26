import React from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { actionsApi } from '@/api/actions.api'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatRelativeTime } from '@/lib/utils'
import type { VerificationStatus } from '@/types'

const STATUS_BADGE: Record<VerificationStatus, { variant: 'green' | 'red' | 'blue' | 'gray'; label: string }> = {
  PENDING: { variant: 'gray', label: 'जाँच बाकी' },
  VERIFIED_GENUINE: { variant: 'green', label: '✅ सही' },
  FAKE_FLAG: { variant: 'red', label: '❌ गलत' },
  MANAGER_OVERRIDE: { variant: 'blue', label: '📋 ओवरराइड' },
}

const ACTION_ICONS: Record<string, string> = {
  GEELA_KACHRA_DALA: '🥦',
  SOOKHE_PATTE_DALA: '🍂',
  PAANI_CHHIDKA: '💧',
  GUD_PAANI_DALA: '🍯',
  NEEM_POWDER_DALA: '🌿',
  MITTI_DALI: '🪨',
  KACHRA_GHUMAYA: '🔄',
  KHAD_NIKALI: '🌱',
  CHHANAI_KI: '🕸️',
  HAWA_DI: '💨',
  LEVEL_EQUAL: '⚖️',
  LAB_SAMPLE: '🧪',
  GADDHA_SHIFT: '⛏️',
  SENSOR_SAAF: '🔧',
  BAARISH_COVER: '☂️',
  DRAIN_SAAF: '🚿',
  HARDWARE_CHECK: '🛠️',
  KEEDE_REPORT: '🐛',
  BADBOO_CHECK: '👃',
  EMERGENCY_REPORT: '🚨',
}

export const TaskHistoryList: React.FC = () => {
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['my-actions'],
    queryFn: () => actionsApi.getMyActions({ page: 1, limit: 20 }),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  const actions = data?.data ?? []

  if (actions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-5xl mb-3">📋</p>
        <p className="text-lg text-slate-500 font-devanagari">अभी कोई काम रिकॉर्ड नहीं</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-black text-prithvi-slate font-devanagari px-1">
        {t('history.title')}
      </h2>
      {actions.map((action) => {
        const badge = STATUS_BADGE[action.status]
        return (
          <div
            key={action.id}
            className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
          >
            <span className="text-3xl flex-shrink-0">
              {ACTION_ICONS[action.actionType] || '📌'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-prithvi-slate font-devanagari text-base truncate">
                {t(`actions.${action.actionType}`)}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                {formatRelativeTime(action.timestamp)}
              </p>
              {action.managerRemark && (
                <p className="text-sm text-slate-500 mt-1 font-devanagari">
                  💬 {action.managerRemark}
                </p>
              )}
            </div>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        )
      })}
    </div>
  )
}
