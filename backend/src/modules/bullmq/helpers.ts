import { Inject } from '@nestjs/common';

export const InjectQueue = (name: string): ReturnType<typeof Inject> =>
  Inject(name);
