import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodQuery } from '../common/swagger/zod-schema.decorator';
import { type RequestWithUser } from '../auth/auth.request';
import { type RequestContext } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { type AuthenticatedUser } from '../auth/auth.types';
import { AppConfig } from '../config/app.config';
import { MediaListQueryDto, MediaUploadDto } from './dto/media.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly config: AppConfig,
  ) {}

  @Post()
  @Permissions('media.upload')
  @UseInterceptors(
    FileInterceptor('file', {
      // Xotirada saqlanadi: fayl diskka yozilmaydi, ya'ni vaqtinchalik
      // fayllar orqali sizib chiqish yo'li ham yo'q. Hajm chegarasi
      // shu yerda ham qo'yiladi — katta fayl butunlay o'qilmasin.
      limits: { fileSize: 64 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Fayl yuklash' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE'], default: 'PRIVATE' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Yuklandi' })
  @ApiResponse({ status: 413, type: ApiErrorDto, description: 'Fayl juda katta' })
  @ApiResponse({ status: 415, type: ApiErrorDto, description: "Fayl turi qo'llab-quvvatlanmaydi" })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: MediaUploadDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ) {
    if (file === undefined) {
      throw new BadRequestException({ message: 'Fayl yuborilmadi', code: 'FILE_REQUIRED' });
    }

    return this.media.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      visibility: dto.visibility,
      actor: { id: user.id, email: user.email },
      ctx: context(req),
    });
  }

  @Get()
  @Permissions('content.view')
  @ApiOperation({ summary: "Fayllar ro'yxati" })
  @ApiZodQuery(MediaListQueryDto)
  list(@Query() query: MediaListQueryDto) {
    return this.media.list(query);
  }

  @Get(':id')
  @Permissions('content.view')
  @ApiOperation({ summary: "Fayl ma'lumotlari" })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Topilmadi' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.media.findById(id);
  }

  @Get(':id/url')
  @Permissions('content.view')
  @ApiOperation({ summary: 'Faylga kirish manzili (maxfiy fayl uchun imzolangan)' })
  resolveUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.media.resolveUrl(id);
  }

  @Delete(':id')
  @Permissions('media.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Faylni o'chirish" })
  @ApiResponse({ status: 204, description: "O'chirildi" })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.media.remove(id, { id: user.id, email: user.email }, context(req));
  }
}

function context(req: RequestWithUser): RequestContext {
  const userAgent = req.headers['user-agent'];

  return {
    ip: req.ip ?? 'unknown',
    ...(typeof userAgent === 'string' ? { userAgent } : {}),
    ...(req.requestId !== undefined ? { requestId: req.requestId } : {}),
  };
}
