/**
 * Breadcrumb Schema Generator (Server-side)
 * 
 * Generates Schema.org BreadcrumbList structured data
 */

interface BreadcrumbPath {
  label: string;
  href: string;
}

/**
 * Generate BreadcrumbList schema for all paths
 */
export function generateBreadcrumbSchema(
  productTitle: string,
  primaryPath: BreadcrumbPath[],
  additionalPaths: BreadcrumbPath[][] = [],
  siteUrl: string = ''
) {
  // Primary breadcrumb schema
  const primarySchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl || "/"
      },
      ...primaryPath.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": crumb.label,
        "item": `${siteUrl}${crumb.href}`
      })),
      {
        "@type": "ListItem",
        "position": primaryPath.length + 2,
        "name": productTitle,
      }
    ]
  };

  // If there are additional paths, create an array of schemas
  if (additionalPaths.length > 0) {
    const allSchemas = [primarySchema];
    
    additionalPaths.forEach((path) => {
      allSchemas.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": siteUrl || "/"
          },
          ...path.map((crumb, index) => ({
            "@type": "ListItem",
            "position": index + 2,
            "name": crumb.label,
            "item": `${siteUrl}${crumb.href}`
          })),
          {
            "@type": "ListItem",
            "position": path.length + 2,
            "name": productTitle,
          }
        ]
      });
    });

    return allSchemas;
  }

  return primarySchema;
}



