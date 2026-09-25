import {
  lowStockThresholdSchema,
  movementListQuerySchema,
  stockListQuerySchema,
  stockMovementSchema,
  stockTransferSchema,
  warehouseSchema,
  warehouseUpdateSchema,
} from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class WarehouseDto extends createZodDto(warehouseSchema) {}
export class WarehouseUpdateDto extends createZodDto(warehouseUpdateSchema) {}
export class StockMovementDto extends createZodDto(stockMovementSchema) {}
export class StockTransferDto extends createZodDto(stockTransferSchema) {}
export class LowStockThresholdDto extends createZodDto(lowStockThresholdSchema) {}
export class StockListQueryDto extends createZodDto(stockListQuerySchema) {}
export class MovementListQueryDto extends createZodDto(movementListQuerySchema) {}
