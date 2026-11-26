import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, MicOff, Send, X, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: Array<{
    tool: string;
    sourceCollection: string;
    timestamp: string;
    data: Record<string, any>;
  }>;
  suggestedFollowUps?: string[];
}

export const UniversalAiAssistant: React.FC = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Greetings, Supreme Commander. I am Prithvi AI Executive Copilot. I can query city-wide telemetry, analyze SWM-2026 municipal violations, project fleet MRR, or troubleshoot biological anomalies.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window) || !isTtsEnabled) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please type your message.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await apiClient.post('/ai/copilot', {
        message: textToSend.trim(),
        role: 'SUPREME_HEAD',
        history: messages.slice(-6).map((m) => ({
          sender: m.sender,
          text: m.text,
        })),
      });

      const replyText = res.data?.reply || 'Prithvi AI Executive Copilot: Telemetry streaming nominal.';
      const citations = res.data?.citations;
      const followUps = res.data?.suggestedFollowUps;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations,
        suggestedFollowUps: followUps,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (isTtsEnabled) {
        speakText(replyText);
      }
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Network timeout to central AI engine. Falling back to local offline mode.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    'Indore NOC health summary',
    'Financial MRR forecast',
    'Acid-crash risk breakdown',
    'SWM-2026 Audit compliance',
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white font-black px-4 py-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-emerald-300/40"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs tracking-wider uppercase font-sans">
            Supreme Copilot AI
          </span>
          <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-mono">
            GEMINI
          </span>
        </button>
      )}

      {isOpen && (
        <div className="w-[340px] sm:w-[410px] h-[530px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-900 to-slate-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-emerald-700/40 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-tight flex items-center gap-1.5">
                  Supreme Copilot AI
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-emerald-200/80 font-medium font-mono">
                  Executive Command Core • Gemini 1.5
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (isTtsEnabled) window.speechSynthesis?.cancel();
                  setIsTtsEnabled(!isTtsEnabled);
                }}
                title={isTtsEnabled ? 'Mute Voice' : 'Enable Voice'}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                {isTtsEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 opacity-70" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick chips */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="whitespace-nowrap px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-full text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-all hover:bg-emerald-50 dark:hover:bg-slate-700"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl shadow-xs leading-relaxed font-medium ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs'
                  }`}
                >
                  {m.text}

                  {/* Grounded Tool Citations */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1.5">
                      {m.citations.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        >
                          <span>📌</span>
                          <span className="font-bold">{c.sourceCollection}</span>
                          {c.data?.tempC !== undefined && <span>({c.data.tempC}°C)</span>}
                          {c.data?.complianceScorePct !== undefined && <span>({c.data.complianceScorePct}%)</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Suggested Follow-up Questions */}
                  {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                    <div className="mt-2 pt-1 flex flex-wrap gap-1">
                      {m.suggestedFollowUps.map((fu, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSendMessage(fu)}
                          className="text-[10px] bg-slate-100 hover:bg-emerald-50 dark:bg-slate-700 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 px-2 py-0.5 rounded-md transition"
                        >
                          💡 {fu}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl w-fit border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Synthesizing biological telemetry...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <div className="bg-red-50 dark:bg-red-950/80 border-t border-red-200 dark:border-red-900 px-4 py-2 flex items-center justify-between text-xs text-red-600 dark:text-red-400 font-bold animate-pulse">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                Listening to executive voice command...
              </span>
              <button
                type="button"
                onClick={toggleRecording}
                className="text-[10px] uppercase font-black underline"
              >
                Stop
              </button>
            </div>
          )}

          {/* Footer Input */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Query NOC fleet, financial MRR, or AI Sanjivani..."
              className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <button
              type="button"
              onClick={toggleRecording}
              title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
              className={`p-2.5 rounded-xl border transition-all ${
                isRecording
                  ? 'bg-red-600 border-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className={`p-2.5 rounded-xl transition-all ${
                input.trim() && !isLoading
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default UniversalAiAssistant;
