# Article System + Copiq Integration - Export for Reuse

This package contains a complete article/blog editing system with Copiq API integration, extracted from [Yorkshire.com](https://www.yorkshire.com). Use this to build the same system on another site with your own categories, locations, and taxonomy.

## Overview

This system provides:

1. **Article Editor** - Rich text editor with media library, featured images, galleries, CTAs, and link insertion
2. **Article Management** - Create, edit, preview, publish, and delete articles
3. **Copiq Integration** - API endpoints for Copiq to push articles, update content, and manage social posts
4. **Social Publishing** - Publish articles to social media via Copiq
5. **Category & Place Taxonomy** - Hierarchical categories and location linking (adapt to your site)

## File Structure

```
article-system-export/
├── README.md                          # This file
├── app/
│   ├── admin/
│   │   ├── articles/                  # Article admin pages
│   │   │   ├── page.tsx               # Article list with search
│   │   │   ├── [id]/
│   │   │   │   ├── edit/page.tsx      # Edit article page
│   │   │   │   └── preview/page.tsx   # Article preview
│   │   │   ├── new/page.tsx           # Create new article
│   │   │   ├── uncategorized/page.tsx # Uncategorized articles
│   │   │   ├── ArticleForm.tsx        # Main article form component
│   │   │   ├── ArticleSearchForm.tsx  # Search/filter component
│   │   │   ├── DeleteArticleButton.tsx
│   │   │   └── actions.ts             # Server actions (create, update, delete)
│   │   └── authors/                   # Optional: Author management
│   │       ├── page.tsx
│   │       └── [id]/edit/
│   │           ├── page.tsx
│   │           └── AuthorEditForm.tsx
│   └── api/
│       ├── admin/
│       │   ├── articles/
│       │   │   ├── [id]/category/route.ts
│       │   │   └── uncategorized/route.ts
│       │   └── upload-featured-image/route.ts
│       ├── copiq/                     # Copiq integration endpoints
│       │   ├── posts/route.ts          # POST/GET - Create/update articles
│       │   ├── posts/[id]/route.ts     # GET/DELETE - Get/delete by ID
│       │   ├── search/route.ts         # GET - Search articles/entities
│       │   ├── places/route.ts         # GET - Search places
│       │   ├── deals/route.ts          # GET - Search deals
│       │   └── test/route.ts           # GET - Test endpoint
│       └── upload/
│           ├── image/route.ts          # POST - Upload images to S3
│           └── document/route.ts       # POST - Upload documents
├── components/
│   └── admin/                         # Shared admin components
│       ├── RichTextEditor.tsx         # TipTap-based rich text editor
│       ├── MediaLibraryPicker.tsx     # Image selection from media library
│       ├── FeaturedImageUpload.tsx    # Featured image upload component
│       ├── LinkModal.tsx              # Link insertion modal
│       ├── LinkSearchModal.tsx        # Search for internal links
│       ├── ImageEditModal.tsx         # Image editing (alt, caption)
│       ├── GalleryEditModal.tsx       # Gallery creation/editing
│       ├── CTAPickerModal.tsx         # CTA button insertion
│       └── tiptap/                    # TipTap extensions
│           ├── FigureImage.tsx        # Figure with caption extension
│           ├── ArticleGallery.tsx     # Gallery extension
│           └── CTAButton.tsx          # CTA button extension
├── lib/
│   ├── articles.ts                    # Article helpers (getArticleUrl - REPLACE THIS)
│   ├── copiq-articles.ts              # Copiq article handler (save, delete)
│   ├── copiq-auth.ts                  # Copiq API key verification
│   └── s3/
│       └── storage.ts                 # S3 upload utilities
├── prisma/
│   └── article-models.prisma          # Prisma models (copy into your schema)
├── migrations/                        # Database migrations
│   ├── 031_article_system.sql
│   ├── 033_article_editorial_control.sql (if available)
│   ├── 034_increase_article_field_lengths.sql (if available)
│   ├── 035_article_primary_category.sql (if available)
│   ├── 045_add_copiq_integration.sql
│   └── 1004_add_pr_contacts_to_article.sql (if available)
└── copiq-docs/
    ├── COPIQ_API_INTEGRATION.md         # Full Copiq API documentation
    └── COPIQ_DEALS_ENDPOINT_HANDOVER.md (if available)
```

## Dependencies

### Required Packages

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-text-align @tiptap/extension-youtube
npm install lucide-react
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install sharp
npm install openai
npm install @prisma/client
```

### Database

- PostgreSQL 14+
- Prisma ORM

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# AWS S3 (for image uploads)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=eu-west-2
AWS_S3_BUCKET_NAME=your-bucket

# Copiq Integration
COPIQ_API_KEY=your_copiq_api_key
COPIQ_BASE_URL=https://copiq.yourservice.com  # For social publishing

# OpenAI (for AI alt text generation)
OPENAI_API_KEY=your_openai_key

# Auth (adapt to your auth system)
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

## Setup Instructions

### Step 1: Install Dependencies

Install all required packages listed above.

### Step 2: Apply Database Schema

1. Copy the models from `prisma/article-models.prisma` into your `schema.prisma`
2. **IMPORTANT**: Adapt the following to your existing schema:
   - `User` model - Add `authored_articles` relation if not present
   - `place` model - Adapt to your location taxonomy or remove `article_place` relation
   - `entity` model - Optional: Add `article_entity` relation for business linking
3. Run migrations:
   ```bash
   npx prisma migrate dev
   ```
   Or apply the SQL files in `migrations/` in order.

### Step 3: Copy Files

Copy the files into your project structure:

```bash
# Copy admin pages
cp -r app/admin/articles your-project/src/app/admin/
cp -r app/admin/authors your-project/src/app/admin/  # Optional

# Copy API routes
cp -r app/api/copiq your-project/src/app/api/
cp -r app/api/admin/articles your-project/src/app/api/admin/
cp -r app/api/admin/upload-featured-image your-project/src/app/api/admin/
cp -r app/api/upload your-project/src/app/api/

# Copy components
cp -r components/admin your-project/src/components/

# Copy lib files
cp lib/articles.ts your-project/src/lib/
cp lib/copiq-articles.ts your-project/src/lib/
cp lib/copiq-auth.ts your-project/src/lib/
cp -r lib/s3 your-project/src/lib/
```

### Step 4: Update Imports

Update import paths in copied files:

- Change `@/lib/prisma` to your prisma import
- Change `@/auth` to your auth import
- Change `@/components/...` to your components path
- Change `@/lib/...` to your lib path

### Step 5: Replace Site-Specific Code

#### 1. Replace `getArticleUrl()` in `lib/articles.ts`

This function builds URLs for articles. Replace with your site's URL structure:

```typescript
// REPLACE THIS with your URL builder
export function getArticleUrl(article: Article): string {
  // Your URL structure here
  // Example: /blog/{category}/{slug}
  return `/blog/${article.article_category?.slug}/${article.slug}`;
}
```

#### 2. Update Category/Place Sources

In `app/admin/articles/[id]/edit/page.tsx` and `new/page.tsx`:

- Update category queries to match your taxonomy
- Update place queries to match your location system (or remove place support)

#### 3. Update Article Types

Article types are site-specific. Common types:
- `news` - News articles
- `blog` - Blog posts
- `guide` - Guides/how-tos
- `inspiration` - Inspirational content
- `walk` - Walking routes (with walk_details)

Update in `ArticleForm.tsx` and your category taxonomy.

### Step 6: Add Admin Navigation

Add to your admin layout navigation:

```typescript
{ name: "Articles", href: "/admin/articles", icon: FileText },
{ name: "Authors", href: "/admin/authors", icon: User },  // Optional
```

### Step 7: Configure Auth Protection

Ensure your admin routes are protected. The system expects:

- `ADMIN` or `EDITOR` role for article editing
- Authentication via your auth system (NextAuth, etc.)

Update `app/admin/layout.tsx` or your auth middleware.

## Architecture

### Data Flow

```mermaid
flowchart LR
    subgraph Editor["Article Editor"]
        AF[ArticleForm]
        RTE[RichTextEditor]
        FIU[FeaturedImageUpload]
    end
    
    subgraph Server["Server Actions"]
        CAA[createArticleAction]
        UAA[updateArticleAction]
        PSP[publishSocialPostsAction]
    end
    
    subgraph Copiq["Copiq API"]
        CP[POST /api/copiq/posts]
        CG[GET /api/copiq/posts/[id]]
        CS[saveCopiqArticle]
    end
    
    subgraph DB[(Database)]
        A[article]
        AC[article_category]
        AP[article_place]
    end
    
    AF --> RTE
    AF --> FIU
    AF --> CAA
    AF --> UAA
    AF --> PSP
    CP --> CS
    CS --> CAA
    CS --> UAA
    CAA --> DB
    UAA --> DB
```

### Key Components

#### ArticleForm.tsx

Main article editing form with:
- Title, slug, excerpt fields
- Rich text editor (TipTap)
- Featured image upload
- Category selection
- Place/location selection (optional)
- Author selection
- SEO meta fields
- Social posts (from Copiq)
- PR contacts
- Status (draft/published)

#### RichTextEditor.tsx

TipTap-based editor with:
- Bold, italic, lists, headings
- Link insertion (internal/external)
- Image insertion (upload or media library)
- Gallery creation
- CTA buttons
- YouTube embeds
- Text alignment

#### Copiq Integration

**Inbound (Copiq → Your Site):**
- `POST /api/copiq/posts` - Create/update article
- `DELETE /api/copiq/posts/[id]` - Delete article
- Article images downloaded from Copiq S3, uploaded to your S3
- AI alt text generation for images

**Outbound (Your Site → Copiq):**
- `publishSocialPostsAction` - Publishes social posts to Copiq
- Copiq then posts to Twitter/X, Facebook, Instagram, LinkedIn

## Copiq API Endpoints

Your site exposes these endpoints for Copiq:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/copiq/posts` | POST | Create or update article |
| `/api/copiq/posts` | GET | List articles |
| `/api/copiq/posts/[id]` | GET | Get article by ID |
| `/api/copiq/posts/[id]` | DELETE | Delete article |
| `/api/copiq/search` | GET | Search articles, entities, places |
| `/api/copiq/places` | GET | Search places |
| `/api/copiq/deals` | GET | Search deals |

**Authentication:** Bearer token with `COPIQ_API_KEY`

See `copiq-docs/COPIQ_API_INTEGRATION.md` for full API specification.

## Optional Features

### Image Usage Tracking

The system can track which images are used in which articles. This requires:
- `entity_image` table for image storage
- `image_usage` junction table

To disable: Remove `trackImageUsage()` calls from `actions.ts`

### PR Notification Emails

When publishing with `pr_contacts`, emails are sent to PR contacts.

To disable: Remove `sendPrNotificationEmails()` calls from `actions.ts`

### Walk Details

For walking/hiking articles, include the `article_walk_details` model and related UI components.

### Authors

Authors are managed via:
- `User.is_author` flag
- `article.author_id` relationship
- `author_name`, `author_bio`, `author_image_url` fields for byline overrides

## Customization Guide

### Adding New Article Types

1. Update the article type dropdown in `ArticleForm.tsx`
2. Add type-specific handling in `getArticleUrl()` if needed
3. Update category taxonomy to support new types

### Customizing the Rich Text Editor

Edit `RichTextEditor.tsx` to add/remove TipTap extensions:

```typescript
const editor = useEditor({
  extensions: [
    StarterKit,
    Link,
    // Add your extensions here
  ],
});
```

### Changing Category/Place Selection

In `ArticleForm.tsx`, update the category and place selection UI:

```typescript
// Replace with your taxonomy
const categories = await prisma.your_category.findMany();
const locations = await prisma.your_location.findMany();
```

### Customizing S3 Uploads

Edit `lib/s3/storage.ts` to change:
- Bucket configuration
- File naming conventions
- Folder structure

## Troubleshooting

### Images not uploading

- Check AWS credentials
- Verify S3 bucket CORS settings
- Check `AWS_S3_BUCKET_NAME` env var

### Copiq integration not working

- Verify `COPIQ_API_KEY` matches Copiq's key
- Check API endpoint URLs in Copiq dashboard
- Review server logs for auth failures

### Database errors

- Ensure all migrations applied
- Check foreign key constraints (article_category, article_place)
- Verify `place` and `User` models exist

### Rich text editor not loading

- Verify TipTap packages installed
- Check for CSS conflicts
- Ensure `immediatelyRender: false` in editor config

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret |
| `AWS_REGION` | Yes | AWS region (e.g., eu-west-2) |
| `AWS_S3_BUCKET_NAME` | Yes | S3 bucket for uploads |
| `COPIQ_API_KEY` | For Copiq | API key for Copiq authentication |
| `COPIQ_BASE_URL` | For social | Copiq base URL for social publishing |
| `OPENAI_API_KEY` | For AI alt | OpenAI key for alt text generation |

## Next Steps

1. **Test article creation** - Create a test article in the admin
2. **Test Copiq ingestion** - Send a test POST to `/api/copiq/posts`
3. **Test social publishing** - Configure Copiq and test social posts
4. **Customize UI** - Adapt styling to match your site
5. **Add public article routes** - Build public-facing article pages

## Support

For issues with:
- **This export package**: Refer to the original Yorkshire.com codebase
- **Copiq integration**: See `copiq-docs/COPIQ_API_INTEGRATION.md`
- **TipTap editor**: [TipTap documentation](https://tiptap.dev)
- **Prisma**: [Prisma documentation](https://prisma.io)

## License

This is an internal export from Yorkshire.com. Adapt and use according to your organization's policies.
