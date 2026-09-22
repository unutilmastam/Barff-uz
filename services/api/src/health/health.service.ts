import { Inject, Injectable } from '@nestjs/common';
import {
  type CheckResult,
  HEALTH_INDICATORS,
  type HealthIndicator,
  type ReadinessResult,
} from './health.types';

/** Bitta tekshiruv uchun eng ko'p kutish vaqti. */
const CHECK_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  constructor(
    @Inject(HEALTH_INDICATORS)
    private readonly indicators: readonly HealthIndicator[],
  ) {}

  /**
   * Barcha tekshiruvlar parallel ishlaydi va hech biri butun javobni
   * osib qo'ymasligi uchun timeout bilan chegaralanadi.
   */
  async readiness(): Promise<ReadinessResult> {
    const checks = await Promise.all(this.indicators.map((indicator) => this.runCheck(indicator)));

    return {
      status: checks.every((c) => c.state === 'up') ? 'ok' : 'degraded',
      checks,
    };
  }

  private async runCheck(indicator: HealthIndicator): Promise<CheckResult> {
    const startedAt = Date.now();

    try {
      const ok = await withTimeout(indicator.check(), CHECK_TIMEOUT_MS);
      return {
        name: indicator.name,
        state: ok ? 'up' : 'down',
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        name: indicator.name,
        state: 'down',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown',
      };
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
