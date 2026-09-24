/**
 * AgriMonitor Phase 5 AI Assistant & Chat Unit Tests
 *
 * Verifies:
 * 1. Chat request validation (message limits, history trimming, telemetry validation).
 * 2. Context prompt generation (sensor injection & agronomic safety rules).
 * 3. Offline common questions matcher.
 * 4. AI Provider abstraction and error sanitization.
 * 5. Chat history storage isolation and capping.
 */

import { AIService } from '../../server/ai/aiService';
import { AIProvider, ProviderChatMessage } from '../../server/ai/groqProvider';
import { buildAgronomicContextPrompt } from '../../server/ai/prompts';
import { matchCommonQuestion } from '../lib/commonQuestions';
import { StorageService } from '../services/storage/storageService';
import { ChatMessage } from '../types/chat';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

// Mock AI Provider for deterministic unit testing
class MockAIProvider implements AIProvider {
  public readonly providerName = 'MockProvider';
  public lastSystemPrompt = '';
  public lastMessages: ProviderChatMessage[] = [];
  public shouldFail = false;

  public isConfigured(): boolean {
    return true;
  }

  public async generateResponse(
    systemPrompt: string,
    messages: ProviderChatMessage[]
  ): Promise<string> {
    if (this.shouldFail) {
      throw new Error('Groq upstream connection timeout.');
    }
    this.lastSystemPrompt = systemPrompt;
    this.lastMessages = messages;
    return 'Mock agricultural response: based on 18% soil moisture, review your drip irrigation cycle.';
  }
}

async function runTests() {
  console.log('--- STARTING PHASE 5 AI ASSISTANT UNIT TESTS ---\n');

  // TEST 1: Request Validation
  console.log('1. Testing AIService Request Validation...');
  const mockProvider = new MockAIProvider();
  const aiService = new AIService(mockProvider);

  // Rejects missing/empty message
  try {
    aiService.validateRequest({ message: '' });
    assert(false, 'Should have rejected empty message');
  } catch (e: any) {
    assert(e.message.includes('Field "message" cannot be empty'), 'Rejects empty message');
  }

  // Rejects excessively long message
  try {
    aiService.validateRequest({ message: 'A'.repeat(4001) });
    assert(false, 'Should have rejected > 4000 char message');
  } catch (e: any) {
    assert(e.message.includes('exceeds maximum length'), 'Rejects >4000 character messages');
  }

  // Sanitizes telemetry & limits history
  const sampleHistory = Array.from({ length: 25 }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `Message ${i}`,
  }));

  const validated = aiService.validateRequest({
    message: ' Why is my soil moisture low? ',
    telemetry: {
      temperature: 34.256,
      humidity: 58.12,
      soilMoisture: 18.0,
      tds: 620.4,
      ignoredField: 'drop_me',
    },
    alerts: [
      { parameter: 'soilMoisture', status: 'LOW', severity: 'WARNING', value: 18 },
    ],
    history: sampleHistory,
  });

  assert(validated.message === 'Why is my soil moisture low?', 'Trims user message');
  assert(validated.telemetry?.temperature === 34.26, 'Rounds temperature to 2 decimals');
  assert(validated.telemetry?.soilMoisture === 18, 'Preserves numeric soil moisture');
  assert(validated.alerts?.length === 1, 'Validates alert array');
  assert(validated.history?.length === 15, 'Caps history to last 15 messages');

  // TEST 2: Agronomic Context Prompt Construction
  console.log('\n2. Testing Agronomic Context Prompt Construction...');
  const promptOutput = buildAgronomicContextPrompt(
    { temperature: 34.2, humidity: 58, soilMoisture: 18, tds: 620 },
    [{ parameter: 'soilMoisture', status: 'LOW', severity: 'WARNING', value: 18 }]
  );

  assert(promptOutput.includes('Ambient Temperature: 34.2 °C'), 'Includes temperature');
  assert(promptOutput.includes('Relative Humidity: 58 %'), 'Includes humidity');
  assert(promptOutput.includes('Soil Moisture: 18 %'), 'Includes soil moisture');
  assert(promptOutput.includes('TDS (Mineral Conductivity): 620 ppm'), 'Includes TDS');
  assert(promptOutput.includes('[WARNING] soilMoisture: LOW'), 'Includes active alerts');
  assert(
    promptOutput.includes('TDS reflects dissolved mineral salts / conductivity, not isolated N, P, or K levels'),
    'Enforces TDS conductivity safety mandate in context'
  );

  // Null telemetry fallback
  const emptyPrompt = buildAgronomicContextPrompt(null, null);
  assert(
    emptyPrompt.includes('No live sensor readings currently connected'),
    'Graceful fallback when no telemetry connected'
  );

  // TEST 3: Common Questions Matcher (Offline)
  console.log('\n3. Testing Offline Common Questions Matcher...');
  const tdsMatch = matchCommonQuestion('What is TDS?');
  assert(tdsMatch.matched, 'Matches "What is TDS?"');
  assert(
    tdsMatch.reply.includes('Total Dissolved Solids') && tdsMatch.reply.includes('Nitrogen (N)'),
    'TDS explanation warns that TDS is not a direct NPK nutrient assay'
  );

  const moistureMatch = matchCommonQuestion('Explain soil moisture');
  assert(moistureMatch.matched, 'Matches "Explain soil moisture"');
  assert(moistureMatch.reply.includes('pore spaces'), 'Explains soil hydration principles');

  const dht11Match = matchCommonQuestion('What does DHT11 measure?');
  assert(dht11Match.matched, 'Matches "What does DHT11 measure?"');
  assert(dht11Match.reply.includes('Ambient Air Temperature'), 'Explains DHT11 readings');

  const ppmMatch = matchCommonQuestion('What is ppm?');
  assert(ppmMatch.matched, 'Matches "What is ppm?"');
  assert(ppmMatch.reply.includes('1 milligram'), 'Explains parts per million definition');

  const unmatched = matchCommonQuestion('Why are my tomato leaves curling?');
  assert(!unmatched.matched, 'Delegates complex questions to AI backend');

  // TEST 4: Provider Abstraction & Execution
  console.log('\n4. Testing AI Provider Delegation & Error Handling...');
  const chatResponse = await aiService.chat({
    message: 'How should I manage my irrigation?',
    telemetry: { temperature: 30, humidity: 50, soilMoisture: 18, tds: 400 },
  });

  assert(
    chatResponse.reply.includes('Mock agricultural response'),
    'Calls provider and returns response'
  );
  assert(
    mockProvider.lastSystemPrompt.includes('CURRENT AGRIMONITOR FIELD TELEMETRY'),
    'Injected context prompt into system instructions'
  );
  assert(
    mockProvider.lastMessages[mockProvider.lastMessages.length - 1].content ===
      'How should I manage irrigation?' ||
      mockProvider.lastMessages[mockProvider.lastMessages.length - 1].content ===
        'How should I manage my irrigation?',
    'Appended user question to message list'
  );

  // Error simulation
  mockProvider.shouldFail = true;
  try {
    await aiService.chat({ message: 'Hello' });
    assert(false, 'Should have thrown error on provider failure');
  } catch (e: any) {
    assert(
      e.message.includes('Groq upstream connection timeout'),
      'Propagates upstream failure cleanly'
    );
  }

  // TEST 5: Chat History Local Storage Isolation & Capping
  console.log('\n5. Testing Chat History Storage Isolation & Capping...');
  await StorageService.clearChatHistory();

  const mockHistory: ChatMessage[] = Array.from({ length: 120 }, (_, i) => ({
    id: `msg-${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Historical note ${i}`,
    timestamp: Date.now() + i * 1000,
  }));

  await StorageService.saveChatHistory(mockHistory);
  const loadedHistory = await StorageService.getChatHistory();

  assert(loadedHistory.length === 100, 'Caps chat history at 100 items');
  assert(
    loadedHistory[loadedHistory.length - 1].content === 'Historical note 119',
    'Preserves newest messages'
  );

  // Clear chat history doesn't erase fertilizer or alerts
  await StorageService.saveFertilizerHistory([
    {
      id: 'fert-1',
      timestamp: Date.now(),
      cropName: 'Tomato',
      fertilizerName: 'Urea',
      areaAcres: 2,
      rateKgPerAcre: 50,
      bagSizeKg: 50,
      result: {
        areaAcres: 2,
        applicationRateKgPerAcre: 50,
        totalRequiredKg: 100,
        bagSizeKg: 50,
        bagsRequired: 2,
        totalPurchasedKg: 100,
        remainingKg: 0,
        formulaBreakdown: {
          totalRequiredFormula: '2.00 × 50 = 100.00 kg',
          bagsFormula: 'ceil(100.00 / 50) = 2 bag(s)',
          remainingFormula: '2 × 50 - 100.00 = 0.00 kg surplus',
        },
      },
    },
  ]);

  await StorageService.clearChatHistory();
  const historyAfterClear = await StorageService.getChatHistory();
  const fertHistoryAfterClear = await StorageService.getFertilizerHistory();

  assert(historyAfterClear.length === 0, 'Chat history is completely cleared');
  assert(fertHistoryAfterClear.length === 1, 'Fertilizer history remains intact after chat clear');

  console.log('\n🎉 ALL PHASE 5 AI ASSISTANT UNIT TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
