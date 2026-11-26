import { ContextEntityType, ContextualThread, IContextualThread, IThreadMessage } from '../db/models/ContextualThread.js';
import crypto from 'crypto';

// Compost-specific domain dictionary for deterministic translation
const HINDI_TO_ENGLISH_GLOSSARY: Record<string, string> = {
  palatna: 'turning',
  palat: 'turned',
  khad: 'compost',
  kachra: 'wet waste',
  parat: 'layer',
  pani: 'water',
  chhidka: 'sprinkled',
  leachate: 'leachate',
  taza: 'fresh',
  badbu: 'odor',
  raakh: 'wood ash',
  bhusa: 'sawdust / bulking',
};

const ENGLISH_TO_HINDI_GLOSSARY: Record<string, string> = {
  turning: 'पलटाई (palatna)',
  turned: 'पलट दिया (palat diya)',
  compost: 'खाद (khad)',
  'wet waste': 'गीला कचरा (kachra)',
  layer: 'परत (parat)',
  water: 'पानी (pani)',
  sprinkled: 'छिड़का (chhidka)',
  leachate: 'लीचेट (leachate)',
  fresh: 'ताजा (taza)',
  odor: 'बदबू (badbu)',
  'wood ash': 'लकड़ी की राख (raakh)',
  sawdust: 'लकड़ी का बुरादा / भूसा (bhusa)',
};

export class ThreadService {
  /**
   * Translates domain text between Hindi/Hinglish and English using composting domain glossary
   */
  translateText(text: string, fromLang: 'hi' | 'hinglish' | 'en'): { translatedText: string; targetLang: string } {
    if (fromLang === 'en') {
      let out = text;
      for (const [enTerm, hiTerm] of Object.entries(ENGLISH_TO_HINDI_GLOSSARY)) {
        const regex = new RegExp(`\\b${enTerm}\\b`, 'gi');
        out = out.replace(regex, hiTerm);
      }
      return { translatedText: out, targetLang: 'hi' };
    } else {
      let out = text;
      for (const [hiTerm, enTerm] of Object.entries(HINDI_TO_ENGLISH_GLOSSARY)) {
        const regex = new RegExp(`\\b${hiTerm}\\b`, 'gi');
        out = out.replace(regex, enTerm);
      }
      return { translatedText: out, targetLang: 'en' };
    }
  }

  /**
   * Appends a message to a contextual thread and generates automatic domain translation
   */
  async postMessage(params: {
    entityId: string;
    facilityId: string;
    targetEntityType: ContextEntityType;
    targetEntityId: string;
    title?: string;
    authorId: string;
    authorRole: string;
    text: string;
    language: 'hi' | 'hinglish' | 'en';
    audioUrl?: string;
  }): Promise<{ thread: IContextualThread; message: IThreadMessage }> {
    const threadId = `TH-${params.targetEntityType}-${params.targetEntityId}`;
    const translation = this.translateText(params.text, params.language);

    const message: IThreadMessage = {
      messageId: `MSG-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      authorId: params.authorId,
      authorRole: params.authorRole,
      originalText: params.text,
      originalLanguage: params.language,
      translatedText: translation.translatedText,
      translatedLanguage: translation.targetLang,
      audioUrl: params.audioUrl,
      timestamp: new Date(),
    };

    const thread = await ContextualThread.findOneAndUpdate(
      { threadId },
      {
        $setOnInsert: {
          threadId,
          entityId: params.entityId,
          facilityId: params.facilityId,
          targetEntityType: params.targetEntityType,
          targetEntityId: params.targetEntityId,
          title: params.title || `Discussion: ${params.targetEntityType} ${params.targetEntityId}`,
          status: 'OPEN',
        },
        $push: { messages: message },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { thread, message };
  }
}

export const threadService = new ThreadService();
