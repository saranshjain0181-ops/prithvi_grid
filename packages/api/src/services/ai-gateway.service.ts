import axios from 'axios';
import { env } from '../config/env';

/**
 * AI Gateway Service
 * STRICT COMPLIANCE: ONLY Google Gemini API is permitted. Zero third-party providers.
 * Acts as the centralized server-side choke point for all AI interactions.
 */

const SYSTEM_PROMPT = `You are "Prithvi AI" (पृथ्वी AI) — the specialized intelligent assistant for Prithvi Grid, India's premier smart compost monitoring and Solid Waste Management (SWM-2026) compliance SaaS platform.

Your mission is to assist Safai Mitras (ground sanitation workers), BWG Managers (Bulk Waste Generator heads), and Supreme Head Super Admins across Indore Municipal Corporation (IMC) and pan-India facilities.

Core Domain Guidelines:
1. Languages: Fluently understand and reply in Hindi (हिंदी), Hinglish, or English based on user query language. For Safai Mitras, use warm, respectful, simple Hindi (e.g., "नमस्ते भाई, ...").
2. Biological Compost Parameters:
   - Thermophilic Range: 55°C - 65°C (Ideal). Above 70°C: turn waste immediately to cool. Below 45°C: add green waste + jaggery (gud) water.
   - Moisture Range: 40% - 60%. Below 40%: sprinkle water or EM solution. Above 60%: add dry leaves (sookhe patte), sawdust (bhusa), or dry soil.
   - pH Acid Crash: Critical threshold < 5.2. Remedy: Add wood ash (raakh), dry leaves, aerate pit, stop acid inputs.
   - Methane Danger: Alert > 300 PPM, Critical > 450 PPM. Indicates anaerobic decomposition. Remedy: Turn waste (kachra ghumayein), clear leachate drain pipe.
   - Compaction / Choking: Static pressure > 1015 hPa indicates compacted bottom waste.
3. SWM 2026 Compliance:
   - Bulk Waste Generators (BWGs) generating >100 kg/day must process 100% wet waste onsite.
   - Certified audit records prevent municipal fines under SWM-2016 by-laws (subject to verified local municipal penalty slabs).
4. Voice Readiness: Keep answers concise, actionable, and suitable for Text-to-Speech (TTS). Avoid markdown tables in voice replies.`;

export interface ChatParams {
  message: string;
  role: string;
  telemetryContext?: string;
  history?: Array<{ sender: 'user' | 'assistant'; text: string }>;
}

export interface VoiceAudioParams {
  audioBase64: string;
  mimeType?: string;
  language?: string;
  role: string;
  telemetryContext?: string;
}

export interface CommandIntent {
  intent: 'ACTION_LOG' | 'STATUS_QUERY' | 'DIARY_LOG' | 'GENERAL';
  actionType?: string;
  flowType?: 'WASTE_IN' | 'FERTILIZER_OUT';
  estimatedWeightKg?: number;
  confidence: number;
  matchedPhrase?: string;
}

export interface AiResponse {
  reply: string;
  provider: 'GEMINI' | 'PRITHVI_LOCAL_FALLBACK';
  audioPrompt: string;
  suggestedActions?: string[];
  transcript?: string;
  detectedCommand?: CommandIntent;
}

export class AiGatewayService {
  /**
   * Generates conversational compost advice using Google Gemini API or local fallback.
   */
  public async generateChatAdvice(params: ChatParams): Promise<AiResponse> {
    const { message, role, telemetryContext, history } = params;

    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'placeholder_key') {
      try {
        const contents = [
          {
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT}\nUser Role: ${role}\n${telemetryContext || ''}` }],
          },
          {
            role: 'model',
            parts: [{ text: 'नमस्ते! मैं पृथ्वी AI हूँ। मैं आपकी कम्पोस्टिंग और SWM-2026 नियमों में कैसे मदद कर सकता हूँ?' }],
          },
        ];

        if (history && history.length > 0) {
          for (const h of history.slice(-6)) {
            contents.push({
              role: h.sender === 'user' ? 'user' : 'model',
              parts: [{ text: h.text }],
            });
          }
        }

        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });

        // Use Google Gemini 2.0 Flash or 1.5 Flash
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        const res = await axios.post(
          geminiUrl,
          {
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
            },
          },
          { timeout: 8000 }
        );

        const candidate = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          const detected = this.parseClosedVoiceCommand(message);
          return {
            reply: candidate.trim(),
            provider: 'GEMINI',
            audioPrompt: candidate.trim().replace(/[*#_`]/g, ''),
            suggestedActions: detected.actionType ? [detected.actionType] : undefined,
            detectedCommand: detected.confidence > 0.6 ? detected : undefined,
          };
        }
      } catch (err: any) {
        console.warn('Gemini API call failed, invoking deterministic agronomic rule engine fallback:', err.message);
      }
    }

    return this.getDeterministicFallback(message, role);
  }

  /**
   * Processes voice audio payload from Safai Mitra PWA through server-side Gemini 2.0 Multimodal API.
   */
  public async processVoiceAudio(params: VoiceAudioParams): Promise<AiResponse> {
    const { audioBase64, mimeType = 'audio/webm', language = 'hi', role, telemetryContext } = params;

    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'placeholder_key') {
      try {
        const promptText =
          language === 'hi'
            ? `${SYSTEM_PROMPT}\nUser Role: ${role}\n${telemetryContext || ''}\nसुनिए और हिंदी में संक्षिप्त उत्तर दीजिए। साथ ही उपयोगकर्ता ने क्या कहा वह भी समझें।`
            : `${SYSTEM_PROMPT}\nUser Role: ${role}\n${telemetryContext || ''}\nListen to this audio and provide a concise, actionable composting response.`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        const res = await axios.post(
          geminiUrl,
          {
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: audioBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 300,
            },
          },
          { timeout: 10000 }
        );

        const candidate = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          const detected = this.parseClosedVoiceCommand(candidate);
          return {
            reply: candidate.trim(),
            provider: 'GEMINI',
            audioPrompt: candidate.trim().replace(/[*#_`]/g, ''),
            transcript: 'Voice input processed successfully by Gemini',
            suggestedActions: detected.actionType ? [detected.actionType] : undefined,
            detectedCommand: detected.confidence > 0.6 ? detected : undefined,
          };
        }
      } catch (err: any) {
        console.warn('Gemini Audio API call failed, falling back to local speech responder:', err.message);
      }
    }

    const fallbackReply =
      language === 'hi'
        ? 'नमस्ते भाई! गड्ढे में नमी 40-60% रखें। अगर कचरा सूखा है तो पानी छिड़कें, बदबू आए तो कचरा पलटें।'
        : 'Compost check: Maintain moisture between 40-60%. Aerate if odor is detected.';

    return {
      reply: fallbackReply,
      provider: 'PRITHVI_LOCAL_FALLBACK',
      audioPrompt: 'गड्ढे में नमी 40-60% रखें। अगर कचरा सूखा है तो पानी छिड़कें, बदबू आए तो कचरा पलटें।',
    };
  }

  /**
   * Closed-vocabulary speech intent mapper (Workstream E2)
   * Constrains Hindi/Hinglish speech to exact deterministic actions with confidence scoring.
   */
  public parseClosedVoiceCommand(input: string): CommandIntent {
    const text = (input || '').toLowerCase();

    // 1. Specific additives & treatments (evaluated before general water/sprinkle)
    if (/gud|jaggery|gur|गुड़/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'GUD_PAANI_DALA',
        confidence: 0.95,
        matchedPhrase: 'गुड़ पानी डाला / Jaggery Solution In',
      };
    }

    if (/neem|नीम/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'NEEM_POWDER_DALA',
        confidence: 0.95,
        matchedPhrase: 'नीम पाउडर डाला / Neem Cake In',
      };
    }

    if (/mitti|raakh|ash|मिट्टी|राख|चूना/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'MITTI_DALI',
        confidence: 0.9,
        matchedPhrase: 'मिट्टी/राख डाली / Buffer Soil In',
      };
    }

    if (/patte|sookhe|leaves|सूखे\s*पत्ते|पत्ते|भूसा/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'SOOKHE_PATTE_DALA',
        confidence: 0.9,
        matchedPhrase: 'सूखे पत्ते डाले / Dry Leaves In',
      };
    }

    if (/geela\s*kachra|wet\s*waste|सब्जी|गीला\s*कचरा|kachra\s*dala|कचरा\s*डाला/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'GEELA_KACHRA_DALA',
        confidence: 0.9,
        matchedPhrase: 'गीला कचरा डाला / Wet Waste In',
      };
    }

    // 2. Water sprinkling
    if (/paani|pani|chhidk|spray|छिड़क|पानी/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'PAANI_CHHIDKA',
        confidence: 0.95,
        matchedPhrase: 'पानी छिड़का / Water Sprinkled',
      };
    }

    // 3. Composting operations
    if (/khad\s*(nikal|harvest)|compost\s*out|खाद\s*निकाली|खाद/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'KHAD_NIKALI',
        confidence: 0.95,
        matchedPhrase: 'खाद निकाली / Compost Harvested',
      };
    }

    if (/kachra\s*(ghuma|palat|hila|turn)|पलट|घुमा|पलटी/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'KACHRA_GHUMAYA',
        confidence: 0.95,
        matchedPhrase: 'कचरा घुमाया / Waste Turned',
      };
    }

    // 4. Maintenance & Diagnostics
    if (/drain|leachate|pipe|ड्रेन|लीचेट/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'DRAIN_SAAF',
        confidence: 0.9,
        matchedPhrase: 'ड्रेन साफ / Drain Cleared',
      };
    }

    if (/badboo|smell|durghandh|दुर्गंध|बदबू/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'BADBOO_CHECK',
        confidence: 0.9,
        matchedPhrase: 'बदबू रिपोर्ट / Odor Checked',
      };
    }

    if (/keede|maggot|fly|कीड़े|मक्खी/.test(text)) {
      return {
        intent: 'ACTION_LOG',
        actionType: 'KEEDE_REPORT',
        confidence: 0.9,
        matchedPhrase: 'कीड़े रिपोर्ट / Pest Reported',
      };
    }

    // 5. Status inquiries
    if (/haal|status|theek|kaisa|हाल|सब ठीक/.test(text)) {
      return {
        intent: 'STATUS_QUERY',
        confidence: 0.85,
        matchedPhrase: 'स्थिति पूछताछ / Pit Status Query',
      };
    }

    return {
      intent: 'GENERAL',
      confidence: 0.5,
    };
  }

  /**
   * Deterministic biological rule engine fallback
   */
  private getDeterministicFallback(message: string, role: string): AiResponse {
    const lower = message.toLowerCase();
    let replyText = '';
    let actions: string[] = [];

    if (lower.includes('paani') || lower.includes('water') || lower.includes('moisture') || lower.includes('nami')) {
      replyText =
        role === 'SAFAI_MITRA'
          ? 'राम भाई, अगर कम्पोस्ट में नमी 40% से कम है, तो हल्का पानी या EM सॉल्यूशन छिड़कें। अगर गीलापन ज्यादा (60% से ऊपर) है, तो सूखे पत्ते या भूसा मिलाएं।'
          : 'Optimal moisture is 40%-60%. If moisture falls below 40%, sprinkle calibrated water/EM solution. Above 60%, add carbon-rich bulking agent (dry leaves/sawdust).';
      actions = ['PAANI_CHHIDKA', 'SOOKHE_PATTE_DALA'];
    } else if (lower.includes('badboo') || lower.includes('odor') || lower.includes('smell') || lower.includes('methane') || lower.includes('gas')) {
      replyText =
        role === 'SAFAI_MITRA'
          ? 'गड्ढे में बदबू या मीथेन बढ़ने का मतलब है कि हवा रुक गई है। तुरंत कटर से कचरे को ऊपर-नीचे घुमाएं और नीचे का ड्रेन पाइप साफ करें।'
          : 'Odor detected: High methane (>300 PPM) indicates anaerobic conditions. Action required: Aerate pit immediately by turning waste, check bottom drain pipe.';
      actions = ['KACHRA_GHUMAYA', 'DRAIN_SAAF'];
    } else if (lower.includes('ph') || lower.includes('acid') || lower.includes('khatta') || lower.includes('crash')) {
      replyText =
        role === 'SAFAI_MITRA'
          ? 'एसिड क्रैश (pH < 5.2) होने पर सड़ांध बढ़ जाती है। इसमें 5 किलो सूखी लकड़ी की राख (Wood Ash) या सूखा चूना हल्का छिड़कें और 20 किलो सूखे पत्ते मिलाएं।'
          : 'Biological Acid Crash: pH < 5.2 stalls aerobic digestion. Remedy: Buffer with wood ash / biochar, incorporate dry carbon matter, cease citrus inputs.';
      actions = ['MITTI_DALI', 'SOOKHE_PATTE_DALA'];
    } else if (lower.includes('temp') || lower.includes('garam') || lower.includes('taapman') || lower.includes('temperature')) {
      replyText =
        role === 'SAFAI_MITRA'
          ? 'गड्ढे का तापमान 55°C से 65°C के बीच होना चाहिए। अगर 45°C से कम है, तो 15 किलो हरा कचरा और 3 किलो गुड़ का पानी मिलाएं।'
          : 'Thermophilic composting phase operates best between 55°C and 65°C. To reignite cool batches, introduce nitrogen-rich green waste and jaggery inoculum.';
      actions = ['GUD_PAANI_DALA', 'GEELA_KACHRA_DALA'];
    } else if (lower.includes('keede') || lower.includes('maggot') || lower.includes('fly')) {
      replyText =
        role === 'SAFAI_MITRA'
          ? 'कीड़े या मक्खियों को रोकने के लिए ऊपर 2 इंच सूखी मिट्टी या नीम की खली (Neem Cake) की परत चढ़ाएं और ढक्कन बंद रखें।'
          : 'Fly larvae/maggot infestation control: Cap the pit surface with a 2-inch layer of dry cocopeat/soil and apply neem seed powder.';
      actions = ['NEEM_POWDER_DALA', 'MITTI_DALI'];
    } else if (lower.includes('swm') || lower.includes('rule') || lower.includes('compliance') || lower.includes('fine') || lower.includes('challan')) {
      replyText =
        'SWM Rules 2016 (Indore IMC): All Bulk Waste Generators must segregate waste at source and compost 100% wet waste onsite. Prithvi Grid provides certified IoT-backed audit certificates to safeguard against municipal notices.';
    } else {
      replyText =
        role === 'SAFAI_MITRA'
          ? 'नमस्ते! मैं आपका कम्पोस्ट साथी हूँ। आप मुझसे गड्ढे के तापमान, नमी, बदबू, या काम करने के सही तरीके के बारे में कभी भी पूछ सकते हैं।'
          : 'Hello! I am Prithvi AI. Ask me anything about live sensor telemetry, pit biology, composting recipe adjustments, or SWM-2026 compliance audits.';
    }

    const detected = this.parseClosedVoiceCommand(message);
    if (detected.actionType && !actions.includes(detected.actionType)) {
      actions.push(detected.actionType);
    }

    return {
      reply: replyText,
      provider: 'PRITHVI_LOCAL_FALLBACK',
      audioPrompt: replyText.replace(/[*#_`]/g, ''),
      suggestedActions: actions.length > 0 ? actions : undefined,
      detectedCommand: detected.confidence > 0.6 ? detected : undefined,
    };
  }
}

export const aiGateway = new AiGatewayService();
