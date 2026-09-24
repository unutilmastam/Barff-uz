import {
  paginationQuerySchema,
  priceQuoteSchema,
  priceRuleSchema,
  priceRuleUpdateSchema,
} from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class PriceRuleDto extends createZodDto(priceRuleSchema) {}
export class PriceRuleUpdateDto extends createZodDto(priceRuleUpdateSchema) {}
export class PriceQuoteDto extends createZodDto(priceQuoteSchema) {}
export class PriceRuleListQueryDto extends createZodDto(paginationQuerySchema) {}
