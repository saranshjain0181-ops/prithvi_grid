import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { actionsApi } from '@/api/actions.api'
import { offlineSyncService } from '@/services/offline-sync.service'
import { useUiStore } from '@/store/ui.store'
import { Modal } from '@/components/ui/Modal'

export const MarkDoneButton: React.FC = () => {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [isOfflineSaved, setIsOfflineSaved] = useState(false)
  const { selectedBoxId, selectedNodeId } = useUiStore()
  const queryClient = useQueryClient()

  const handleOfflineSave = async () => {
    await offlineSyncService.enqueue('ACTION_TRIGGER', {
      actionType: 'KACHRA_GHUMAYA',
      boxId: selectedBoxId!,
      nodeId: selectedNodeId!,
      notes: 'Daily shift complete',
    })
    setIsOfflineSaved(true)
    setDone(true)
    setConfirmOpen(false)
    setTimeout(() => {
      setDone(false)
      setIsOfflineSaved(false)
    }, 5000)
  }

  const mutation = useMutation({
    mutationFn: () =>
      actionsApi.trigger({
        actionType: 'KACHRA_GHUMAYA',
        boxId: selectedBoxId!,
        nodeId: selectedNodeId!,
        notes: 'Daily shift complete',
      }),
    onSuccess: () => {
      setDone(true)
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['my-actions'] })
      setTimeout(() => setDone(false), 5000)
    },
    onError: async (err: any) => {
      if (!navigator.onLine || err?.message?.includes('Network Error')) {
        await handleOfflineSave()
      }
    },
  })

  const handleExecute = async () => {
    if (!navigator.onLine) {
      await handleOfflineSave()
      return
    }
    mutation.mutate()
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setConfirmOpen(true)}
        disabled={mutation.isPending || done}
        className={`
          w-full py-7 px-8 rounded-3xl text-white text-2xl font-black
          font-devanagari tracking-wide shadow-2xl
          flex items-center justify-center gap-4
          transition-all duration-300 select-none
          focus:outline-none focus:ring-4 focus:ring-green-300
          disabled:opacity-70 disabled:pointer-events-none
          ${done
            ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-green-300'
            : 'bg-gradient-to-r from-green-500 to-green-700 shadow-green-400 hover:from-green-600 hover:to-green-800 active:scale-95'
          }
        `}
        aria-label={t('mark_done')}
      >
        <motion.span
          animate={done ? { rotate: [0, 15, -15, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="text-3xl"
        >
          {isOfflineSaved ? '📦' : done ? '🎉' : '✅'}
        </motion.span>
        <span>
          {isOfflineSaved
            ? 'ऑफ़लाइन दर्ज हुआ! शाबाश!'
            : done
            ? 'काम हो गया! शाबाश!'
            : t('mark_done')}
        </span>
      </motion.button>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="text-7xl">✅</span>
          <p className="text-2xl font-black text-prithvi-slate font-devanagari">
            आज का काम पूरा?
          </p>
          <p className="text-base text-slate-500 font-devanagari">
            यह रिकॉर्ड होगा और मैनेजर को दिखेगा
          </p>
          <div className="flex gap-4 w-full">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 text-lg font-bold font-devanagari"
            >
              नहीं
            </button>
            <button
              onClick={handleExecute}
              disabled={mutation.isPending}
              className="flex-1 py-4 rounded-2xl bg-prithvi-green text-white text-lg font-black font-devanagari shadow-lg"
            >
              {mutation.isPending ? '...' : '✅ हाँ!'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
