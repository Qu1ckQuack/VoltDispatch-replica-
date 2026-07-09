import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from './error-codes.js';
import { ErrorCodes } from './error-codes.js';

export interface AppErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export class AppException extends HttpException {
  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    const body: AppErrorResponse = {
      success: false,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    };
    super(body, status);
    this.name = 'AppException';
  }

  getResponseBody(): AppErrorResponse {
    return this.getResponse() as AppErrorResponse;
  }
}

export class NotFoundAppException extends AppException {
  constructor(resource: string) {
    super(ErrorCodes.NOT_FOUND, `${resource} not found`, HttpStatus.NOT_FOUND);
  }
}

export class ForbiddenAppException extends AppException {
  constructor(message = 'Access denied') {
    super(ErrorCodes.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}

export class ConflictAppException extends AppException {
  constructor(message: string, code: ErrorCode = ErrorCodes.CONFLICT) {
    super(code, message, HttpStatus.CONFLICT);
  }
}

export class UnauthorizedAppException extends AppException {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.AUTH_INVALID_CREDENTIALS,
  ) {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}

export class BadRequestAppException extends AppException {
  constructor(message: string, code: ErrorCode = ErrorCodes.VALIDATION_ERROR) {
    super(code, message, HttpStatus.BAD_REQUEST);
  }
}
