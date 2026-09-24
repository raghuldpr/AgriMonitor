/**
 * AgriMonitor Groq AI Provider (Phase 5)
 *
 * Concrete implementation of AIProvider backed by the Groq SDK and open-source models.
 */

import Groq from 'groq-sdk';

export interface ProviderChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  readonly providerName: string;
  isConfigured(): boolean;
  generateResponse(
    systemPrompt: string,
    messages: ProviderChatMessage[]
  ): Promise<string>;
}

export class GroqProvider implements AIProvider {
  public readonly providerName = 'Groq';
  private groqClient: Groq | null = null;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    this.modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    if (apiKey && apiKey !== 'your_groq_api_key_here' && apiKey.trim().length > 0) {
      this.groqClient = new Groq({ apiKey });
    }
  }

  public isConfigured(): boolean {
    return this.groqClient !== null;
  }

  public getModelName(): string {
    return this.modelName;
  }

  public async generateResponse(
    systemPrompt: string,
    messages: ProviderChatMessage[]
  ): Promise<string> {
    if (!this.groqClient) {
      throw new Error(
        'Groq API key is not configured on the backend. Please set GROQ_API_KEY in your server .env file.'
      );
    }

    try {
      const formattedMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const completion = await this.groqClient.chat.completions.create({
        model: this.modelName,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const reply = completion.choices[0]?.message?.content;
      if (!reply) {
        throw new Error('Groq model returned an empty response.');
      }

      return reply.trim();
    } catch (err: any) {
      console.error('[GroqProvider Error]:', err?.message || err);
      throw new Error(err?.message || 'Failed to generate response from Groq LLM.');
    }
  }
}
