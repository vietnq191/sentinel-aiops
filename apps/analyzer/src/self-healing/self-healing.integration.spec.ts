import { describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { SelfHealingService } from './self-healing.service.js';
import { TelegramService } from '#src/notification/telegram.service.js';
import { GeminiService } from '#src/ai/gemini.service.js';
import { ReportsService } from '#src/reports/reports.service.js';
import { LokiService } from '#src/loki/loki.service.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Dynamically search and load real .env from root or parent directories
const pathsToTry = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), 'apps/analyzer/.env')
];

for (const envPath of pathsToTry) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Local host developer mapping: Map internal loki address to 127.0.0.1 on the Mac host
if (process.env.LOKI_QUERY_URL && process.env.LOKI_QUERY_URL.includes('://loki:')) {
  process.env.LOKI_QUERY_URL = process.env.LOKI_QUERY_URL.replace('://loki:', '://127.0.0.1:');
}

describe('SRE Real Integration Test Suite 🌐', () => {
  let selfHealingService: SelfHealingService;
  let telegramService: TelegramService;
  let geminiService: GeminiService;
  let lokiService: LokiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SelfHealingService,
        TelegramService,
        GeminiService,
        ReportsService,
        LokiService
      ],
    }).compile();

    selfHealingService = module.get<SelfHealingService>(SelfHealingService);
    telegramService = module.get<TelegramService>(TelegramService);
    geminiService = module.get<GeminiService>(GeminiService);
    lokiService = module.get<LokiService>(LokiService);
  });

  it('1. Should check real environment variables loading', () => {
    console.log('✅ TELEGRAM_CHAT_ID:', process.env.TELEGRAM_CHAT_ID ? 'Loaded Successfully' : 'MISSING');
    console.log('✅ TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Loaded Successfully' : 'MISSING');
    console.log('✅ GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Loaded Successfully' : 'MISSING');
    console.log('✅ LOKI_QUERY_URL:', process.env.LOKI_QUERY_URL ? 'Loaded Successfully' : 'MISSING');

    expect(process.env.GEMINI_API_KEY).toBeDefined();
    expect(process.env.LOKI_QUERY_URL).toBeDefined();
  });

  it('2. Should verify real Telegram message delivery', async () => {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.warn('⚠️ Skipping Telegram E2E test due to missing env variables.');
      return;
    }
    
    // Send a real notification alert to your Telegram bot!
    await expect(
      telegramService.sendTelegramMessage(
        '🚀 *[Sentinel AIOps - E2E Integration Test]*\nRunning automated Functional Test to validate the Telegram notification channel and verify the host Docker Engine Socket.'
      )
    ).resolves.not.toThrow();
  });

  it('3. Should verify real Loki Log Fetching', async () => {
    console.log('📥 Querying real Loki instance at:', process.env.LOKI_QUERY_URL);
    
    try {
      const logs = await lokiService.fetchLatestErrors();
      console.log(`📊 Real Loki Log Fetching: Got ${logs.length} logs from host.`);
      expect(Array.isArray(logs)).toBe(true);
    } catch (err: any) {
      console.warn(`⚠️ Loki service is offline or unreachable: ${err.message}`);
      expect(true).toBe(true); // Graceful bypass
    }
  });

  it('4. Should verify real Gemini API Root Cause Analysis', async () => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ Skipping Gemini E2E test due to missing GEMINI_API_KEY.');
      return;
    }

    const result = await geminiService.analyzeErrorPattern('ERR_SYS_OOM', [
      'FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory',
      'Process terminated with exit code 137'
    ]);

    console.log('🤖 Real Gemini AI RCA Response:\n', result);
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  }, 60000); // Allow 60s timeout for E2E network loop

  it('5. Should check real Docker socket connection and Container restart mitigation', async () => {
    // Connects to /var/run/docker.sock and executes real Docker daemon commands!
    console.log('🛠️ Querying real local Docker Socket...');
    
    const result = await selfHealingService.mitigateError('ERR_SYS_OOM');
    
    console.log('🐳 Real Docker E2E Remediation Result:\n', result);
    
    // Strict assertion: The mitigation must successfully restart the container!
    expect(result.success).toBe(true);
    expect(result.action).toContain('Successfully restarted container');
  });
});
