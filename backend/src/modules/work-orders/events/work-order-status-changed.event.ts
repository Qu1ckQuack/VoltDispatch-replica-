import { WorkOrderStatus } from '../../../generated/prisma/enums.js';

export class WorkOrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly fromStatus: WorkOrderStatus,
    public readonly toStatus: WorkOrderStatus,
    public readonly order: {
      id: string;
      status: WorkOrderStatus;
      customerId: string;
      dealerId: string;
      technicianId: string | null;
    },
  ) {}
}
