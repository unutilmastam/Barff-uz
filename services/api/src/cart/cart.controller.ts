import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../common/dto/api-error';
import { ApiZodBody } from '../common/swagger/zod-schema.decorator';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DealersService } from '../dealers/dealers.service';
import { CartService } from './cart.service';
import { CartAddDto, CartPromoDto, CartQuantityDto } from './dto/cart.dto';

/**
 * Diler savati (CLAUDE.md §5).
 *
 * SAVAT ID SI SO'ROVDA YO'Q. U joriy dilerdan olinadi, ya'ni boshqa
 * dilerning savatiga murojaat qilishning yo'li YO'Q.
 *
 * NARX MAYDONI ham yo'q: mijoz `unitPrice` yuborsa, u sxemadan
 * o'tmaydi va hech narsaga ta'sir qilmaydi. Narx har javobda
 * SERVERDA qayta hisoblanadi.
 */
@ApiTags('dealer: savat')
@Controller('dealer/cart')
@Roles('DEALER')
export class CartController {
  constructor(
    private readonly cart: CartService,
    private readonly dealers: DealersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Savat va uning joriy narxi' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Diler faol emas' })
  async view(@CurrentUser() user: AuthenticatedUser) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.cart.view(dealer.id);
  }

  @Post('items')
  @ApiOperation({ summary: "Savatga qo'shish" })
  @ApiZodBody(CartAddDto)
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Variant topilmadi' })
  async add(@CurrentUser() user: AuthenticatedUser, @Body() dto: CartAddDto) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.cart.add(dealer.id, dto.variantId, dto.quantity);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: "Miqdorni o'zgartirish (0 — o'chiradi)" })
  @ApiZodBody(CartQuantityDto)
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Pozitsiya topilmadi' })
  async setQuantity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CartQuantityDto,
  ) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.cart.setQuantity(dealer.id, id, dto.quantity);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: "Pozitsiyani o'chirish" })
  @ApiResponse({ status: 404, type: ApiErrorDto, description: 'Pozitsiya topilmadi' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.cart.remove(dealer.id, id);
  }

  @Delete()
  @ApiOperation({ summary: "Savatni bo'shatish" })
  async clear(@CurrentUser() user: AuthenticatedUser) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.cart.clear(dealer.id);
  }

  @Put('promo')
  @ApiOperation({ summary: 'Aksiya kodi (null — olib tashlaydi)' })
  @ApiZodBody(CartPromoDto)
  async setPromo(@CurrentUser() user: AuthenticatedUser, @Body() dto: CartPromoDto) {
    const dealer = await this.dealers.requireActiveDealer(user.id);

    return this.cart.setPromoCode(dealer.id, dto.code);
  }
}
