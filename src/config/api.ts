/**
 * AgriMonitor API Configuration (Phase 5)
 *
 * Configurable API base URL for Express AI Proxy Backend.
 *
 * For Android Emulator: 'http://10.0.2.2:3001'
 * For Local Web / Node Tests: 'http://localhost:3001'
 * For Physical Android Device on LAN: Replace with your development PC IP (e.g., 'http://192.168.1.100:3001')
 */

import { Platform } from 'react-native';

export const API_CONFIG = {
  // Default to 10.0.2.2 for Android emulator, localhost for web/node
  BASE_URL: Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001',
  TIMEOUT_MS: 20000,
  ENDPOINTS: {
    HEALTH: '/health',
    CHAT: '/api/chat',
  },
};
