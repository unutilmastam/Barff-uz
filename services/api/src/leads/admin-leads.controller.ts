import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type LeadStatus } from '@barff/db';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody, ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { LeadAssignDto, LeadListQueryDto, LeadStatusUpdateDto } from './dto/lead.dto';
import { LeadsService } from './leads.service';

/** Arizalarni yuritish: sotuvchi va admin. */
@ApiTags('admin: leads')
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @Permissions('leads.view')
  @ApiOperation({ summary: "Arizalar ro'yxati" })
  @ApiZodQuery(LeadListQueryDto)
  list(@Query() query: LeadListQueryDto) {
    return this.leads.list({
      page: query.page,
      limit: query.limit,
      status: query.status as LeadStatus | undefined,
    });
  }

  /*
    DIQQAT: bu marshrut `@Get(':id')` dan OLDIN turishi SHART.

    Nest marshrutlarni e'lon tartibida solishtiradi, shuning uchun
    `:id` yuqorida bo'lsa, `/assignees` ham unga tushardi va
    `ParseUUIDPipe` uni "noto'g'ri UUID" deb rad etardi — ya'ni
    endpoint umuman ishlamasdi.
  */
  @Get('assignees')
  @Permissions('leads.view')
  @ApiOperation({ summary: "Arizani yuritishi mumkin bo'lgan xodimlar" })
  listAssignees() {
    return this.leads.listAssignees();
  }

  @Get(':id')
  @Permissions('leads.view')
  @ApiOperation({ summary: 'Ariza va uning tarixi' })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.leads.findOne(id);
  }

  @Patch(':id/assignee')
  @Permissions('leads.manage')
  @ApiOperation({ summary: 'Arizani xodimga biriktirish' })
  @ApiZodBody(LeadAssignDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Xodim ariza yurita olmaydi' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LeadAssignDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.leads.assign(
      id,
      dto.assigneeId,
      { id: user.id, email: user.email },
      context(request),
    );
  }

  @Patch(':id/status')
  @Permissions('leads.manage')
  @ApiOperation({ summary: 'Ariza holatini almashtirish' })
  @ApiZodBody(LeadStatusUpdateDto)
  @ApiResponse({ status: 400, type: ApiErrorDto, description: "Noto'g'ri o'tish" })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LeadStatusUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithUser,
  ) {
    return this.leads.changeStatus(
      id,
      dto.status as LeadStatus,
      dto.note,
      { id: user.id, email: user.email },
      context(request),
    );
  }
}

/** So'rov konteksti — audit yozuvi uchun (CLAUDE.md §23). */
function context(req: RequestWithUser): RequestContext {
  const userAgent = req.headers['user-agent'];

  return {
    ip: req.ip ?? 'unknown',
    ...(typeof userAgent === 'string' ? { userAgent } : {}),
    ...(req.requestId !== undefined ? { requestId: req.requestId } : {}),
  };
}
