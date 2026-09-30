import {
  deliveryAssignSchema,
  deliveryListQuerySchema,
  deliveryNoteSchema,
  deliveryRouteAttachSchema,
  deliveryRouteQuerySchema,
  deliveryRouteSchema,
  deliveryRouteUpdateSchema,
  deliveryStatusSchema,
  driverSchema,
  driverUpdateSchema,
  vehicleSchema,
  vehicleUpdateSchema,
} from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class VehicleDto extends createZodDto(vehicleSchema) {}
export class VehicleUpdateDto extends createZodDto(vehicleUpdateSchema) {}
export class DriverDto extends createZodDto(driverSchema) {}
export class DriverUpdateDto extends createZodDto(driverUpdateSchema) {}
export class DeliveryAssignDto extends createZodDto(deliveryAssignSchema) {}
export class DeliveryStatusDto extends createZodDto(deliveryStatusSchema) {}
export class DeliveryListQueryDto extends createZodDto(deliveryListQuerySchema) {}
export class DeliveryNoteDto extends createZodDto(deliveryNoteSchema) {}
export class DeliveryRouteDto extends createZodDto(deliveryRouteSchema) {}
export class DeliveryRouteUpdateDto extends createZodDto(deliveryRouteUpdateSchema) {}
export class DeliveryRouteAttachDto extends createZodDto(deliveryRouteAttachSchema) {}
export class DeliveryRouteQueryDto extends createZodDto(deliveryRouteQuerySchema) {}
