import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { BoxStatus } from '@/types'

interface StatusBannerProps {
  status: BoxStatus
}

const STATUS_CONFIG = {
  HEALTHY: {
    bg: 'bg-prithvi-green',
    text: 'text-white',
    emoji: '🟢',
    key: 'status.healthy' as const,
    pulse: false,
  },
  TURN_WASTE: {
    bg: 'bg-prithvi-yellow',
    text: 'text-white',
    emoji: '🟡',
    key: 'status.turn_waste' as const,
    pulse: false,
  },
  ADD_WATER: {
    bg: 'bg-prithvi-blue',
    text: 'text-white',
    emoji: '🔵',
    key: 'status.add_water' as const,
    pulse: false,
  },
  EMERGENCY: {
    bg: 'bg-prithvi-red',
    text: 'text-white',
    emoji: '🔴',
    key: 'status.emergency' as const,
    pulse: true,
  },
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ status }) => {
  const { t } = useTranslation()
  const config = STATUS_CONFIG[status]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`w-full ${config.bg} ${config.text} relative overflow-hidden`}
      >
        {config.pulse && (
          <motion.div
            className="absolute inset-0 bg-white/20"
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div className="flex items-center justify-center gap-3 px-4 py-6">
          <span className="text-5xl">{config.emoji}</span>
          <span className="text-4xl font-black font-devanagari tracking-wide">
            {t(config.key)}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
