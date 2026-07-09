import { Injectable } from '@nestjs/common';
import { WorkOrderStatus } from '../../../generated/prisma/enums.js';
import { BadRequestAppException } from '../../common/errors/app-exception.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';

const TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.REQUESTED]: [
    WorkOrderStatus.ASSIGNED,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.ASSIGNED]: [
    WorkOrderStatus.ACCEPTED,
    WorkOrderStatus.REQUESTED,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.ACCEPTED]: [
    WorkOrderStatus.RESCHEDULED,
    WorkOrderStatus.EN_ROUTE,
    WorkOrderStatus.CANCELLED,
  ],
  [WorkOrderStatus.RESCHEDULED]: [WorkOrderStatus.ACCEPTED],
  [WorkOrderStatus.EN_ROUTE]: [WorkOrderStatus.IN_PROGRESS],
  [WorkOrderStatus.IN_PROGRESS]: [
    WorkOrderStatus.ISSUE,
    WorkOrderStatus.COMPLETED,
  ],
  [WorkOrderStatus.ISSUE]: [
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.ESCALATED,
  ],
  [WorkOrderStatus.ESCALATED]: [],
  [WorkOrderStatus.COMPLETED]: [],
  [WorkOrderStatus.CANCELLED]: [],
};

@Injectable()
export class StateMachineService {
  validate(from: WorkOrderStatus, to: WorkOrderStatus): void {
    const allowed = TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new BadRequestAppException(
        `Cannot transition from ${from} to ${to}`,
        ErrorCodes.VALIDATION_INVALID_TRANSITION,
      );
    }
  }

  getNextStates(status: WorkOrderStatus): WorkOrderStatus[] {
    return TRANSITIONS[status] ?? [];
  }
}
