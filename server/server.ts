/**
 * AgriMonitor Minimal Express Backend (Phase 1)
 *
 * Prepared for future AI API proxy gateway.
 * Currently exposes minimal health check endpoint.
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Phase 1 Health Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
  });
});

app.listen(PORT, () => {
  console.log(`[AgriMonitor Server] Listening on port ${PORT}`);
});
