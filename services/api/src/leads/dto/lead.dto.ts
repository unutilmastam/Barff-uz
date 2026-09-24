import { z } from 'zod';
import { LEAD_STATUSES } from '@barff/types';
import {
  leadAssignSchema,
  leadCreateSchema,
  leadStatusUpdateSchema,
  paginationQuerySchema,
} from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class LeadCreateDto extends createZodDto(leadCreateSchema) {}
export class LeadStatusUpdateDto extends createZodDto(leadStatusUpdateSchema) {}
export class LeadAssignDto extends createZodDto(leadAssignSchema) {}

export class LeadListQueryDto extends createZodDto(
  paginationQuerySchema.extend({ status: z.enum(LEAD_STATUSES).optional() }),
) {}
