import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { Public } from '../auth/decorators/public.decorator';
import { DealersService } from './dealers.service';
import { DealerRegisterDto } from './dto/dealer.dto';

/**
 * Ommaviy diler arizasi (CLAUDE.md §5, §27 Faza 2).
 *
 * Lead formasidan FARQI: bu yerda KIRISH AKKAUNTI ham yaratiladi,
 * ya'ni ariza yuborgan odam holatini o'zi kuzatib boradi. Lead esa
 * anonim qoladi va uni sotuvchi yuritadi.
 *
 * Akkaunt yaratilishi kirish huquqini BERMAYDI: diler endpoint'lari
 * `APPROVED` holatini talab qiladi.
 */
@ApiTags('dealers')
@Controller('dealers/register')
@Public()
export class DealerRegistrationController {
  constructor(private readonly dealers: DealersService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  /*
    Soatiga 5 ta — lead formasidagi kabi.

    Bu yerda cheklov QO'SHIMCHA ma'noga ega: endpoint akkaunt
    yaratadi, ya'ni cheklovsiz u bazani soxta akkauntlar bilan
    to'ldirish vositasiga aylanardi.
  */
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: "Diler bo'lish uchun ariza" })
  @ApiZodBody(DealerRegisterDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Validatsiya xatosi' })
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'STIR band' })
  @ApiResponse({ status: 429, type: ApiErrorDto, description: "Juda ko'p so'rov" })
  async register(@Body() dto: DealerRegisterDto, @Req() request: RequestWithUser) {
    const userAgent = request.headers['user-agent'];
    const ctx: RequestContext = {
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    };

    return this.dealers.register(dto, ctx);
  }
}
