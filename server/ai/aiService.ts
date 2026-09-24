/**
 * AgriMonitor AI Service Layer (Phase 5)
 *
 * Handles request validation, context prompt construction, and provider delegation.
 */

import { AIProvider, GroqProvider, ProviderChatMessage } from './groqProvider';
import {
  BASE_AGRICULTURE_SYSTEM_PROMPT,
  buildAgronomicContextPrompt,
  TelemetryContextData,
  AlertContextData,
} from './prompts';

export interface ChatServiceRequest {
  message: string;
  telemetry?: TelemetryContextData | null;
  alerts?: AlertContextData[] | null;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatServiceResponse {
  reply: string;
  provider: string;
}

export class AIService {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider || new GroqProvider();
  }

  public isReady(): boolean {
    return this.provider.isConfigured();
  }

  public getProviderName(): string {
    return this.provider.providerName;
  }

  public validateRequest(req: any): ChatServiceRequest {
    if (!req || typeof req !== 'object') {
      throw new Error('Invalid request body: expected a JSON object.');
    }

    if (req.message === undefined || req.message === null || typeof req.message !== 'string') {
      throw new Error('Field "message" is required and must be a string.');
    }

    const trimmedMessage = req.message.trim();
    if (trimmedMessage.length === 0) {
      throw new Error('Field "message" cannot be empty.');
    }

    if (trimmedMessage.length > 4000) {
      throw new Error('Field "message" exceeds maximum length of 4000 characters.');
    }

    // Validate telemetry if provided
    let validatedTelemetry: TelemetryContextData | null = null;
    if (req.telemetry && typeof req.telemetry === 'object') {
      validatedTelemetry = {};
      if (typeof req.telemetry.temperature === 'number' && !isNaN(req.telemetry.temperature)) {
        validatedTelemetry.temperature = Number(req.telemetry.temperature.toFixed(2));
      }
      if (typeof req.telemetry.humidity === 'number' && !isNaN(req.telemetry.humidity)) {
        validatedTelemetry.humidity = Number(req.telemetry.humidity.toFixed(2));
      }
      if (typeof req.telemetry.soilMoisture === 'number' && !isNaN(req.telemetry.soilMoisture)) {
        validatedTelemetry.soilMoisture = Number(req.telemetry.soilMoisture.toFixed(2));
      }
      if (typeof req.telemetry.tds === 'number' && !isNaN(req.telemetry.tds)) {
        validatedTelemetry.tds = Number(req.telemetry.tds.toFixed(2));
      }
    }

    // Validate alerts if provided
    let validatedAlerts: AlertContextData[] | null = null;
    if (Array.isArray(req.alerts)) {
      validatedAlerts = req.alerts
        .filter((a: any) => a && typeof a === 'object')
        .slice(0, 10)
        .map((a: any) => ({
          parameter: String(a.parameter || 'unknown'),
          status: String(a.status || 'ALERT'),
          severity: String(a.severity || 'WARNING'),
          value: typeof a.value === 'number' ? a.value : undefined,
          message: typeof a.message === 'string' ? a.message.slice(0, 200) : undefined,
        }));
    }

    // Validate & sanitize history (keep last 15 messages)
    let validatedHistory: ProviderChatMessage[] = [];
    if (Array.isArray(req.history)) {
      validatedHistory = req.history
        .filter(
          (m: any) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim().length > 0
        )
        .slice(-15)
        .map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content.slice(0, 2000).trim(),
        }));
    }

    return {
      message: trimmedMessage,
      telemetry: validatedTelemetry,
      alerts: validatedAlerts,
      history: validatedHistory,
    };
  }

  public async chat(request: ChatServiceRequest): Promise<ChatServiceResponse> {
    const validated = this.validateRequest(request);

    // Build context-injected system prompt
    const contextPrompt = buildAgronomicContextPrompt(validated.telemetry, validated.alerts);
    const fullSystemPrompt = `${BASE_AGRICULTURE_SYSTEM_PROMPT}\n\n${contextPrompt}`;

    // Assemble messages array with current user message appended
    const conversationMessages: ProviderChatMessage[] = [
      ...(validated.history || []),
      { role: 'user', content: validated.message },
    ];

    const reply = await this.provider.generateResponse(fullSystemPrompt, conversationMessages);

    return {
      reply,
      provider: this.provider.providerName,
    };
  }
}
