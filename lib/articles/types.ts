/**
 * Article system types (from Prisma schema / migrations)
 */

export interface ArticleCategory {
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_category_id: string | null;
  sort_order: number | null;
  created_at: Date | null;
}

export interface Place {
  place_id: string;
  slug: string;
  name: string;
  type: string;
  description?: string | null;
  parent_place_id?: string | null;
}

export interface ArticlePlaceLink {
  article_place_id: string;
  article_id: string;
  place_id: string;
  primary_place: boolean | null;
  place?: Place;
}

export interface Article {
  article_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  article_type: string;
  status: string | null;
  published_at: Date | null;
  updated_at: Date | null;
  author_id: string | null;
  author_name: string | null;
  author_bio: string | null;
  author_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  exclude_from_place_hubs: boolean | null;
  primary_category_id: string | null;
  copiq_id: string | null;
  copiq_social_posts: Record<string, unknown> | null;
  pr_contacts: Record<string, unknown> | null;
  created_at: Date | null;
  view_count: number | null;
  article_category?: ArticleCategory | null;
  article_place?: ArticlePlaceLink[];
}

export interface ArticleWithRelations extends Article {
  article_category: ArticleCategory | null;
  article_place: ArticlePlaceLink[];
}
