import { shopifyFetch } from './client';
import { GET_BLOG_BY_HANDLE, GET_ARTICLE_BY_HANDLE, GET_RECENT_ARTICLES, GET_ALL_BLOGS } from './queries';
import { ShopifyBlog, ShopifyArticle } from '@/types/shopify';

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

    return response.blog;
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

    return response.blog?.articleByHandle || null;
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

