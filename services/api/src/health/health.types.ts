export type CheckState = 'up' | 'down';

export interface CheckResult {
  name: string;
  state: CheckState;
  durationMs: number;
  error?: string;
}

export interface ReadinessResult {
  status: 'ok' | 'degraded';
  checks: CheckResult[];
}

/**
 * Tashqi bog'liqlik tekshiruvi.
 *
 * S03 da Prisma, S08 da S3 shu interfeysni amalga oshirib, health.service
 * ga qo'shiladi — readiness endpoint'ining o'zini o'zgartirish shart emas.
 */
export interface HealthIndicator {
  readonly name: string;
  check(): Promise<boolean>;
}

export const HEALTH_INDICATORS = Symbol('HEALTH_INDICATORS');
