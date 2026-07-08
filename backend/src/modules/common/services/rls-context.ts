import { AsyncLocalStorage } from 'node:async_hooks';

export interface RlsUser {
  userId: string;
  role: string;
  profileId?: string | null;
  customerId?: string | null;
  department?: string | null;
}

export const rlsStorage = new AsyncLocalStorage<RlsUser>();

export function buildRlsStatements(user: RlsUser): string[] {
  const stmts: string[] = [];
  stmts.push(`SELECT set_config('app.user_id', ${quoteLiteral(user.userId)}, true)`);
  stmts.push(`SELECT set_config('app.user_role', ${quoteLiteral(user.role)}, true)`);
  if (user.profileId) {
    stmts.push(`SELECT set_config('app.profile_id', ${quoteLiteral(user.profileId)}, true)`);
  }
  if (user.customerId) {
    stmts.push(`SELECT set_config('app.customer_id', ${quoteLiteral(user.customerId)}, true)`);
  }
  if (user.department) {
    stmts.push(`SELECT set_config('app.department', ${quoteLiteral(user.department)}, true)`);
  }
  return stmts;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
