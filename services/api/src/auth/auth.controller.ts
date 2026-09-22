import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody } from '../common/swagger/zod-schema.decorator';
import { AppConfig } from '../config/app.config';
import { type RequestWithUser } from './auth.request';
import { AuthService, type RequestContext } from './auth.service';
import { type AuthenticatedUser } from './auth.types';
import { REFRESH_TOKEN_COOKIE, clearAuthCookies, setAuthCookies } from './auth.cookies';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto, RefreshDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email va parol bilan kirish' })
  @ApiZodBody(LoginDto)
  @ApiResponse({ status: 200, description: 'Kirish muvaffaqiyatli' })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: "Email yoki parol noto'g'ri" })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Akkaunt bloklangan yoki faol emas' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, user } = await this.auth.login(dto.email, dto.password, context(req));

    setAuthCookies(res, tokens, this.config);

    // Token tanada ham qaytariladi — brauzerdan tashqaridagi mijozlar uchun.
    // Brauzer ilovalari cookie'ga tayanadi va bu qiymatlarni saqlamaydi.
    return { user: publicUser(user), ...tokens };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access token yangilash (refresh rotation)' })
  @ApiResponse({ status: 200, description: 'Yangi token juftligi' })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Refresh token yaroqsiz' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE] ?? '';
    const { tokens, user } = await this.auth.refresh(token, context(req));

    setAuthCookies(res, tokens, this.config);

    return { user: publicUser(user), ...tokens };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Chiqish — joriy sessiyani bekor qilish' })
  @ApiResponse({ status: 204, description: 'Chiqildi' })
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = dto.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE];

    await this.auth.logout(token, context(req));

    // Cookie'lar token yaroqsiz bo'lganda ham tozalanadi: chiqish so'rovi
    // har doim "chiqilgan" holat bilan tugashi kerak.
    clearAuthCookies(res, this.config);
  }

  @Get('me')
  @ApiOperation({ summary: 'Joriy foydalanuvchi, rollari va ruxsatlari' })
  @ApiResponse({ status: 200, description: "Foydalanuvchi ma'lumotlari" })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Avtorizatsiya talab qilinadi' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return publicUser(user);
  }
}

/** Javobga faqat kerakli maydonlar chiqadi — parol hash'i hech qachon. */
function publicUser(user: AuthenticatedUser) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles,
    permissions: user.permissions,
  };
}

function context(req: RequestWithUser): RequestContext {
  const userAgent = req.headers['user-agent'];

  return {
    ip: req.ip ?? 'unknown',
    ...(typeof userAgent === 'string' ? { userAgent } : {}),
    ...(req.requestId !== undefined ? { requestId: req.requestId } : {}),
  };
}
