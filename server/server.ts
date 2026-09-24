/**
 * AgriMonitor Express AI Proxy Backend (Phase 5)
 *
 * Exposes:
 * - GET /health & GET /api/health
 * - POST /api/chat (Proxies requests to Groq LLM with full context injection)
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { AIService } from './ai/aiService';

const app = express();
const PORT = process.env.PORT || 3001;

// Body limit and security defaults
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const aiService = new AIService();

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    aiConfigured: aiService.isReady(),
    provider: aiService.getProviderName(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiConfigured: aiService.isReady(),
    provider: aiService.getProviderName(),
  });
});

// Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const response = await aiService.chat(req.body);
    res.json(response);
  } catch (error: any) {
    const errorMessage = error?.message || 'Internal server error';

    // Validation errors
    if (
      errorMessage.includes('Invalid request') ||
      errorMessage.includes('Field "message"') ||
      errorMessage.includes('exceeds maximum length')
    ) {
      return res.status(400).json({ error: errorMessage });
    }

    // Provider configuration or service failure
    if (errorMessage.includes('not configured') || errorMessage.includes('GROQ_API_KEY')) {
      return res.status(503).json({
        error:
          'The agriculture assistant is not configured on the server. Please check backend environment configuration.',
      });
    }

    console.error('[AI Chat Error]:', errorMessage);
    return res.status(500).json({
      error: 'The agriculture assistant is temporarily unavailable. Please try again later.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`[AgriMonitor Server] Listening on port ${PORT}`);
  console.log(`[AgriMonitor Server] AI Service Configured: ${aiService.isReady()}`);
});

export default app;
