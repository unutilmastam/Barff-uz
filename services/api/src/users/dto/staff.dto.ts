import {
  staffCreateSchema,
  staffListQuerySchema,
  staffPasswordResetSchema,
  staffRolesUpdateSchema,
  staffUpdateSchema,
} from '@barff/validation';
import { createZodDto } from '../../common/validation/zod-dto';

export class StaffCreateDto extends createZodDto(staffCreateSchema) {}
export class StaffUpdateDto extends createZodDto(staffUpdateSchema) {}
export class StaffRolesUpdateDto extends createZodDto(staffRolesUpdateSchema) {}
export class StaffPasswordResetDto extends createZodDto(staffPasswordResetSchema) {}
export class StaffListQueryDto extends createZodDto(staffListQuerySchema) {}
