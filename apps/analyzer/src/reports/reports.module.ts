import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { SelfHealingService } from '#src/self-healing/self-healing.service.js';
import { GeminiService } from '#src/ai/gemini.service.js';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, SelfHealingService, GeminiService],
  exports: [ReportsService, SelfHealingService, GeminiService],
})
export class ReportsModule {}
