import { z } from 'zod';
import { DEALER_STATUSES } from '@barff/types';
import {
  dealerAddressSchema,
  dealerAddressUpdateSchema,
  dealerProfileUpdateSchema,
  dealerRegisterSchema,
  dealerStatusUpdateSchema,
  dealerTermsUpdateSchema,
  dealerTierSchema,
  dealerTierUpdateSchema,
  paginationQuerySchema,
} from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class DealerRegisterDto extends createZodDto(dealerRegisterSchema) {}
export class DealerProfileUpdateDto extends createZodDto(dealerProfileUpdateSchema) {}
export class DealerAddressDto extends createZodDto(dealerAddressSchema) {}
export class DealerAddressUpdateDto extends createZodDto(dealerAddressUpdateSchema) {}
export class DealerStatusUpdateDto extends createZodDto(dealerStatusUpdateSchema) {}
export class DealerTermsUpdateDto extends createZodDto(dealerTermsUpdateSchema) {}
export class DealerTierDto extends createZodDto(dealerTierSchema) {}
export class DealerTierUpdateDto extends createZodDto(dealerTierUpdateSchema) {}

export class DealerListQueryDto extends createZodDto(
  paginationQuerySchema.extend({
    status: z.enum(DEALER_STATUSES).optional(),
    search: z.string().trim().min(1).max(120).optional(),
  }),
) {}
