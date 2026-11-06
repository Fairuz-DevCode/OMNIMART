export interface ProductVariantDTO {
  id?: number;
  size: string;
  stock: number;
}

export interface CreateProductDTO {
  category_id: number;
  sku?: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  img_url?: string;
  variants?: ProductVariantDTO[];
}

export interface UpdateProductDTO {
  category_id?: number;
  sku?: string;
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  img_url?: string;
  variants?: ProductVariantDTO[];
}

export interface ProductResponse {
  id: number;
  category_id: number;
  sku: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  img_url: string | null;
  created_at?: Date;
  variants?: ProductVariantDTO[];
}
