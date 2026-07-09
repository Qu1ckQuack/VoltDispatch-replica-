import { AppException, ConflictAppException } from '../errors/app-exception.js';
import { ErrorCodes } from '../errors/error-codes.js';
import { HttpStatus } from '@nestjs/common';

export function handlePrismaError(
  err: unknown,
  conflictMessage?: string,
  notFoundMessage?: string,
): never {
  if (err instanceof Error && 'code' in err) {
    const prismaErr = err as { code: string };
    if (prismaErr.code === 'P2002') {
      throw new ConflictAppException(
        conflictMessage ?? 'A record with this value already exists',
        ErrorCodes.PRISMA_UNIQUE_CONSTRAINT,
      );
    }
    if (prismaErr.code === 'P2025') {
      throw new AppException(
        ErrorCodes.PRISMA_NOT_FOUND,
        notFoundMessage ?? 'The referenced record no longer exists',
        HttpStatus.NOT_FOUND,
      );
    }
  }
  throw err;
}
