import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGeminiVoice, type GeminiVoiceState } from '@/hooks/useGeminiVoice'

interface GeminiVoiceOrbProps {
  onResponse?: (text: string) => void
  language?: 'hi' | 'en'
}

const ORB_CONFIG: Record<GeminiVoiceState, { colors: string[]; scale: number[]; duration: number }> = {
  idle: {
    colors: ['#6366F1', '#818CF8', '#6366F1'],
    scale: [1, 1.08, 1],
    duration: 3,
  },
  listening: {
    colors: ['#3B82F6', '#60A5FA', '#3B82F6'],
    scale: [1, 1.2, 1],
    duration: 0.8,
  },
  speaking: {
    colors: ['#22C55E', '#4ADE80', '#22C55E'],
    scale: [1, 1.15, 1],
    duration: 1.2,
  },
}

export const GeminiVoiceOrb: React.FC<GeminiVoiceOrbProps> = ({
  onResponse,
  language = 'hi',
}) => {
  const { state, response, toggle, triggerGreeting } = useGeminiVoice({
    onResponse,
    language,
  })

  const config = ORB_CONFIG[state]

  useEffect(() => {
    // Greet on mount after a short delay
    const timer = setTimeout(() => {
      triggerGreeting()
    }, 1500)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Orb */}
      <motion.button
        onClick={toggle}
        className="relative w-36 h-36 rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-300 active:scale-95"
        animate={{ scale: config.scale }}
        transition={{
          duration: config.duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        aria-label={state === 'listening' ? 'बंद करें' : 'बोलें'}
      >
        {/* Glow rings */}
        <motion.div
          className="absolute inset-0 rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${config.colors[1]} 0%, transparent 70%)` }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: config.duration * 1.5, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-[-16px] rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${config.colors[0]} 0%, transparent 70%)` }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: config.duration * 2, repeat: Infinity }}
        />

        {/* Core orb */}
        <motion.div
          className="w-28 h-28 rounded-full flex items-center justify-center shadow-2xl"
          animate={{ background: config.colors }}
          transition={{ duration: config.duration, repeat: Infinity }}
        >
          {/* Icon */}
          {state === 'idle' && (
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
          {state === 'listening' && (
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" />
                <circle cx="12" cy="12" r="8" fillOpacity={0.3} />
              </svg>
            </motion.div>
          )}
          {state === 'speaking' && (
            <div className="flex items-end gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-white rounded-full"
                  animate={{ height: ['8px', '28px', '8px'] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.button>

      {/* State Label */}
      <div className="text-center">
        {state === 'idle' && (
          <p className="text-lg font-semibold text-slate-600 font-devanagari">
            दबाएं और बोलें
          </p>
        )}
        {state === 'listening' && (
          <p className="text-lg font-bold text-blue-600 font-devanagari animate-pulse">
            🎤 सुन रहा हूं...
          </p>
        )}
        {state === 'speaking' && (
          <p className="text-lg font-bold text-green-600 font-devanagari">
            💬 जवाब दे रहा हूं...
          </p>
        )}
      </div>

      {/* Response bubble */}
      {response && state === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 max-w-sm"
        >
          <p className="text-base text-indigo-900 font-devanagari leading-relaxed">
            {response}
          </p>
        </motion.div>
      )}
    </div>
  )
}
