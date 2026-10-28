import { Module } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminProductsController } from './admin-products.controller';
import { ProductCategoriesService } from './product-categories.service';
import { ProductsService } from './products.service';
import { PublicProductsController } from './public-products.controller';

@Module({
  controllers: [PublicProductsController, AdminProductsController, AdminCategoriesController],
  providers: [ProductsService, ProductCategoriesService],
  exports: [ProductsService],
})
export class ProductsModule {}
