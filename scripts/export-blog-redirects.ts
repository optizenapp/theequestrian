import fs from 'fs';
import path from 'path';
import { shopifyFetch } from '../lib/shopify/client';

interface ShopifyBlog {
  handle: string;
  title: string;
}

interface BlogEdge {
  node: ShopifyBlog;
  cursor: string;
}

interface BlogResponse {
  blogs: {
    edges: BlogEdge[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

interface ArticleEdge {
  node: {
    handle: string;
  };
  cursor: string;
}

interface ArticlesResponse {
  blog: {
    handle: string;
    articles: {
      edges: ArticleEdge[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  } | null;
}

const BLOGS_QUERY = `
  query GetBlogs($first: Int!, $after: String) {
    blogs(first: $first, after: $after) {
      edges {
        node {
          handle
          title
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const ARTICLES_QUERY = `
  query GetArticlesByBlog($handle: String!, $first: Int!, $after: String) {
    blog(handle: $handle) {
      handle
      articles(first: $first, after: $after, sortKey: PUBLISHED_AT, reverse: true) {
        edges {
          node {
            handle
          }
          cursor
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

async function fetchAllBlogs(): Promise<ShopifyBlog[]> {
  const blogs: ShopifyBlog[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response: BlogResponse = await shopifyFetch<BlogResponse>({
      query: BLOGS_QUERY,
      variables: { first: 50, after },
      cache: 'no-store',
    });

    response.blogs.edges.forEach((edge) => blogs.push(edge.node));
    hasNextPage = response.blogs.pageInfo.hasNextPage;
    after = response.blogs.pageInfo.endCursor;
  }

  return blogs;
}

async function fetchAllArticles(blogHandle: string): Promise<string[]> {
  const handles: string[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response: ArticlesResponse = await shopifyFetch<ArticlesResponse>({
      query: ARTICLES_QUERY,
      variables: { handle: blogHandle, first: 250, after },
      cache: 'no-store',
    });

    const blog = response.blog;
    if (!blog) break;

    blog.articles.edges.forEach((edge) => handles.push(edge.node.handle));
    hasNextPage = blog.articles.pageInfo.hasNextPage;
    after = blog.articles.pageInfo.endCursor;
  }

  return handles;
}

function buildCsv(rows: Array<{ from: string; to: string }>): string {
  const lines = ['from,to'];
  rows.forEach((row) => {
    lines.push(`${row.from},${row.to}`);
  });
  return lines.join('\n') + '\n';
}

async function exportBlogRedirects() {
  console.log('Exporting Shopify blogs and articles...');

  const blogs = await fetchAllBlogs();
  const rows: Array<{ from: string; to: string }> = [];

  for (const blog of blogs) {
    const articleHandles = await fetchAllArticles(blog.handle);
    for (const articleHandle of articleHandles) {
      const from = `/blogs/${blog.handle}/${articleHandle}`;
      const to = `/${blog.handle}/${articleHandle}`;
      rows.push({ from, to });
    }
  }

  const outputPath = path.join(process.cwd(), 'redirects', 'blogs.csv');
  fs.writeFileSync(outputPath, buildCsv(rows), 'utf-8');

  console.log(`Wrote ${rows.length} blog redirects to ${outputPath}`);
}

exportBlogRedirects().catch((error) => {
  console.error('Failed to export blog redirects:', error);
  process.exit(1);
});
