import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  NotificationAdapter,
  SendResult,
} from './notification-adapter.interface.js';

@Injectable()
export class LineAdapter implements NotificationAdapter {
  readonly channel = 'LINE' as const;
  private readonly logger = new Logger(LineAdapter.name);
  private readonly channelAccessToken: string;

  constructor(config: ConfigService) {
    this.channelAccessToken = config.get<string>(
      'LINE_CHANNEL_ACCESS_TOKEN',
      '',
    );
  }

  async send(
    recipient: string,
    _subject: string,
    body: string,
  ): Promise<SendResult> {
    if (!this.channelAccessToken) {
      this.logger.warn(
        'LINE_CHANNEL_ACCESS_TOKEN not configured — skipping LINE push',
      );
      return {
        success: false,
        error: 'LINE_CHANNEL_ACCESS_TOKEN not configured',
      };
    }

    try {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.channelAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipient,
          messages: [{ type: 'text', text: body }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`LINE API error ${response.status}: ${errBody}`);
      }

      return { success: true };
    } catch (err) {
      this.logger.error(`Failed to send LINE push: ${(err as Error).message}`);
      return { success: false, error: (err as Error).message };
    }
  }
}
