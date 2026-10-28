import { type Localized, type PublicImage } from '@barff/types';

/** `GET /admin/products/:id` javobi (muharrir uchun). */
export interface AdminPrice {
  id: string;
  amount: number;
  currency: string;
  validFrom: string;
}

export interface AdminVariant {
  id: string;
  sku: string;
  barcode: string | null;
  volumeMl: number;
  unitsPerPack: number | null;
  isActive: boolean;
  displayOrder: number;
  currentPrice: AdminPrice | null;
  prices: AdminPrice[];
}

export interface AdminProductImage {
  id: string;
  isPrimary: boolean;
  displayOrder: number;
  mediaAssetId: string;
  originalName: string;
  image: PublicImage | null;
}

export interface AdminProduct {
  id: string;
  slug: string;
  sku: string;
  categoryId: string;
  name: Localized;
  description: Localized | null;
  ingredients: Localized | null;
  storage: Localized | null;
  flavor: Localized | null;
  shelfLifeDays: number | null;
  displayOrder: number;
  isActive: boolean;
  variants: AdminVariant[];
  images: AdminProductImage[];
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: Localized;
  description: Localized | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
}
