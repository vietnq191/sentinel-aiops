import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { ReportsService } from '#src/reports/reports.service.js';
import { MINUTES_TO_SECONDS, SECONDS_TO_MS, MAX_SAMPLE_LOGS_LIMIT, GEMINI_API_BASE } from './constants/gemini.constants.js';
import { AnalysisCacheEntry, ModelTestResult } from './interfaces/gemini.interface.js';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private analysisCache: Record<string, AnalysisCacheEntry> = {};

  constructor(private readonly reportsService: ReportsService) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('FATAL: GEMINI_API_KEY environment variable is not defined or is empty!');
    }
    const geminiModel = (process.env.GEMINI_MODEL || '').trim();
    if (!geminiModel) {
      throw new Error('FATAL: GEMINI_MODEL environment variable is not defined or is empty!');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private lastPromptTemplate = '';

  /* Perform real-time generative AI root cause analysis on grouped logs */
  async analyzeErrorPattern(errorCode: string, sampleLogs: string[]): Promise<string | null> {
    if (!this.genAI) {
      this.logger.error('Gemini API is not initialized due to missing API key.');
      return null;
    }

    const config = this.reportsService.getConfig();
    
    /* Auto invalidate cache if prompt template changes */
    if (config.aiPromptTemplate !== this.lastPromptTemplate) {
      this.logger.log('AI Prompt Template has changed! Clearing analysis cooldown cache to apply immediately.');
      this.analysisCache = {};
      this.lastPromptTemplate = config.aiPromptTemplate;
    }

    const cooldownMs = config.cooldownMinutes * MINUTES_TO_SECONDS * SECONDS_TO_MS;
    const now = Date.now();
    
    const cacheEntry = this.analysisCache[errorCode] || { lastAnalyzed: 0, totalCount: 0 };
    cacheEntry.totalCount += sampleLogs.length;
    this.analysisCache[errorCode] = cacheEntry;

    /* Check if we are currently inside the rate-limiting cooldown window */
    if (now - cacheEntry.lastAnalyzed < cooldownMs) {
      this.logger.log(`[Cooldown] Skipping Gemini API call for error: "${errorCode}". Cooldown active.`);
      this.reportsService.incrementSkippedCount(errorCode, sampleLogs.length);
      return null;
    }

    this.logger.log(`Requesting Gemini AI Root Cause Analysis for pattern: ${errorCode}`);
    
    /* Construct prompt dynamically from the database/config template */
    const promptTemplate = config.aiPromptTemplate;
    const prompt = promptTemplate
      .replace('{totalCount}', cacheEntry.totalCount.toString())
      .replace('{errorCode}', errorCode)
      .replace('{sampleLogs}', sampleLogs.slice(0, MAX_SAMPLE_LOGS_LIMIT).join('\n'));

    /* Try the preferred model first, then fall back to supported candidates */
    const preferredModel = (config.selectedModel || process.env.GEMINI_MODEL || '').trim();
    const modelCandidates = Array.from(new Set([
      preferredModel, 
      'gemini-2.0-flash', 
      'gemini-flash-latest', 
      'gemini-pro-latest', 
      'gemini-2.5-flash'
    ]));
    let lastError: any = null;

    for (const modelName of modelCandidates) {
      try {
        this.logger.log(`Attempting Gemini AI call using model: ${modelName}`);
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        /* Update cooldown timer and reset skipped log counter on success */
        cacheEntry.lastAnalyzed = now;
        this.analysisCache[errorCode] = cacheEntry;
        this.reportsService.resetSkippedCount(errorCode);

        this.logger.log(`Gemini AI successfully responded using model: ${modelName}`);
        return text;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`Model ${modelName} failed or not supported by API Key: ${error.message}`);
      }
    }

    this.logger.error(`AI Analysis failed for error "${errorCode}" after trying all candidates: ${lastError?.message}`);
    return null;
  }

  /* Dynamically retrieve and filter all available Gemini generative models from Google */
  async getAvailableModels(): Promise<Array<{ id: string; displayName: string }>> {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return [];
    }

    try {
      this.logger.log('Fetching available generative models from Google API...');
      const response = await axios.get(`${GEMINI_API_BASE}/v1beta/models?key=${apiKey}`, {
        timeout: 5000
      });
      
      const data = response.data as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> };
      if (!data.models) {
        return [];
      }

      // Friendly display mapping for popular models
      const friendlyNames: Record<string, string> = {
        'gemini-2.0-flash': 'Gemini 2.0 Flash (Recommended)',
        'gemini-flash-latest': 'Gemini 1.5 Flash (Latest)',
        'gemini-pro-latest': 'Gemini 1.5 Pro (Latest)',
        'gemini-2.5-flash': 'Gemini 2.5 Flash',
        'gemini-2.5-pro': 'Gemini 2.5 Pro',
        'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
        'gemini-2.0-flash-lite-001': 'Gemini 2.0 Flash Lite (001)',
        'gemini-flash-lite-latest': 'Gemini 1.5 Flash Lite (Latest)',
        'gemini-1.5-flash': 'Gemini 1.5 Flash',
        'gemini-1.5-pro': 'Gemini 1.5 Pro'
      };

      const allowedModels = Object.keys(friendlyNames);

      const resultList = data.models
        .map(m => m.name.replace('models/', ''))
        .filter(id => allowedModels.includes(id))
        .map(id => ({
          id,
          displayName: friendlyNames[id]
        }));

      return resultList;
    } catch (error: any) {
      this.logger.error(`Failed to fetch available models from Google: ${error.message}`);
      return [
        { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash (Recommended)' },
        { id: 'gemini-flash-latest', displayName: 'Gemini 1.5 Flash (Latest)' },
        { id: 'gemini-pro-latest', displayName: 'Gemini 1.5 Pro (Latest)' },
        { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.0-flash-lite', displayName: 'Gemini 2.0 Flash Lite' }
      ];
    }
  }

  /* Connection diagnostics for verifying connectivity and API quotas */
  async testModelConnection(modelName: string): Promise<ModelTestResult> {
    /* If no API key is configured, return direct failure to prevent masking */
    if (!this.genAI) {
      this.logger.warn(`No GEMINI_API_KEY found for model: ${modelName}`);
      return { success: false, error: 'Missing GEMINI_API_KEY' };
    }

    try {
      this.logger.log(`Testing connection for model: ${modelName}`);
      const model = this.genAI.getGenerativeModel({ model: modelName });
      /* Send a lightweight test prompt to keep validation fast and cheap! */
      const result = await model.generateContent('Respond with only the single word: OK');
      const response = await result.response;
      const text = response.text();
      
      if (text) {
        this.logger.log(`Model ${modelName} test passed!`);
        return { success: true };
      }
      return { success: false, error: 'Empty API response' };
    } catch (error: any) {
      this.logger.error(`Model ${modelName} API connection failed: ${error.message}`);
      return { success: false, error: error.message || 'API connection error' };
    }
  }
}
