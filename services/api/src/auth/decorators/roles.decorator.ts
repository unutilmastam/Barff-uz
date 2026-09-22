import { SetMetadata } from '@nestjs/common';
import { type Role } from '@barff/types';

export const ROLES_KEY = 'auth:roles';

/** Endpoint'ni sanab o'tilgan rollardan KAMIDA BITTASIGA cheklaydi. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
