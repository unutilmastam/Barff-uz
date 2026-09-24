import { cartAddSchema, cartPromoSchema, cartQuantitySchema } from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class CartAddDto extends createZodDto(cartAddSchema) {}
export class CartQuantityDto extends createZodDto(cartQuantitySchema) {}
export class CartPromoDto extends createZodDto(cartPromoSchema) {}
