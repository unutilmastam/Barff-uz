import {
  productCategoryCreateSchema,
  productCategoryUpdateSchema,
  productCreateSchema,
  productListQuerySchema,
  productPriceCreateSchema,
  productUpdateSchema,
  productVariantCreateSchema,
  productVariantUpdateSchema,
} from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class ProductCreateDto extends createZodDto(productCreateSchema) {}
export class ProductUpdateDto extends createZodDto(productUpdateSchema) {}
export class ProductListQueryDto extends createZodDto(productListQuerySchema) {}

export class ProductVariantCreateDto extends createZodDto(productVariantCreateSchema) {}
export class ProductVariantUpdateDto extends createZodDto(productVariantUpdateSchema) {}

export class ProductPriceCreateDto extends createZodDto(productPriceCreateSchema) {}

export class ProductCategoryCreateDto extends createZodDto(productCategoryCreateSchema) {}
export class ProductCategoryUpdateDto extends createZodDto(productCategoryUpdateSchema) {}
