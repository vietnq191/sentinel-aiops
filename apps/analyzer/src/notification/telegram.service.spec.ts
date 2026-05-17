import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service.js';
import { Logger } from '@nestjs/common';
import axios from 'axios';

describe('TelegramService 🤖', () => {
  let service: TelegramService;
  const originalEnv = process.env;
  let spyGet: any;
  let spyPost: any;

  beforeEach(async () => {
    // Silence NestJS Logger during unit tests for clean mock outputs
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    process.env = {
      ...originalEnv,
      TELEGRAM_BOT_TOKEN: 'mock_token',
      TELEGRAM_CHAT_ID: '123456',
      TELEGRAM_API_BASE: 'https://api.telegram.org',
      TELEGRAM_GET_ME_PATH: '/getMe',
      TELEGRAM_SEND_MESSAGE_PATH: '/sendMessage',
    };

    // Spy on axios methods directly for standard ESM compliance
    spyGet = jest.spyOn(axios, 'get');
    spyPost = jest.spyOn(axios, 'post');

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramService],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyBot', () => {
    it('should successfully verify the bot identity and send startup message', async () => {
      spyGet.mockResolvedValueOnce({
        data: {
          result: {
            username: 'SentinelBot',
            first_name: 'Sentinel Alert Engine',
          },
        },
      });

      spyPost.mockResolvedValueOnce({ data: { ok: true } });

      await service.verifyBot();

      expect(spyGet).toHaveBeenCalledWith('https://api.telegram.org/botmock_token/getMe');
      expect(spyPost).toHaveBeenCalledWith(
        'https://api.telegram.org/botmock_token/sendMessage',
        expect.objectContaining({
          chat_id: 123456,
          parse_mode: 'Markdown',
        })
      );
    });

    it('should log an error when getMe throws an exception', async () => {
      spyGet.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(service.verifyBot()).resolves.not.toThrow();
    });
  });

  describe('sendTelegramMessage', () => {
    it('should post message to correct Telegram API URL', async () => {
      spyPost.mockResolvedValueOnce({ data: { ok: true } });

      await service.sendTelegramMessage('⚠️ Test incident alert!');

      expect(spyPost).toHaveBeenCalledWith(
        'https://api.telegram.org/botmock_token/sendMessage',
        {
          chat_id: 123456,
          text: '⚠️ Test incident alert!',
          parse_mode: 'Markdown',
        }
      );
    });

    it('should disable telegram integration if required env vars are missing', async () => {
      process.env.TELEGRAM_BOT_TOKEN = '';
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [TelegramService],
      }).compile();
      
      const disabledService = module.get<TelegramService>(TelegramService);
      expect(disabledService).toBeDefined();
      expect((disabledService as any).isEnabled).toBe(false);
    });
  });
});
