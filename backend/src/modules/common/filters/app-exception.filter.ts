import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { extractErrorMessage } from '../utils/error-message.js';
import { ErrorCodes } from '../errors/error-codes.js';
import type { ErrorCode } from '../errors/error-codes.js';
import type { AppErrorResponse } from '../errors/app-exception.js';
import { AppException } from '../errors/app-exception.js';

interface PrismaClientKnownRequestError extends Error {
  code: string;
  meta?: Record<string, unknown>;
}

const PRISMA_CODES: Record<string, { code: ErrorCode; status: number; message: string }> = {
  P2000: { code: ErrorCodes.VALIDATION_ERROR, status: HttpStatus.BAD_REQUEST, message: 'Value too long for column' },
  P2002: { code: ErrorCodes.PRISMA_UNIQUE_CONSTRAINT, status: HttpStatus.CONFLICT, message: 'A record with this value already exists' },
  P2003: { code: ErrorCodes.PRISMA_FOREIGN_KEY, status: HttpStatus.CONFLICT, message: 'Referenced record does not exist' },
  P2014: { code: ErrorCodes.PRISMA_REQUIRED_RELATION, status: HttpStatus.BAD_REQUEST, message: 'Required relation violation' },
  P2025: { code: ErrorCodes.PRISMA_NOT_FOUND, status: HttpStatus.NOT_FOUND, message: 'Record not found' },
  P2021: { code: ErrorCodes.DATABASE_ERROR, status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Table does not exist' },
  P1000: { code: ErrorCodes.DATABASE_ERROR, status: HttpStatus.SERVICE_UNAVAILABLE, message: 'Database authentication failed' },
  P1001: { code: ErrorCodes.DATABASE_ERROR, status: HttpStatus.SERVICE_UNAVAILABLE, message: 'Cannot reach database server' },
};

function isPrismaError(err: unknown): err is PrismaClientKnownRequestError {
  if (!(err instanceof Error) || !('code' in err)) return false;
  const code = (err as { code: unknown }).code;
  return typeof code === 'string' && code.startsWith('P');
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { errorResponse, statusCode } = this.resolveError(exception);
    const requestId = request.requestId;

    if (statusCode >= 500) {
      this.logger.error(
        `[${requestId ?? '-'}] ${request.method} ${request.url} -> ${statusCode} ${errorResponse.error.code}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${requestId ?? '-'}] ${request.method} ${request.url} -> ${statusCode} ${errorResponse.error.code}`,
      );
    }

    response.status(statusCode).json(errorResponse);
  }

  private resolveError(
    exception: unknown,
  ): { errorResponse: AppErrorResponse; statusCode: number } {
    // 1. Prisma errors
    if (isPrismaError(exception)) {
      const mapping = PRISMA_CODES[exception.code];
      if (mapping) {
        return {
          statusCode: mapping.status,
          errorResponse: {
            success: false,
            error: {
              code: mapping.code,
              message: mapping.message,
              details: exception.meta ?? undefined,
            },
          },
        };
      }
    }

    // 2. AppException (our custom exceptions with explicit codes)
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        errorResponse: exception.getResponseBody(),
      };
    }

    // 3. NestJS HttpException subclasses
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();
      const message = extractErrorMessage(exception.message);
      const code = this.httpStatusToErrorCode(status);

      // ValidationPipe errors come as BadRequestException with an array in message
      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof responseBody === 'object' &&
        responseBody !== null
      ) {
        const body = responseBody as Record<string, unknown>;
        if (Array.isArray(body.message)) {
          return {
            statusCode: status,
            errorResponse: {
              success: false,
              error: {
                code: ErrorCodes.VALIDATION_ERROR,
                message: 'Validation failed',
                details: body.message,
              },
            },
          };
        }
      }

      return {
        statusCode: status,
        errorResponse: {
          success: false,
          error: { code, message },
        },
      };
    }

    // 4. Everything else — unexpected errors
    const message = extractErrorMessage(exception, 'An unexpected error occurred');
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorResponse: {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'An unexpected error occurred',
        },
      },
    };
  }

  private httpStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.AUTH_INVALID_CREDENTIALS;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCodes.RATE_LIMITED;
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.VALIDATION_ERROR;
      default:
        return ErrorCodes.INTERNAL_ERROR;
    }
  }
}
