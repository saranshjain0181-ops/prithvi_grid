import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, MicOff, Send, X, Volume2, VolumeX, Sparkles, CheckSquare } from 'lucide-react';
import { apiClient } from '../../api/client';
import { actionsApi } from '../../api/actions.api';
import { offlineSyncService } from '../../services/offline-sync.service';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    actionType: string;
    matchedPhrase?: string;
  };
  citations?: Array<{
    tool: string;
    sourceCollection: string;
    timestamp: string;
    data: Record<string, any>;
  }>;
  suggestedFollowUps?: string[];
}

interface UniversalAiAssistantProps {
  userRole?: 'SUPREME_HEAD' | 'BWG_MANAGER' | 'SAFAI_MITRA' | string;
  autoSpeak?: boolean;
}

export const UniversalAiAssistant: React.FC<UniversalAiAssistantProps> = ({
  userRole,
  autoSpeak = false,
}) => {
  const { user, role: storeRole } = useAuthStore();
  const role = userRole || storeRole;
  const { selectedFacilityId, selectedBoxId, selectedNodeId } = useUiStore();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text:
        role === 'SAFAI_MITRA'
          ? `नमस्ते ${user?.name || 'साथी'}! मैं पृथ्वी AI कम्पोस्ट सहायक हूँ। गड्ढे के तापमान, पानी डालने या बदबू की समस्या के लिए माइक बटन दबाकर पूछें।`
          : `Hello ${user?.name || 'Manager'}! I am Prithvi AI Assistant. I can assist with real-time sensor telemetry, biological troubleshooting, and SWM-2026 compliance audits.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(autoSpeak || role === 'SAFAI_MITRA');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Text-To-Speech helper
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window) || !isTtsEnabled) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = role === 'SAFAI_MITRA' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Speech-to-Text handler
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
      recognition.lang = role === 'SAFAI_MITRA' ? 'hi-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

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
        role: role || 'BWG_MANAGER',
        context: {
          facilityId: selectedFacilityId || undefined,
          boxId: selectedBoxId || undefined,
          nodeId: selectedNodeId || undefined,
        },
        history: messages.slice(-6).map((m) => ({
          sender: m.sender,
          text: m.text,
        })),
      });

      const replyText = res.data?.reply || 'पृथ्वी AI: कम्पोस्टिंग प्रक्रिया की निगरानी जारी है।';
      const detected = res.data?.detectedCommand;
      const citations = res.data?.citations;
      const followUps = res.data?.suggestedFollowUps;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction:
          detected?.actionType
            ? {
                actionType: detected.actionType,
                matchedPhrase: detected.matchedPhrase || detected.actionType,
              }
            : undefined,
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
        text: 'सर्वर से जुड़ने में समस्या हुई। कृपया पुनः प्रयास करें।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteSuggestedAction = async (actionType: string) => {
    if (!selectedBoxId || !selectedNodeId) {
      alert('कृपया पहले शीर्ष बार से गड्ढा और नोड चुनें (Please select Box & Node first)');
      return;
    }

    try {
      if (!navigator.onLine) {
        await offlineSyncService.enqueue('ACTION_TRIGGER', {
          actionType,
          boxId: selectedBoxId,
          nodeId: selectedNodeId,
          notes: 'Triggered via Prithvi AI Voice Assistant [Offline]',
        });
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'assistant',
            text: `📦 ऑफ़लाइन दर्ज हुआ: कार्य '${actionType}' कतार में जोड़ दिया गया है। नेटवर्क आने पर सिंक होगा।`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }

      await actionsApi.trigger({
        actionType: actionType as any,
        boxId: selectedBoxId,
        nodeId: selectedNodeId,
        notes: 'Triggered via Prithvi AI Voice Assistant',
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: `✅ कार्य '${actionType}' सफलतापूर्वक दर्ज कर दिया गया है! काम का सबूत (Kaam Ka Saboot) सत्यापन प्रक्रिया शुरू हो गई है।`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: `कार्य दर्ज करने में त्रुटि: ${err?.response?.data?.message || err?.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const quickQuestions =
    role === 'SAFAI_MITRA'
      ? ['पानी कब छिड़कना है?', 'कचरा कब घुमाना है?', 'बदबू आ रही है', 'तापमान ठंडा है']
      : ['Moisture optimization recipe', 'Acid crash buffer instructions', 'SWM-2026 Audit check', 'Odor warning analysis'];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black px-4 py-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-emerald-300/40"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs tracking-wider uppercase font-sans">
            {role === 'SAFAI_MITRA' ? 'पृथ्वी AI सहायक' : 'Prithvi AI Assistant'}
          </span>
          <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-mono">
            LIVE
          </span>
        </button>
      )}

      {/* Expanded Chat Modal */}
      {isOpen && (
        <div className="w-[340px] sm:w-[390px] h-[520px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white px-4 py-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-tight flex items-center gap-1.5">
                  Prithvi AI • पृथ्वी सहायक
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                </h3>
                <p className="text-[10px] text-emerald-100 font-medium">
                  {role === 'SAFAI_MITRA' ? 'सफाई मित्र मोड (Hindi Voice Ready)' : 'Autonomous Compost Intelligence'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* TTS Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (isTtsEnabled) window.speechSynthesis?.cancel();
                  setIsTtsEnabled(!isTtsEnabled);
                }}
                title={isTtsEnabled ? 'Mute Voice' : 'Enable Voice'}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                {isTtsEnabled ? <Volume2 className="w-4 h-4 text-amber-300" /> : <VolumeX className="w-4 h-4 opacity-70" />}
              </button>

              {/* Close Button */}
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

          {/* Quick Action Chips */}
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

          {/* Messages Feed */}
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

                  {/* Grounded Tool Citations (Workstream J3) */}
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

                {/* 1-Tap Action Confirmation Card (Workstream E2: Closed Vocabulary Speech Command) */}
                {m.suggestedAction && (
                  <div className="mt-1.5 p-2.5 max-w-[85%] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl shadow-xs flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 text-xs font-bold font-devanagari">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>पहचाना गया कार्य: {m.suggestedAction.matchedPhrase}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExecuteSuggestedAction(m.suggestedAction!.actionType)}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>✅ हाँ, अभी दर्ज करें (Confirm)</span>
                    </button>
                  </div>
                )}

                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl w-fit border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  पृथ्वी AI सोच रहा है...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Recording Banner when active */}
          {isRecording && (
            <div className="bg-red-50 dark:bg-red-950/80 border-t border-red-200 dark:border-red-900 px-4 py-2 flex items-center justify-between text-xs text-red-600 dark:text-red-400 font-bold animate-pulse">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                बोलिए, आवाज़ रिकॉर्ड हो रही है (Listening...)...
              </span>
              <button
                type="button"
                onClick={toggleRecording}
                className="text-[10px] uppercase font-black underline"
              >
                बंद करें (Stop)
              </button>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={role === 'SAFAI_MITRA' ? 'सवाल लिखें या माइक दबाएं...' : 'Ask about composting, recipes, or rules...'}
              className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* Microphone Toggle Button */}
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

            {/* Send Button */}
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
