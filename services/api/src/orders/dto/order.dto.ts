import { z } from 'zod';
import { ORDER_STATUSES } from '@barff/types';
import {
  adminOrderQuerySchema,
  orderInternalNoteSchema,
  orderStatusUpdateSchema,
  orderSubmitSchema,
  paginationQuerySchema,
} from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class OrderSubmitDto extends createZodDto(orderSubmitSchema) {}
export class OrderStatusUpdateDto extends createZodDto(orderStatusUpdateSchema) {}
export class OrderInternalNoteDto extends createZodDto(orderInternalNoteSchema) {}
export class AdminOrderQueryDto extends createZodDto(adminOrderQuerySchema) {}

export class OrderListQueryDto extends createZodDto(
  paginationQuerySchema.extend({ status: z.enum(ORDER_STATUSES).optional() }),
) {}
