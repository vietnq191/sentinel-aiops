/* Gemini AI service interfaces */

export enum GeminiModel {
  GEMINI_PRO = 'gemini-pro',
  GEMINI_1_5_FLASH = 'gemini-1.5-flash',
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
  GEMINI_FLASH_LATEST = 'gemini-flash-latest',
  GEMINI_PRO_LATEST = 'gemini-pro-latest',
  GEMINI_2_5_PRO = 'gemini-2.5-pro',
  GEMINI_2_0_FLASH_LITE = 'gemini-2.0-flash-lite',
  GEMINI_2_0_FLASH_LITE_001 = 'gemini-2.0-flash-lite-001',
  GEMINI_FLASH_LITE_LATEST = 'gemini-flash-lite-latest',
  GEMINI_1_5_PRO = 'gemini-1.5-pro'
}

export interface AnalysisCacheEntry {
  lastAnalyzed: number;
  totalCount: number;
}

export interface ModelTestResult {
  success: boolean;
  isSandbox?: boolean;
  error?: string;
}
