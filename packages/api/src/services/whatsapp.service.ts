import axios from 'axios';
import { env } from '../config/env';

export interface WhatsAppMessagePayload {
  to: string; // E.164 formatted phone e.g. +919876543210
  templateName?: string;
  parameters?: Record<string, string>;
  messageBody?: string;
}

/**
 * WhatsApp alert dispatch service via Twilio or WATI / Meta Cloud API.
 */
export async function sendWhatsAppAlert(payload: WhatsAppMessagePayload): Promise<boolean> {
  const { to, messageBody, templateName, parameters } = payload;

  if (!env.WHATSAPP_API_KEY) {
    console.log(`[DEV WhatsApp Alert] To: ${to} | Msg: ${messageBody || templateName}`);
    return true;
  }

  try {
    // If configured with WATI / Cloud API
    const response = await axios.post(
      'https://api.wati.io/api/v1/sendSessionMessage',
      {
        whatsappNumber: to.replace('+', ''),
        messageText: messageBody,
        templateName,
        parameters,
      },
      {
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      }
    );

    return response.status >= 200 && response.status < 300;
  } catch (error: any) {
    console.error('[WhatsApp Service Error]', error?.response?.data || error?.message);
    return false;
  }
}
