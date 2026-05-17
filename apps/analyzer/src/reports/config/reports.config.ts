/* Reports module configuration */

import { SystemConfig } from '#src/reports/interfaces/reports.interface.js';
import { DEFAULT_COOLDOWN_MINUTES } from '#src/reports/constants/reports.constants.js';
import { DEFAULT_AI_PROMPT_TEMPLATE } from '#src/reports/prompts/prompt.js';
import { GeminiModel } from '#src/ai/interfaces/gemini.interface.js';

export const INITIAL_SYSTEM_CONFIG: SystemConfig = {
  aiPromptTemplate: DEFAULT_AI_PROMPT_TEMPLATE,
  cooldownMinutes: DEFAULT_COOLDOWN_MINUTES,
  isAutoHealingEnabled: true,
  selectedModel: GeminiModel.GEMINI_FLASH_LITE_LATEST,
  modelTestStatus: null,
  modelTestError: null,
};
