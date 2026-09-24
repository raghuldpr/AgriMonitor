/**
 * AgriMonitor Express API Proxy & Groq AI Gateway
 * Proxies AI queries securely to Groq without exposing API keys on the mobile client.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Groq client
const groqApiKey = process.env.GROQ_API_KEY;
let groq: Groq | null = null;

if (groqApiKey && groqApiKey !== 'YOUR_GROQ_API_KEY') {
  groq = new Groq({ apiKey: groqApiKey });
}

const AGRI_ASSISTANT_SYSTEM_INSTRUCTION = `You are AgriMonitor Assistant, an expert agricultural advisor providing practical, actionable, and science-based farming guidance.

You assist farmers and agronomists with:
1. Soil moisture interpretation and irrigation scheduling
2. Mineral conductivity / TDS context (explaining that TDS reflects total dissolved minerals/salts in water/soil extract, not a specific single nutrient deficiency)
3. Temperature & relative humidity management (heat stress, frost mitigation, fungal disease risk)
4. Soil pH concepts (nutrient availability across acidic, neutral, and alkaline soils)
5. Practical NPK & fertilizer application strategies

GUIDELINES:
- Provide clear, direct, practical, and constructive explanations.
- When live sensor context is provided, incorporate the specific readings (temperature, humidity, soil moisture, TDS, pH) into your recommendations.
- DISCLAIMER: Always provide informational advice and encourage local soil lab testing or certified agronomist consultation for commercial decisions.`;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'AgriMonitor API Gateway',
    aiProvider: groq ? 'Groq (Active)' : 'Simulated / Fallback Mode',
    timestamp: new Date().toISOString()
  });
});

// AI Chat endpoint
app.post('/api/ai/chat', async (req, res) => {
  const { message, question, context } = req.body || {};
  const userPrompt = message || question;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing prompt message or question.' });
  }

  const sensorContextText = context ? `
LIVE SENSOR CONTEXT:
- Temperature: ${context.temperature ?? 'N/A'} °C
- Humidity: ${context.humidity ?? 'N/A'} %
- Soil Moisture: ${context.soilMoisture ?? 'N/A'} %
- TDS (Dissolved Solids): ${context.tds ?? 'N/A'} ppm
- Soil pH: ${context.ph ?? 'N/A'}
  `.trim() : 'No live sensor data attached.';

  const fullPrompt = `${sensorContextText}\n\nFARMER INQUIRY:\n${userPrompt}`;

  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: AGRI_ASSISTANT_SYSTEM_INSTRUCTION },
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const reply = completion.choices[0]?.message?.content || 'Unable to generate advice.';
      return res.json({
        reply,
        model: 'llama-3.3-70b-versatile',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.warn('[AI Proxy] Groq API call failed, falling back to local heuristic response:', err.message);
    }
  }

  // Local fallback response when Groq API key is not configured
  let fallbackReply = "Based on your current field readings, keep monitoring soil moisture and ensure adequate irrigation timing during cooler morning or evening hours.";
  const lowerQ = userPrompt.toLowerCase();

  if (lowerQ.includes('soil') || lowerQ.includes('moisture') || lowerQ.includes('water') || lowerQ.includes('irrigat')) {
    fallbackReply = "Optimal soil moisture for most staple crops ranges between 40% and 70%. When moisture falls below 30%, plants begin to experience vegetative drought stress. Consider drip irrigation in the early morning to minimize evaporation.";
  } else if (lowerQ.includes('tds') || lowerQ.includes('nutrient') || lowerQ.includes('conductiv') || lowerQ.includes('mineral')) {
    fallbackReply = "TDS (Total Dissolved Solids) measures total dissolved mineral ions and salts in the soil solution or irrigation water. Higher TDS indicates high mineral salinity, while very low TDS indicates low dissolved minerals. Note: TDS is a general conductivity index and does not distinguish between individual N, P, or K ions.";
  } else if (lowerQ.includes('ph') || lowerQ.includes('acid') || lowerQ.includes('alkalin')) {
    fallbackReply = "Most crops thrive in slightly acidic to neutral soil (pH 6.0 to 7.0), where macronutrients (N, P, K) have maximum bioavailability. Soil pH below 5.5 can restrict phosphorus uptake and cause aluminum toxicity, which can be mitigated with agricultural lime.";
  } else if (lowerQ.includes('fertilizer') || lowerQ.includes('urea') || lowerQ.includes('dap') || lowerQ.includes('npk')) {
    fallbackReply = "When calculating fertilizer, apply recommended doses based on crop-specific acreage. Use our Fertilizer Calculator tab to compute exact bag counts and avoid over-application.";
  }

  return res.json({
    reply: `${fallbackReply}\n\n(Note: AgriMonitor AI provides educational agronomic advice. Verify with your local agricultural extension for localized field recommendations.)`,
    model: 'offline-fallback',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[AgriMonitor Server] Listening on port ${PORT}`);
});
