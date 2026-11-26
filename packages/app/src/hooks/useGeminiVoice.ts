import { useCallback, useRef, useState } from 'react'
import { apiClient } from '../api/client'

export type GeminiVoiceState = 'idle' | 'listening' | 'speaking'

interface GeminiVoiceOptions {
  onTranscript?: (text: string) => void
  onResponse?: (text: string) => void
  language?: 'hi' | 'en'
}

export function useGeminiVoice(options: GeminiVoiceOptions = {}) {
  const { onTranscript, onResponse, language = 'hi' } = options
  const [state, setState] = useState<GeminiVoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startListening = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await sendToGemini(audioBlob)
      }

      mediaRecorder.start(100)
      setState('listening')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone error'
      setError(msg)
      setState('idle')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setState('speaking')
    }
  }, [])

  const toggle = useCallback(() => {
    if (state === 'idle') {
      startListening()
    } else if (state === 'listening') {
      stopListening()
    }
  }, [state, startListening, stopListening])

  const sendToGemini = async (audioBlob: Blob) => {
    try {
      // Convert audio blob to base64 safely
      const arrayBuffer = await audioBlob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64Audio = btoa(binary)

      // Route through secure backend AI Gateway
      const res = await apiClient.post('/ai/voice', {
        audioBase64: base64Audio,
        mimeType: 'audio/webm',
        language,
        role: 'SAFAI_MITRA',
      })

      const text = res.data?.reply || ''
      const recTranscript = res.data?.transcript || ''

      setTranscript(recTranscript)
      setResponse(text)
      onTranscript?.(recTranscript)
      onResponse?.(text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get response'
      setError(msg)
    } finally {
      setState('idle')
    }
  }

  const triggerGreeting = useCallback(async () => {
    try {
      setState('speaking')
      const greetingPrompt =
        language === 'hi'
          ? 'नमस्ते! मैं पृथ्वी AI कम्पोस्ट सहायक हूँ। गड्ढे में नमी, बदबू या तापमान की स्थिति बताएं।'
          : 'Hello! I am the Prithvi AI assistant. How is your compost bin doing today?'

      setResponse(greetingPrompt)
      onResponse?.(greetingPrompt)
    } finally {
      setState('idle')
    }
  }, [language, onResponse])

  return {
    state,
    transcript,
    response,
    error,
    toggle,
    startListening,
    stopListening,
    triggerGreeting,
  }
}
