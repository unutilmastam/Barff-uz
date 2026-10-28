import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { AdminUsersService } from './admin-users.service';
import {
  StaffCreateDto,
  StaffListQueryDto,
  StaffPasswordResetDto,
  StaffRolesUpdateDto,
  StaffUpdateDto,
} from './dto/staff.dto';

/**
 * Xodimlar (admin).
 *
 * Ko'rish — `users.view`; yaratish/o'zgartirish/parol — `users.manage`;
 * rol berish — `roles.manage` (ALOHIDA ruxsat: rol berish huquq oshirish
 * demak). Yangi xodim yaratish rol ham beradi, shuning uchun u ikkalasini ham talab qiladi.
 */
@ApiTags('admin: users')
@Controller('admin')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get('users')
  @Permissions('users.view')
  @ApiOperation({ summary: "Xodimlar ro'yxati (dilerlar kirmaydi)" })
  @ApiZodQuery(StaffListQueryDto)
  list(@Query() query: StaffListQueryDto) {
    return this.users.list(query);
  }

  @Get('roles')
  @Permissions('users.view')
  @ApiOperation({ summary: "Xodim rollari ro'yxati" })
  roles() {
    return this.users.listRoles();
  }

  @Post('users')
  @Permissions('users.manage', 'roles.manage')
  @ApiOperation({ summary: 'Xodim yaratish' })
  @ApiZodBody(StaffCreateDto)
  @ApiResponse({ status: 409, type: ApiErrorDto, description: 'email yoki telefon band' })
  create(
    @Body() dto: StaffCreateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.users.create(dto, actor(user), context(req));
  }

  @Patch('users/:id')
  @Permissions('users.manage')
  @ApiOperation({ summary: "Xodimni o'zgartirish yoki bloklash/ochish" })
  @ApiZodBody(StaffUpdateDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.users.update(
      id,
      {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      actor(user),
      context(req),
    );
  }

  @Put('users/:id/roles')
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Xodim rollarini almashtirish' })
  @ApiZodBody(StaffRolesUpdateDto)
  setRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffRolesUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    return this.users.setRoles(id, dto.roles, actor(user), context(req));
  }

  @Post('users/:id/password')
  @Permissions('users.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Parolni yangilash (barcha sessiyalar bekor qilinadi)' })
  @ApiZodBody(StaffPasswordResetDto)
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffPasswordResetDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.users.resetPassword(id, dto.password, actor(user), context(req));
  }
}

function actor(user: AuthenticatedUser): { id: string; email: string } {
  return { id: user.id, email: user.email };
}

function context(req: RequestWithUser): RequestContext {
  const userAgent = req.headers['user-agent'];

  return {
    ip: req.ip ?? 'unknown',
    ...(typeof userAgent === 'string' ? { userAgent } : {}),
    ...(req.requestId !== undefined ? { requestId: req.requestId } : {}),
  };
}
