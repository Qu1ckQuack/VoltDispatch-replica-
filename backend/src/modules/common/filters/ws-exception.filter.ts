import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { extractErrorMessage } from '../utils/error-message.js';
import { ErrorCodes } from '../errors/error-codes.js';
import type { ErrorCode } from '../errors/error-codes.js';

interface WsErrorPayload {
  event: 'error';
  data: {
    code: ErrorCode;
    message: string;
  };
}

@Catch()
export class WsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToWs();
    const client = ctx.getClient<WebSocket>();
    const event = ctx.getPattern?.() ?? 'unknown';

    const errorPayload = this.normalizeError(exception);

    this.logger.warn(
      `WS error on event "${event}": ${errorPayload.data.code} — ${errorPayload.data.message}`,
    );

    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(errorPayload));
    }
  }

  private normalizeError(exception: unknown): WsErrorPayload {
    if (exception instanceof Error) {
      const msg = exception.message.toLowerCase();
      if (msg.includes('token') || msg.includes('auth')) {
        return {
          event: 'error',
          data: { code: ErrorCodes.WS_AUTH_FAILED, message: exception.message },
        };
      }
      if (msg.includes('denied') || msg.includes('forbidden')) {
        return {
          event: 'error',
          data: {
            code: ErrorCodes.WS_ACCESS_DENIED,
            message: exception.message,
          },
        };
      }
      if (msg.includes('rate') || msg.includes('limit')) {
        return {
          event: 'error',
          data: {
            code: ErrorCodes.WS_RATE_LIMITED,
            message: exception.message,
          },
        };
      }
    }

    const message = extractErrorMessage(
      exception,
      'An unexpected error occurred',
    );
    return {
      event: 'error',
      data: { code: ErrorCodes.INTERNAL_ERROR, message },
    };
  }
}
