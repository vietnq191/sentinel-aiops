import { Controller, Get, Post, Body, Param, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { SystemConfig } from './interfaces/reports.interface.js';
import { SelfHealingService } from '#src/self-healing/self-healing.service.js';
import { GeminiService } from '#src/ai/gemini.service.js';

@Controller('api')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly selfHealingService: SelfHealingService,
    private readonly geminiService: GeminiService
  ) {}

  /* Fetch all active and historically processed SRE incident reports */
  @Get('reports')
  getReports() {
    return this.reportsService.getReports();
  }

  /* Calculate and fetch operational telemetry metrics */
  @Get('metrics')
  getMetrics() {
    return this.reportsService.getMetricsSummary();
  }

  /* Fetch active system configurations and AI operational parameters */
  @Get('config')
  getConfig() {
    return this.reportsService.getConfig();
  }

  /* Update dynamic system and AI prompt parameters */
  @Post('config')
  updateConfig(@Body() body: Partial<SystemConfig>) {
    this.logger.log(`Dynamic config update requested: ${JSON.stringify(body)}`);
    return this.reportsService.updateConfig(body);
  }

  /* Dynamically load all available Gemini generative models from Google */
  @Get('config/available-models')
  async getAvailableModels() {
    this.logger.log('Received request to list all available generative models');
    return this.geminiService.getAvailableModels();
  }

  /* Validate connection and compatibility with specified Gemini Model candidates */
  @Post('config/test-model')
  @HttpCode(HttpStatus.OK)
  async testModel(@Body('model') model: string) {
    this.logger.log(`Received request to test model connection for: ${model}`);
    if (!model) {
      return { success: false, error: 'Model name is required' };
    }
    const result = await this.geminiService.testModelConnection(model);
    return result;
  }

  /* Manually dispatch automated mitigation runbook for an active incident */
  @Post('self-healing/trigger')
  @HttpCode(HttpStatus.OK)
  async triggerManualSelfHealing(@Body('errorCode') errorCode: string) {
    this.logger.log(`Manual Self-Healing triggered for error: ${errorCode}`);
    if (!errorCode) {
      return { success: false, error: 'errorCode is required' };
    }
    
    const result = await this.selfHealingService.mitigateError(errorCode);
    return result;
  }

  /* Manually mark an unresolved incident report as resolved/mitigated */
  @Post('reports/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveReport(@Param('id') id: string) {
    this.logger.log(`Manual resolve requested for report ID: ${id}`);
    this.reportsService.updateReportStatus(id, 'mitigated', 'Manually resolved by SRE');
    return { success: true };
  }
}
