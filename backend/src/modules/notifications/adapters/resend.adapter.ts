import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  NotificationAdapter,
  SendResult,
} from './notification-adapter.interface.js';

@Injectable()
export class ResendAdapter implements NotificationAdapter {
  readonly channel = 'EMAIL' as const;
  private readonly logger = new Logger(ResendAdapter.name);
  private readonly apiKey: string;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RESEND_API_KEY', '');
    this.fromAddress = config.get<string>(
      'EMAIL_FROM',
      'notifications@voltdispatch.app',
    );
  }

  async send(
    recipient: string,
    subject: string,
    body: string,
  ): Promise<SendResult> {
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not configured — skipping email send');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `VoltDispatch <${this.fromAddress}>`,
          to: [recipient],
          subject,
          text: body,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Resend API error ${response.status}: ${errBody}`);
      }

      const data = (await response.json()) as { id: string };
      return { success: true, externalId: data.id };
    } catch (sendError) {
      this.logger.error(
        `Failed to send email via Resend: ${(sendError as Error).message}`,
        (sendError as Error).stack,
      );
      return { success: false, error: (sendError as Error).message };
    }
  }
}
