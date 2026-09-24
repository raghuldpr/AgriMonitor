/**
 * AgriMonitor Chat & AI Assistant Types (Phase 5)
 */

import { AgricultureTelemetry } from './telemetry';
import { AgricultureAlert } from '../services/alerts/alertTypes';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  isLocalAnswer?: boolean;
}

export interface ChatRequest {
  message: string;
  telemetry?: AgricultureTelemetry | null;
  alerts?: AgricultureAlert[];
  history?: Array<{ role: ChatRole; content: string }>;
}

export interface ChatResponse {
  reply: string;
  provider?: string;
  error?: string;
}
