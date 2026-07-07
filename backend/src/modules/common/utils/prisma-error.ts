import { ConflictException, NotFoundException } from '@nestjs/common';

export function handlePrismaError(
  err: unknown,
  conflictMessage?: string,
  notFoundMessage?: string,
): never {
  if (err instanceof Error && 'code' in err) {
    const prismaErr = err as { code: string };
    if (prismaErr.code === 'P2002') {
      throw new ConflictException(
        conflictMessage ?? 'A record with this value already exists',
      );
    }
    if (prismaErr.code === 'P2025') {
      throw new NotFoundException(
        notFoundMessage ?? 'The referenced record no longer exists',
      );
    }
  }
  throw err;
}
