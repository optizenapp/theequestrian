import { shopifyFetch } from './client';
import { GET_BLOG_BY_HANDLE, GET_ARTICLE_BY_HANDLE, GET_ALL_BLOGS } from './queries';
import { ShopifyBlog, ShopifyArticle, ShopifyArticleHeadless } from '@/types/shopify';

export function normalizeShopifyArticle(article: ShopifyArticle): ShopifyArticle {
  const mf = article.metafields;
  if (!mf?.length) {
    return { ...article, headless: null };
  }
  const val = (key: string) =>
    mf.find((m) => m != null && m.namespace === 'headless' && m.key === key)?.value?.trim() || null;
  const ctaPath = val('cta_path');
  const ctaLabel = val('cta_label');
  const relatedHandlesRaw = val('related_handles');
  const headless: ShopifyArticleHeadless | null =
    ctaPath || ctaLabel || relatedHandlesRaw
      ? { ctaPath, ctaLabel, relatedHandlesRaw }
      : null;
  return { ...article, headless };
}

function normalizeBlog(blog: ShopifyBlog | null): ShopifyBlog | null {
  if (!blog) return null;
  return {
    ...blog,
    articles: {
      edges: blog.articles.edges.map(({ node }) => ({
        node: normalizeShopifyArticle(node),
      })),
    },
  };
}

interface BlogResponse {
  blog: ShopifyBlog | null;
}

interface ArticleResponse {
  blog: {
    articleByHandle: ShopifyArticle | null;
  } | null;
}

interface AllBlogsResponse {
  blogs: {
    edges: Array<{
      node: {
        handle: string;
        title: string;
      };
    }>;
  };
}

export async function getBlogs() {
  try {
    const response = await shopifyFetch<AllBlogsResponse>({
      query: GET_ALL_BLOGS,
    });

    return response.blogs.edges.map(({ node }) => node);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return [];
  }
}

export async function getBlog(handle: string, first: number = 50) {
  try {
    const response = await shopifyFetch<BlogResponse>({
      query: GET_BLOG_BY_HANDLE,
      variables: { handle, first },
    });

    return normalizeBlog(response.blog);
  } catch (error) {
    console.error(`Error fetching blog ${handle}:`, error);
    return null;
  }
}

export async function getArticle(blogHandle: string, articleHandle: string) {
  try {
    const response = await shopifyFetch<ArticleResponse>({
      query: GET_ARTICLE_BY_HANDLE,
      variables: { blogHandle, articleHandle },
    });

    const raw = response.blog?.articleByHandle || null;
    return raw ? normalizeShopifyArticle(raw) : null;
  } catch (error) {
    console.error(`Error fetching article ${articleHandle}:`, error);
    return null;
  }
}

export async function getArticlesByAuthor(authorName: string) {
  try {
    // Fetch all articles from the 'news' blog
    const blog = await getBlog('news', 250);
    
    if (!blog) return [];

    // Filter by author name
    return blog.articles.edges
      .map(({ node }) => node)
      .filter((article) => article.author.name === authorName);
  } catch (error) {
    console.error(`Error fetching articles by author ${authorName}:`, error);
    return [];
  }
}






