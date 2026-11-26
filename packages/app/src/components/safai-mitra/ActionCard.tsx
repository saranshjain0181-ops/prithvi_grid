import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { actionsApi } from '@/api/actions.api'
import { offlineSyncService } from '@/services/offline-sync.service'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUiStore } from '@/store/ui.store'
import type { ActionCategory, ActionType } from '@/types'

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  INPUTS: 'from-green-400 to-green-600',
  ACTIONS: 'from-blue-400 to-blue-600',
  MAINTENANCE: 'from-orange-400 to-orange-600',
  REPORTING: 'from-purple-400 to-purple-600',
}

const CATEGORY_BG: Record<ActionCategory, string> = {
  INPUTS: 'bg-green-50 border-green-200',
  ACTIONS: 'bg-blue-50 border-blue-200',
  MAINTENANCE: 'bg-orange-50 border-orange-200',
  REPORTING: 'bg-purple-50 border-purple-200',
}

interface ActionCardProps {
  id: ActionType
  labelHi: string
  icon: string
  category: ActionCategory
  onTap?: (id: ActionType) => void
  isActive?: boolean
}

type ActionCardState = 'default' | 'pending' | 'done' | 'error'

export const ActionCard: React.FC<ActionCardProps> = ({
  id,
  labelHi,
  icon,
  category,
  onTap,
  isActive = false,
}) => {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cardState, setCardState] = useState<ActionCardState>('default')
  const [isOfflineSaved, setIsOfflineSaved] = useState(false)
  const { selectedBoxId, selectedNodeId } = useUiStore()

  const triggerMutation = useMutation({
    mutationFn: () =>
      actionsApi.trigger({
        actionType: id,
        boxId: selectedBoxId!,
        nodeId: selectedNodeId!,
      }),
    onSuccess: () => {
      setCardState('pending')
      setConfirmOpen(false)
    },
    onError: async (err: any) => {
      // Graceful offline fallback (Workstream E1)
      if (!navigator.onLine || err?.message?.includes('Network Error')) {
        await offlineSyncService.enqueue('ACTION_TRIGGER', {
          actionType: id,
          boxId: selectedBoxId!,
          nodeId: selectedNodeId!,
        })
        setIsOfflineSaved(true)
        setCardState('done')
        setConfirmOpen(false)
        setTimeout(() => {
          setIsOfflineSaved(false)
          setCardState('default')
        }, 4000)
        return
      }
      setCardState('error')
      setConfirmOpen(false)
      setTimeout(() => setCardState('default'), 3000)
    },
  })

  const handleTap = () => {
    if (cardState === 'pending') return
    onTap?.(id)
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (!navigator.onLine) {
      await offlineSyncService.enqueue('ACTION_TRIGGER', {
        actionType: id,
        boxId: selectedBoxId!,
        nodeId: selectedNodeId!,
      })
      setIsOfflineSaved(true)
      setCardState('done')
      setConfirmOpen(false)
      setTimeout(() => {
        setIsOfflineSaved(false)
        setCardState('default')
      }, 4000)
      return
    }
    triggerMutation.mutate()
  }

  const stateStyle = {
    default: CATEGORY_BG[category],
    pending: 'bg-yellow-50 border-yellow-300',
    done: 'bg-green-50 border-green-300',
    error: 'bg-red-50 border-red-300',
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.03 }}
        onClick={handleTap}
        className={`
          relative min-h-[160px] min-w-[160px] w-full aspect-square
          flex flex-col items-center justify-center gap-3 p-4
          rounded-3xl border-2 transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-green-300
          ${stateStyle[cardState]}
          ${isActive ? 'ring-4 ring-green-400' : ''}
        `}
        aria-label={labelHi}
      >
        {/* Category stripe */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl bg-gradient-to-r ${CATEGORY_COLORS[category]}`} />

        {/* Pending indicator */}
        {cardState === 'pending' && (
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
        )}

        {/* Icon */}
        <span className="text-5xl select-none">{icon}</span>

        {/* Label */}
        <span className="text-base font-bold text-center text-prithvi-slate font-devanagari leading-tight line-clamp-2">
          {labelHi}
        </span>

        {/* State label */}
        {isOfflineSaved && (
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300 font-devanagari bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
            📦 ऑफ़लाइन सहेजा गया
          </span>
        )}
        {!isOfflineSaved && cardState === 'pending' && (
          <span className="text-xs font-semibold text-yellow-700 font-devanagari">
            {t('actions.verification_pending')}
          </span>
        )}
        {!isOfflineSaved && cardState === 'error' && (
          <span className="text-xs font-semibold text-red-600">Error</span>
        )}
      </motion.button>

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={labelHi}
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="text-7xl">{icon}</span>
          <p className="text-xl font-bold text-prithvi-slate font-devanagari">
            क्या आपने यह काम किया?
          </p>
          <p className="text-base text-slate-500 font-devanagari">
            "{labelHi}" — यह रिकॉर्ड होगा
          </p>
          <div className="flex gap-4 w-full">
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onClick={() => setConfirmOpen(false)}
            >
              नहीं
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={triggerMutation.isPending}
              onClick={handleConfirm}
            >
              ✅ हाँ, किया!
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
