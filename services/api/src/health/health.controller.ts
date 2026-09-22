import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { type Response } from 'express';
import { HealthService } from './health.service';
import { type ReadinessResult } from './health.types';

@ApiTags('health')
@Controller('health')
// Load balancer va ECS probe'lari tez-tez so'rov yuboradi — ularni
// rate limiter bloklab qo'ymasligi kerak.
@SkipThrottle()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Liveness: process tirikmi. Tashqi bog'liqliklarni TEKSHIRMAYDI —
   * aks holda Redis uzilganda orkestrator konteynerni qayta ishga tushiradi,
   * bu esa muammoni hal qilmaydi, faqat kuchaytiradi.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Process tirik' })
  liveness(): { status: 'ok'; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
  }

  /**
   * Readiness: trafik qabul qilishga tayyormi.
   * Biror bog'liqlik ishlamasa — `503`, orkestrator instansiyani rotatsiyadan
   * chiqaradi.
   */
  @Get('ready')
  @ApiOperation({ summary: "Readiness probe (tashqi bog'liqliklar)" })
  @ApiResponse({ status: 200, description: "Barcha bog'liqliklar ishlayapti" })
  @ApiResponse({ status: 503, description: "Bir yoki bir nechta bog'liqlik ishlamayapti" })
  async readiness(@Res({ passthrough: true }) res: Response): Promise<ReadinessResult> {
    const result = await this.health.readiness();

    res.status(result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return result;
  }
}
