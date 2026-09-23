import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type BusinessType } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { Public } from '../auth/decorators/public.decorator';
import { LeadCreateDto } from './dto/lead.dto';
import { LeadsService } from './leads.service';

/**
 * Ommaviy B2B ariza (CLAUDE.md §9).
 *
 * Himoya uch qatlamli:
 *   1. `honeypot` — yashirin maydon; odam ko'rmaydi, bot to'ldiradi.
 *   2. Tezlik chegarasi — bir IP dan soatiga 5 ta ariza.
 *   3. Takrorni aniqlash — bir kompaniya+telefon 30 daqiqada bir marta.
 *
 * Javob HAR DOIM bir xil ko'rinadi: takror bo'lsa ham "qabul qilindi"
 * deyiladi. Aks holda javobdan foydalanib, qaysi kompaniya allaqachon
 * ariza berganini aniqlash mumkin bo'lardi.
 */
@ApiTags('leads')
@Controller('leads')
@Public()
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  // Soatiga 5 ta: odam uchun yetarli, bot uchun juda kam.
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'B2B hamkorlik arizasi' })
  @ApiZodBody(LeadCreateDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Validatsiya xatosi' })
  @ApiResponse({ status: 429, type: ApiErrorDto, description: "Juda ko'p so'rov" })
  async create(@Body() dto: LeadCreateDto, @Req() request: RequestWithUser) {
    const userAgent = request.headers['user-agent'];
    const ctx: RequestContext = {
      ip: request.ip ?? 'unknown',
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
      ...(request.requestId !== undefined ? { requestId: request.requestId } : {}),
    };

    await this.leads.submit(
      {
        companyName: dto.companyName,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        region: dto.region,
        businessType: dto.businessType as BusinessType,
        desiredProducts: dto.desiredProducts,
        estimatedMonthlyVolume: dto.estimatedMonthlyVolume,
        message: dto.message,
      },
      ctx,
    );

    // Ichki identifikator QAYTARILMAYDI: u anonim yuboruvchiga kerak
    // emas, lekin yozuvlar sonini taxmin qilishga imkon berardi.
    return { accepted: true };
  }
}
