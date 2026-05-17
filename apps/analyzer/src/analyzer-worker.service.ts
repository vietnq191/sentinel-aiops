import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { LokiService } from './loki/loki.service.js';
import { GeminiService } from './ai/gemini.service.js';
import { TelegramService } from './notification/telegram.service.js';
import { ReportsService } from './reports/reports.service.js';
import { SelfHealingService } from './self-healing/self-healing.service.js';
import { POLLING_INTERVAL_MS, LOGGING_INTERVAL_MS } from './constants/analyzer.constants.js';

@Injectable()
export class AnalyzerWorkerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AnalyzerWorkerService.name);

  constructor(
    private readonly lokiService: LokiService,
    private readonly geminiService: GeminiService,
    private readonly telegramService: TelegramService,
    private readonly reportsService: ReportsService,
    private readonly selfHealingService: SelfHealingService
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Background SRE Analyzer Worker Loop has started!');
    
    /* Polling Interval: Run log queries and AI evaluations every 10 seconds */
    setInterval(async () => {
      await this.runAnalysisCycle();
    }, POLLING_INTERVAL_MS);

    /* Summary Logging Interval: Print status updates of skipped/cached errors every 30 seconds */
    setInterval(() => {
      this.logStatusSummary();
    }, LOGGING_INTERVAL_MS);
  }

  private async runAnalysisCycle() {
    const rawLogs = await this.lokiService.fetchLatestErrors();
    if (rawLogs.length === 0) return;

    this.logger.log(`Fetched ${rawLogs.length} error entries from Loki. Grouping events...`);

    /* Group logs by error_code or fallback to raw message */
    const groups: Record<string, string[]> = {};
    rawLogs.forEach(log => {
      try {
        const parsed = JSON.parse(log);
        const key = parsed.error_code || parsed.message || 'unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(log);
      } catch {
        const fallbackKey = log.includes('error') ? 'RAW_SYSTEM_ERROR' : 'unknown';
        if (!groups[fallbackKey]) groups[fallbackKey] = [];
        groups[fallbackKey].push(log);
      }
    });

    /* Analyze each unique error category */
    for (const [errorCode, sampleLogs] of Object.entries(groups)) {
      /* Immediately create a preliminary report and save it so it renders instantly on the UI! */
      const report = this.reportsService.addReport({
        errorCode,
        totalEvents: sampleLogs.length,
        severity: 'INFO',
        rootCause: 'Real-time incident analysis query is being processed via AI Engine...',
        remediation: 'Remediation strategy is being generated, please stand by...',
        rawResponse: '',
        status: 'investigating',
        rawLogs: sampleLogs,
      });

      this.logger.log(`Preliminary incident logged for ${errorCode} (ID: ${report.id}) - status: investigating`);

      /* Perform the actual AI analysis asynchronously so we don't block the UI / logs list update! */
      let aiResponse = await this.geminiService.analyzeErrorPattern(errorCode, sampleLogs);
      let isCached = false;

      /* Duplicate Check: If Gemini returned null due to cooldown, reuse the last SRE report from memory! */
      if (!aiResponse) {
        /* Find a report with matching errorCode that is NOT our newly created preliminary report itself! */
        const cachedReport = this.reportsService.getReports().find(
          r => r.errorCode === errorCode && r.id !== report.id && r.status !== 'investigating'
        );
        if (cachedReport) {
          aiResponse = cachedReport.rawResponse;
          isCached = true;
        }
      }
      
      /* Fallback Check: If Gemini fails (rate limit/quota exceeded) and no cache exists, use a static SRE fallback report */
      if (!aiResponse) {
        this.logger.warn(`Gemini API failed/rate-limited and no cache exists for ${errorCode}. Using static SRE fallback report.`);
        aiResponse = `**SEVERITY**: ${errorCode === 'ERR_SYS_OOM' ? 'CRITICAL' : 'ERROR'}
**ROOT CAUSE**: Detected system error pattern ${errorCode}. Gemini AI analysis is temporarily unavailable or rate-limited.
**REMEDIATION**: Please inspect Loki logs directly and perform manual diagnostics.`;
      }
      
      if (aiResponse) {
        this.logger.log(`AI report processed ${isCached ? '(Cached via Cooldown)' : ''} for: ${errorCode}`);
        
        /* Parse the markdown fields returned from Gemini */
        const parsedReport = this.parseAiResponse(aiResponse);

        /* Determine correct initial status based on SRE settings and error type */
        const config = this.reportsService.getConfig();
        const shouldHeal = config.isAutoHealingEnabled && errorCode === 'ERR_SYS_OOM';
        const initialStatus = shouldHeal ? 'investigating' : 'analyzed';

        /* Update preliminary report with AI analysis results! */
        this.reportsService.updateReport(report.id, {
          severity: parsedReport.severity + (isCached ? ' (COOLDOWN)' : ''),
          rootCause: parsedReport.rootCause,
          remediation: parsedReport.remediation,
          rawResponse: aiResponse,
          status: initialStatus,
        });

        /* Format a beautiful markdown notification for Telegram (preserving emojis for Telegram channels as requested) */
        const telegramMsg = `${isCached ? '🔄 *[COOLDOWN REPEAT]*\n' : ''}🛡️ *SENTINEL AI DETECTED INCIDENT*\n\n` +
          `📊 *Error:* \`${errorCode}\`\n` +
          `🔥 *Severity:* ${parsedReport.severity}${isCached ? ' (COOLDOWN)' : ''}\n` +
          `🔢 *Recent Occurrences:* ${sampleLogs.length} events\n\n` +
          `❓ *Root Cause:*\n${parsedReport.rootCause}\n\n` +
          `🛠️ *Suggested Remediation:*\n${parsedReport.remediation}`;
        
        await this.telegramService.sendTelegramMessage(telegramMsg);

        /* Self-Healing execution path - Only triggered if OOM error occurs and healing is enabled */
        if (shouldHeal) {
          this.reportsService.updateReportStatus(report.id, 'investigating', 'Initiated automated recovery policy...');
          
          /* Trigger automated mitigation */
          const healingResult = await this.selfHealingService.mitigateError(errorCode);
          
          if (healingResult.success) {
            this.reportsService.updateReportStatus(report.id, 'mitigated', healingResult.action);
            
            /* Alert SRE about successful recovery */
            const recoveryAlert = `${isCached ? '🔄 *[COOLDOWN]* ' : ''}✅ *SELF-HEALING SUCCESSFUL*\n` +
              `🔧 *Incident:* \`${errorCode}\`\n` +
              `🚀 *Remediation Action:* ${healingResult.action}`;
            await this.telegramService.sendTelegramMessage(recoveryAlert);
          } else if (healingResult.error) {
            this.reportsService.updateReportStatus(report.id, 'failed_mitigation', `Mitigation Failed: ${healingResult.error}`);
            
            /* Alert SRE about failure to mitigate */
            const recoveryFailureAlert = `${isCached ? '🔄 *[COOLDOWN]* ' : ''}❌ *SELF-HEALING FAILED*\n` +
              `🔧 *Incident:* \`${errorCode}\`\n` +
              `⚠️ *Action attempted:* ${healingResult.action}\n` +
              `❗ *Error:* _${healingResult.error}_`;
            await this.telegramService.sendTelegramMessage(recoveryFailureAlert);
          }
        }
      }
    }
  }

  private logStatusSummary() {
    const skippedCounts = this.reportsService.getSkippedCounts();
    const skipEntries = Object.entries(skippedCounts).filter(([_, count]) => count > 0);
    if (skipEntries.length > 0) {
      const summary = skipEntries.map(([key, count]) => `[${key}]: ${count} times`).join(', ');
      this.logger.log(`[STATUS] | Monitoring active. Cached occurrences during cooldown: ${summary}`);
    }
  }

  private parseAiResponse(text: string): { severity: string; rootCause: string; remediation: string } {
    const result = {
      severity: 'ERROR',
      rootCause: 'Under analysis by SRE engine',
      remediation: 'Please check logs and container telemetry.'
    };

    try {
      /* Regex parsing for standard bullet blocks */
      const severityMatch = text.match(/\*\*SEVERITY\*\*:\s*([^\n]+)/i) || text.match(/SEVERITY:\s*([^\n]+)/i);
      const rootCauseMatch = text.match(/\*\*ROOT CAUSE\*\*:\s*([\s\S]*?)(?=\*\*REMEDIATION\*\*|REMEDIATION:|$)/i) || text.match(/ROOT CAUSE:\s*([\s\S]*?)(?=REMEDIATION:|$)/i);
      const remediationMatch = text.match(/\*\*REMEDIATION\*\*:\s*([\s\S]*)/i) || text.match(/REMEDIATION:\s*([\s\S]*)/i);

      if (severityMatch) {
        result.severity = severityMatch[1].trim().replace(/[\[\]\*\`]/g, '');
      }
      if (rootCauseMatch) {
        result.rootCause = rootCauseMatch[1].trim().replace(/[\[\]\*\`]/g, '');
      }
      if (remediationMatch) {
        result.remediation = remediationMatch[1].trim().replace(/[\[\]\*\`]/g, '');
      }
    } catch (e) {
      this.logger.error(`Error parsing AI response sections: ${e}`);
    }

    return result;
  }
}
