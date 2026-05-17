import { Module } from '@nestjs/common';
import { ReportsModule } from './reports/reports.module.js';
import { LokiService } from './loki/loki.service.js';
import { TelegramService } from './notification/telegram.service.js';
import { AnalyzerWorkerService } from './analyzer-worker.service.js';

@Module({
  imports: [ReportsModule],
  providers: [
    LokiService,
    TelegramService,
    AnalyzerWorkerService,
  ],
})
export class AppModule {}
