/**
 * AgriMonitor Frontend Chat Service (Phase 5)
 *
 * Coordinates offline common questions matching with backend Express AI Proxy.
 */

import { API_CONFIG } from '../../config/api';
import { AgricultureTelemetry } from '../../types/telemetry';
import { AgricultureAlert } from '../alerts/alertTypes';
import { ChatMessage, ChatRequest, ChatResponse } from '../../types/chat';
import { matchCommonQuestion } from '../../lib/commonQuestions';

export interface SendMessageResult {
  reply: string;
  isLocalAnswer: boolean;
  provider?: string;
  error?: boolean;
}

export class ChatService {
  /**
   * Send a chat message with current telemetry & alert context
   */
  public static async sendMessage(
    message: string,
    telemetry?: AgricultureTelemetry | null,
    alerts?: AgricultureAlert[],
    history?: ChatMessage[]
  ): Promise<SendMessageResult> {
    const trimmed = message.trim();
    if (!trimmed) {
      return {
        reply: 'Please enter a valid message or question.',
        isLocalAnswer: true,
        error: true,
      };
    }

    // 1. Check Offline Common Questions Matcher
    const localMatch = matchCommonQuestion(trimmed);
    if (localMatch.matched) {
      return {
        reply: localMatch.reply,
        isLocalAnswer: true,
      };
    }

    // 2. Delegate to Express AI Proxy Backend
    const requestPayload: ChatRequest = {
      message: trimmed,
      telemetry: telemetry
        ? {
            temperature: telemetry.temperature,
            humidity: telemetry.humidity,
            soilMoisture: telemetry.soilMoisture,
            tds: telemetry.tds,
            timestamp: telemetry.timestamp,
          }
        : null,
      alerts: alerts || [],
      history: (history || []).slice(-15).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const serverError = errorData.error || `Server responded with status ${response.status}`;
        console.warn('[ChatService Backend Warning]:', serverError);

        return {
          reply:
            'The agriculture assistant is temporarily unavailable. Please check your backend connection and try again.',
          isLocalAnswer: false,
          error: true,
        };
      }

      const data: ChatResponse = await response.json();
      return {
        reply: data.reply || 'No response received from the assistant.',
        isLocalAnswer: false,
        provider: data.provider,
      };
    } catch (err: any) {
      console.warn('[ChatService Network Error]:', err?.message || err);

      return {
        reply:
          "I couldn't connect to the agriculture assistant. Please check the backend connection and try again.",
        isLocalAnswer: false,
        error: true,
      };
    }
  }
}
