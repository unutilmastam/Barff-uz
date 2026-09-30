import {
  creditLimitSchema,
  invoiceCancelSchema,
  invoiceCreateSchema,
  invoiceListQuerySchema,
  invoiceUpdateSchema,
  paymentAllocateSchema,
  paymentCreateSchema,
  paymentListQuerySchema,
} from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class InvoiceCreateDto extends createZodDto(invoiceCreateSchema) {}
export class InvoiceUpdateDto extends createZodDto(invoiceUpdateSchema) {}
export class InvoiceCancelDto extends createZodDto(invoiceCancelSchema) {}
export class InvoiceListQueryDto extends createZodDto(invoiceListQuerySchema) {}
export class PaymentCreateDto extends createZodDto(paymentCreateSchema) {}
export class PaymentListQueryDto extends createZodDto(paymentListQuerySchema) {}
export class PaymentAllocateDto extends createZodDto(paymentAllocateSchema) {}
export class CreditLimitDto extends createZodDto(creditLimitSchema) {}
