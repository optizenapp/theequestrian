import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma";
import { getRouteUrl } from "./routes";

// Article System Library - v1.1.0
// Last updated: 2025-12-24

/**
 * Common include for article lookups to ensure consistent typing
 */
const fullArticleInclude = {
  article_tag_link: {
    include: {
      article_tag: true
    }
  },
  article_person: {
    include: {
      person: true
    }
  },
  article_entity: {
    include: {
      entity: true
    }
  },
  article_place: {
    include: {
      place: true
    }
  },
  article_category: true,
  article_walk_details: true,
  author: {
    select: {
      name: true,
      bio: true,
      image: true,
    }
  },
  _count: {
    select: {
      article_comment: {
        where: { status: 'approved' }
      }
    }
  }
} satisfies Prisma.articleInclude;

export type FullArticle = Prisma.articleGetPayload<{ include: typeof fullArticleInclude }>;

/**
 * Calculate a realistic walking duration based on distance
 * Factors in ~2.5 mph average speed and max 8 hours walking per day
 */
export function calculateWalkDuration(miles: number): string {
  const avgSpeedMph = 2.5;
  const maxHoursPerDay = 8;
  const totalHours = miles / avgSpeedMph;
  
  if (totalHours <= 1) {
    return "Under 1 hr";
  }
  
  if (totalHours <= maxHoursPerDay) {
    const hours = Math.ceil(totalHours);
    return `${hours} hrs`;
  }
  
  const days = Math.ceil(totalHours / maxHoursPerDay);
  return `${days} days`;
}

/**
 * Get an article by its slug (global search, not place-specific)
 */
export async function getArticleBySlugGlobal(slug: string): Promise<FullArticle | null> {
  return await prisma.article.findFirst({
    where: {
      slug: slug,
      status: 'published'
    },
    include: fullArticleInclude
  });
}

/**
 * Get an article by its slug and category and confirm it's linked to the correct place
 */
export async function getArticleBySlugAndCategory(slug: string, categorySlug: string, placeSlug: string): Promise<FullArticle | null> {
  const article = await prisma.article.findFirst({
    where: {
      slug: slug,
      article_category: {
        slug: categorySlug
      },
      article_place: {
        some: {
          place: {
            slug: placeSlug
          }
        }
      },
      status: 'published'
    },
    include: fullArticleInclude
  });

  // If not found and place is 'yorkshire', try global lookup as fallback
  if (!article && placeSlug === 'yorkshire') {
    return await getArticleBySlugAndCategoryGlobal(slug, categorySlug);
  }

  return article;
}

/**
 * Get an article by its slug and category (global search)
 */
export async function getArticleBySlugAndCategoryGlobal(slug: string, categorySlug: string): Promise<FullArticle | null> {
  return await prisma.article.findFirst({
    where: {
      slug: slug,
      article_category: {
        slug: categorySlug
      },
      status: 'published'
    },
    include: fullArticleInclude
  });
}

/**
 * Get an article by its slug and confirm it's linked to the correct place
 */
export async function getArticleBySlug(slug: string, placeSlug: string): Promise<FullArticle | null> {
  const article = await prisma.article.findFirst({
    where: {
      slug: slug,
      article_place: {
        some: {
          place: {
            slug: placeSlug
          }
        }
      },
      status: 'published'
    },
    include: fullArticleInclude
  });

  // If not found and place is 'yorkshire', try global lookup as fallback
  if (!article && placeSlug === 'yorkshire') {
    return await getArticleBySlugGlobal(slug);
  }

  return article;
}

/**
 * Get the canonical URL for an article based on its type and primary place
 */
export function getArticleUrl(article: FullArticle | { 
  slug: string, 
  article_type: string, 
  exclude_from_place_hubs?: boolean | null,
  article_category?: { slug: string } | null,
  article_place?: Array<{ place: { slug: string } }>
}): string {
  // 4-PILLAR URL STRUCTURE
  // Place is the primary anchor, Pillar is the global fallback
  // Structure: /[place]/[pillar]/[category]/[slug] OR /[pillar]/[category]/[slug]
  
  const typeMap: Record<string, string> = {
    'news': 'news',
    'inspiration': 'inspiration',
    'history': 'history',
    'guide': 'guides',
    'route': 'routes',
    // Legacy support
    'walk': 'walks',
  };

  const typePath = typeMap[article.article_type] || 'news';
  
  // Special handling for Walk articles - redirect to new route-based walk URLs
  // Walk articles are now managed in the route table, not the article system
  if (article.article_type === 'walk') {
    // Try to get primary place slug
    let placeSlug = null;
    if (!article.exclude_from_place_hubs && 'article_place' in article && article.article_place && article.article_place.length > 0) {
      const primary = article.article_place.find(ap => (ap as any).primary_place);
      placeSlug = primary ? (primary as any).place.slug : article.article_place[0].place.slug;
    }
    
    // Walks canonicalize to /walks/ URLs (not /routes/)
    if (placeSlug && placeSlug !== 'yorkshire') {
      return `/${placeSlug}/walks/${article.slug}`;
    }
    return `/walks/${article.slug}`;
  }
  
  // Special handling for Routes (GPX-enabled walks from route table)
  if (article.article_type === 'route') {
    // Try to get primary place slug
    let placeSlug = null;
    if (!article.exclude_from_place_hubs && 'article_place' in article && article.article_place && article.article_place.length > 0) {
      const primary = article.article_place.find(ap => (ap as any).primary_place);
      placeSlug = primary ? (primary as any).place.slug : article.article_place[0].place.slug;
    }
    
    // Routes can be place-specific or regional
    if (placeSlug && placeSlug !== 'yorkshire') {
      return `/${placeSlug}/routes/${article.slug}`;
    }
    return `/routes/${article.slug}`;
  }
  
  // Get category slug
  let catSlug = 'uncategorized';
  if ('article_category' in article && article.article_category?.slug) {
    catSlug = article.article_category.slug;
  }

  // Try to get primary place slug
  let placeSlug = null;
  
  // Only use place-specific URL if NOT excluded from place hubs
  if (!article.exclude_from_place_hubs && 'article_place' in article && article.article_place && article.article_place.length > 0) {
    // Look for primary place if it exists
    const primary = article.article_place.find(ap => (ap as any).primary_place);
    placeSlug = primary ? (primary as any).place.slug : article.article_place[0].place.slug;
  }

  if (!placeSlug || placeSlug === 'yorkshire') {
    return `/${typePath}/${catSlug}/${article.slug}`;
  }

  return `/${placeSlug}/${typePath}/${catSlug}/${article.slug}`;
}

/**
 * Get the canonical URL for a walk article by checking if it exists in the route table
 * If it exists in routes, return the route URL, otherwise return the article URL
 */
export async function getWalkCanonicalUrl(articleSlug: string): Promise<string | null> {
  try {
    const route = await prisma.route.findUnique({
      where: { slug: articleSlug },
      include: {
        route_place: {
          where: { is_primary: true },
          include: {
            place: {
              select: { 
                place_id: true,
                name: true,
                slug: true 
              }
            }
          }
        }
      }
    });

    if (route) {
      // Use the route URL as canonical
      return getRouteUrl({
        slug: route.slug,
        activity_type: route.activity_type as 'walking' | 'cycling' | null,
        places: route.route_place.map(rp => ({
          place_id: rp.place.place_id,
          name: rp.place.name,
          slug: rp.place.slug,
          is_primary: rp.is_primary
        }))
      });
    }

    return null;
  } catch (error) {
    console.error('Error fetching walk canonical URL:', error);
    return null;
  }
}

/**
 * Get all articles for a specific place, optionally filtered by type(s)
 */
export async function getArticlesByPlace(placeSlug: string, limit = 10, type?: string | string[]) {
  const where: any = {
    article_place: {
      some: {
        place: {
          slug: placeSlug
        }
      }
    },
    status: 'published',
    exclude_from_place_hubs: false
  };

  if (type) {
    if (Array.isArray(type)) {
      where.article_type = { in: type };
    } else {
      where.article_type = type;
    }
  }

  return await prisma.article.findMany({
    where,
    orderBy: {
      published_at: 'desc'
    },
    take: limit,
    include: fullArticleInclude
  });
}

/**
 * Get articles by category, optionally filtered by place and type
 */
export async function getArticlesByCategory(categorySlug: string, placeSlug?: string, type?: string | string[], limit = 50) {
  const where: any = {
    article_category: {
      slug: categorySlug
    },
    status: 'published'
  };

  // If we are on a place-specific hub, we exclude "global only" content
  if (placeSlug) {
    where.exclude_from_place_hubs = false;
    where.article_place = {
      some: {
        place: {
          slug: placeSlug
        }
      }
    };
  }

  if (type) {
    if (Array.isArray(type)) {
      where.article_type = { in: type };
    } else {
      where.article_type = type;
    }
  }

  return await prisma.article.findMany({
    where,
    orderBy: {
      published_at: 'desc'
    },
    take: limit,
    include: fullArticleInclude
  });
}

/**
 * Get popular articles based on view count
 */
export async function getPopularArticles(placeSlug?: string, limit = 5) {
  const where: any = {
    status: 'published',
    exclude_from_place_hubs: false
  };

  if (placeSlug) {
    where.article_place = {
      some: {
        place: {
          slug: placeSlug
        }
      }
    };
  }

  return await prisma.article.findMany({
    where,
    orderBy: {
      view_count: 'desc'
    },
    take: limit,
    include: fullArticleInclude
  });
}

/**
 * Get trending articles based on the trending flag or recent view growth
 */
export async function getTrendingArticles(placeSlug?: string, limit = 5) {
  const where: any = {
    status: 'published',
    exclude_from_place_hubs: false,
    is_trending: true
  };

  if (placeSlug) {
    where.article_place = {
      some: {
        place: {
          slug: placeSlug
        }
      }
    };
  }

  const trending = await prisma.article.findMany({
    where,
    orderBy: {
      ga_page_views: 'desc'
    },
    take: limit,
    include: fullArticleInclude
  });

  // Fallback to recent popular articles if not enough marked as trending
  if (trending.length < limit) {
    const recentPopular = await prisma.article.findMany({
      where: {
        ...where,
        is_trending: undefined, // ignore trending flag for fallback
        published_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // last 30 days
        }
      },
      orderBy: {
        ga_page_views: 'desc'
      },
      take: limit - trending.length,
      include: fullArticleInclude
    });
    
    // Combine and remove duplicates
    const combined = [...trending, ...recentPopular];
    const unique = Array.from(new Map(combined.map(a => [a.article_id, a])).values());
    return unique.slice(0, limit);
  }

  return trending;
}

/**
 * Get category details by slug
 */
export async function getArticleCategory(slug: string) {
  return await prisma.article_category.findUnique({
    where: { slug }
  });
}

/**
 * Get all categories with article counts, filtered by place and type
 */
/**
 * Get all tags with article counts
 * Optionally filtered by place and/or article type
 */
export async function getArticleTagsWithCounts(placeSlug?: string, type?: string | string[]) {
  const where: any = {
    status: 'published'
  };

  if (placeSlug) {
    where.article_place = {
      some: {
        place: {
          slug: placeSlug
        }
      }
    };
    where.exclude_from_place_hubs = false;
  }

  if (type) {
    if (Array.isArray(type)) {
      where.article_type = { in: type };
    } else {
      where.article_type = type;
    }
  }

  // Fetch tags that have articles matching the criteria
  const tags = await prisma.article_tag.findMany({
    where: {
      article_tag_link: {
        some: {
          article: where
        }
      }
    },
    select: {
      tag_id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          article_tag_link: {
            where: {
              article: where
            }
          }
        }
      }
    },
    orderBy: [
      { use_count: 'desc' },
      { name: 'asc' }
    ],
    take: 50 // Limit to top 50 tags
  });

  return tags
    .map(t => ({
      tag_id: t.tag_id,
      name: t.name,
      slug: t.slug,
      count: t._count.article_tag_link
    }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count);
}

export async function getArticleCategoriesWithCounts(placeSlug?: string, type?: string | string[]) {
  const where: any = {
    status: 'published'
  };

  if (placeSlug) {
    where.article_place = {
      some: {
        place: {
          slug: placeSlug
        }
      }
    };
    where.exclude_from_place_hubs = false;
  }

  if (type) {
    if (Array.isArray(type)) {
      where.article_type = { in: type };
    } else {
      where.article_type = type;
    }
  }

  // Fetch categories that have articles matching the criteria
  const categories = await prisma.article_category.findMany({
    where: {
      name: {
        notIn: ['News', 'Newsletter', 'Press Release'] // Filter out awkward redundant names
      },
      article: {
        some: where
      }
    },
    select: {
      category_id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          article: {
            where: where
          }
        }
      }
    }
  });

  return categories
    .map(c => ({
      ...c,
      count: c._count.article
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get articles for global hubs (not filtered by place, includes everything published)
 */
export async function getGlobalArticles(limit = 20, type?: string | string[]) {
  const where: any = {
    status: 'published'
  };

  if (type) {
    if (Array.isArray(type)) {
      where.article_type = { in: type };
    } else {
      where.article_type = type;
    }
  }

  return await prisma.article.findMany({
    where,
    orderBy: {
      published_at: 'desc'
    },
    take: limit,
    include: fullArticleInclude
  });
}

/**
 * Get the next and previous articles for a given article
 */
export async function getAdjacentArticles(article: FullArticle, placeSlug?: string) {
  const where: any = {
    status: 'published',
    article_type: article.article_type,
    article_id: { not: article.article_id }
  };

  if (placeSlug) {
    where.article_place = {
      some: {
        place: {
          slug: placeSlug
        }
      }
    };
    where.exclude_from_place_hubs = false;
  }

  const [prev, next] = await Promise.all([
    // Previous article (older)
    prisma.article.findFirst({
      where: {
        ...where,
        published_at: { lt: article.published_at || new Date() }
      },
      orderBy: { published_at: 'desc' },
      include: {
        article_category: true
      }
    }),
    // Next article (newer)
    prisma.article.findFirst({
      where: {
        ...where,
        published_at: { gt: article.published_at || new Date() }
      },
      orderBy: { published_at: 'asc' },
      include: {
        article_category: true
      }
    })
  ]);

  return { prev, next };
}

/**
 * Get comments for an article, including voting information for the current user
 */
export async function getArticleComments(articleId: string, userId?: string) {
  const comments = await prisma.article_comment.findMany({
    where: {
      article_id: articleId,
      status: "approved",
      parent_id: null, // Get top-level comments first
    },
    include: {
      User: {
        select: {
          name: true,
          display_name: true,
          image: true,
        },
      },
      other_article_comment: {
        where: { status: "approved" },
        include: {
          User: {
            select: {
              name: true,
              display_name: true,
              image: true,
            },
          },
          article_comment_vote: userId ? { where: { user_id: userId } } : false,
        },
      },
      article_comment_vote: userId ? { where: { user_id: userId } } : false,
    },
    orderBy: {
      score: "desc",
    },
  });

  // Map to include userVote status
  const formatComment = (c: any): any => ({
    ...c,
    userVote: c.article_comment_vote?.[0]?.vote_type || 0,
    replies: c.other_article_comment?.map((r: any) => formatComment(r)),
  });

  return comments.map(formatComment);
}

/**
 * Get total comment count for an article
 */
export async function getArticleCommentCount(articleId: string) {
  return await prisma.article_comment.count({
    where: {
      article_id: articleId,
      status: "approved",
    },
  });
}
