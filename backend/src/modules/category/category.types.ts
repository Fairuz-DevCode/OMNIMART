export interface CreateCategoryDTO {
  name: string;
  slug: string;
  parent_id?: number | null;
  parent_slug?: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
}
