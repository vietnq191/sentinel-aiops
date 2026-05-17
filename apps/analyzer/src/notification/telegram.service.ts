import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  private readonly chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
  private readonly apiBase = (process.env.TELEGRAM_API_BASE || '').trim();
  private readonly getMePath = (process.env.TELEGRAM_GET_ME_PATH || '').trim();
  private readonly sendMessagePath = (process.env.TELEGRAM_SEND_MESSAGE_PATH || '').trim();

  private readonly isEnabled: boolean = false;

  constructor() {
    this.isEnabled = !!(
      this.botToken &&
      this.chatId &&
      this.apiBase &&
      this.getMePath &&
      this.sendMessagePath
    );

    if (!this.isEnabled) {
      this.logger.warn(
        '⚠️ Telegram configuration is missing or incomplete. Real-time Telegram alerting is DISABLED, but the NestJS Analyzer SRE Engine remains 100% operational!'
      );
    }
  }

  async onModuleInit() {
    if (this.isEnabled) {
      await this.verifyBot();
    }
  }

  async verifyBot() {
    if (!this.isEnabled) {
      return;
    }
    try {
      const response = await axios.get(`${this.apiBase}/bot${this.botToken}${this.getMePath}`);
      const botName = response.data.result.username;
      this.logger.log(`Bot Identity Verified: @${botName} (${response.data.result.first_name})`);
      
      await this.sendTelegramMessage(`🚀 *Sentinel AIOps* (NestJS API) is online!\nReady to analyze logs and perform automated self-healing.`);
    } catch (error: any) {
      this.logger.error(`Bot Verification Failed: ${error.message}`);
    }
  }

  async sendTelegramMessage(text: string) {
    if (!this.isEnabled) {
      this.logger.log('[Notification Bypassed] Telegram service is disabled due to missing configuration.');
      return;
    }
    try {
      await axios.post(`${this.apiBase}/bot${this.botToken}${this.sendMessagePath}`, {
        chat_id: Number(this.chatId),
        text: text,
        parse_mode: 'Markdown'
      });
      this.logger.log('Telegram notification sent successfully!');
    } catch (error: any) {
      if (error.response && error.response.data) {
        this.logger.error(`Telegram Error Details: ${JSON.stringify(error.response.data)}`);
      } else {
        this.logger.error(`Failed to send Telegram message: ${error.message}`);
      }
    }
  }
}
