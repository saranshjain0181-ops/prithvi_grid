import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActionCard } from './ActionCard'
import type { ActionCategory, ActionType } from '@/types'

interface ActionDef {
  id: ActionType
  icon: string
  category: ActionCategory
}

const ALL_ACTIONS: ActionDef[] = [
  // INPUTS
  { id: 'GEELA_KACHRA_DALA', icon: '🥦', category: 'INPUTS' },
  { id: 'SOOKHE_PATTE_DALA', icon: '🍂', category: 'INPUTS' },
  { id: 'PAANI_CHHIDKA', icon: '💧', category: 'INPUTS' },
  { id: 'GUD_PAANI_DALA', icon: '🍯', category: 'INPUTS' },
  { id: 'NEEM_POWDER_DALA', icon: '🌿', category: 'INPUTS' },
  { id: 'MITTI_DALI', icon: '🪨', category: 'INPUTS' },
  // ACTIONS
  { id: 'KACHRA_GHUMAYA', icon: '🔄', category: 'ACTIONS' },
  { id: 'KHAD_NIKALI', icon: '🌱', category: 'ACTIONS' },
  { id: 'CHHANAI_KI', icon: '🕸️', category: 'ACTIONS' },
  { id: 'HAWA_DI', icon: '💨', category: 'ACTIONS' },
  { id: 'LEVEL_EQUAL', icon: '⚖️', category: 'ACTIONS' },
  { id: 'LAB_SAMPLE', icon: '🧪', category: 'ACTIONS' },
  { id: 'GADDHA_SHIFT', icon: '⛏️', category: 'ACTIONS' },
  // MAINTENANCE
  { id: 'SENSOR_SAAF', icon: '🔧', category: 'MAINTENANCE' },
  { id: 'BAARISH_COVER', icon: '☂️', category: 'MAINTENANCE' },
  { id: 'DRAIN_SAAF', icon: '🚿', category: 'MAINTENANCE' },
  { id: 'HARDWARE_CHECK', icon: '🛠️', category: 'MAINTENANCE' },
  // REPORTING
  { id: 'KEEDE_REPORT', icon: '🐛', category: 'REPORTING' },
  { id: 'BADBOO_CHECK', icon: '👃', category: 'REPORTING' },
  { id: 'EMERGENCY_REPORT', icon: '🚨', category: 'REPORTING' },
]

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  INPUTS: '📥 सामग्री डालना',
  ACTIONS: '⚡ मुख्य काम',
  MAINTENANCE: '🔧 रख-रखाव',
  REPORTING: '📋 रिपोर्ट करना',
}

const CATEGORY_ORDER: ActionCategory[] = ['INPUTS', 'ACTIONS', 'MAINTENANCE', 'REPORTING']

export const ActionCardGrid: React.FC = () => {
  const { t } = useTranslation()

  const actionsByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    actions: ALL_ACTIONS.filter((a) => a.category === cat),
  }))

  return (
    <div className="space-y-6">
      {actionsByCategory.map(({ category, actions }) => (
        <div key={category}>
          <h3 className="text-lg font-bold text-prithvi-slate font-devanagari mb-3 px-1">
            {CATEGORY_LABELS[category]}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {actions.map((action) => (
              <ActionCard
                key={action.id}
                id={action.id}
                labelHi={t(`actions.${action.id}`)}
                icon={action.icon}
                category={action.category}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
