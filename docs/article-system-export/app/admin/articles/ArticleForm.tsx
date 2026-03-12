"use client";

import React, { useMemo, useState, useTransition } from "react";
import { createArticleAction, updateArticleAction, publishSocialPostsAction } from "./actions";
import { Save, Eye, X, MapPin, Image, ImagePlus, Tag, Search, ExternalLink, Share2, Twitter, RefreshCw, CheckCircle, AlertCircle, Mail, Send, RotateCcw, User } from "lucide-react";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { FeaturedImageUpload } from "@/components/admin/FeaturedImageUpload";
import { DeleteArticleButton } from "./DeleteArticleButton";
import Link from "next/link";
import { getArticleUrl } from "@/lib/articles";

interface Category {
  category_id: string;
  name: string;
  slug: string;
}

interface Place {
  place_id: string;
  name: string;
  slug: string;
  type: string;
  parent_place_id?: string | null;
}

interface Region {
  place_id: string;
  name: string;
  slug: string;
}

interface SocialPost {
  postId: string;
  platform: string;
  content: string;
  imageUrl?: string;
  maxCharacters?: number;
  copiqPublishUrl: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'FAILED';
  platformPostId?: string;
  platformUrl?: string;
  publishedAt?: string;
  error?: string;
}

interface SocialPosts {
  [platform: string]: SocialPost;
}

interface AuthorOption {
  id: string;
  name: string | null;
  image: string | null;
}

interface Article {
  article_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  article_type: string;
  category_id: string | null;
  primary_category_id: string | null;
  status: string;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  exclude_from_place_hubs: boolean | null;
  author_id: string | null;
  copiq_social_posts?: SocialPosts | null;
  pr_contacts?: { emails?: string; sent_at?: string; sent_by?: string } | null;
  article_place: Array<{
    place_id: string;
    primary_place: boolean | null;
    place: {
      place_id: string;
      name: string;
      slug: string;
    };
  }>;
  article_category?: {
    slug: string;
    name: string;
  } | null;
}

interface Props {
  categories: Category[];
  places: Place[];
  regions?: Region[];
  regionPlaceMap?: Record<string, string[]>;
  article?: Article;
  authors?: AuthorOption[];
}

export default function ArticleForm({ categories, places, regions = [], regionPlaceMap = {}, article, authors = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState(article?.title || "");
  const [slug, setSlug] = useState(article?.slug || "");
  const [excerpt, setExcerpt] = useState(article?.excerpt || "");
  const [content, setContent] = useState(article?.content || "");
  const [articleType, setArticleType] = useState(article?.article_type || "news");
  const defaultAuthorId = article?.author_id || authors.find(a => a.name?.toLowerCase().includes('yorkshire team'))?.id || "";
  const [authorId, setAuthorId] = useState(defaultAuthorId);
  const [categoryId, setCategoryId] = useState(article?.primary_category_id || article?.category_id || "");
  const [status, setStatus] = useState(article?.status || "draft");
  const [featuredImageUrl, setFeaturedImageUrl] = useState(article?.featured_image_url || "");
  const [featuredImageAlt, setFeaturedImageAlt] = useState(article?.featured_image_alt || "");
  const [excludeFromPlaceHubs, setExcludeFromPlaceHubs] = useState(article?.exclude_from_place_hubs || false);
  const [metaTitle, setMetaTitle] = useState(article?.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(article?.meta_description || "");
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>(
    article?.article_place?.map(ap => ap.place_id) || []
  );
  const [primaryPlaceId, setPrimaryPlaceId] = useState<string>(
    article?.article_place?.find(ap => ap.primary_place)?.place_id || ""
  );
  const [placeSearch, setPlaceSearch] = useState("");
  const placeNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    places.forEach((place) => {
      const key = place.name.trim().toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [places]);

  const getPlaceLabel = (place: Place) => {
    const isDuplicateName = (placeNameCounts.get(place.name.trim().toLowerCase()) || 0) > 1;
    if (isDuplicateName) {
      return `${place.name} (${place.slug})`;
    }
    return place.name;
  };

  // PR contacts state
  const prContactsData = article?.pr_contacts as { emails?: string; sent_at?: string; sent_by?: string } | null;
  const [prEmails, setPrEmails] = useState(prContactsData?.emails || "");
  const [prSentAt, setPrSentAt] = useState<string | null>(prContactsData?.sent_at || null);

  // Social posts state
  const [socialPosts, setSocialPosts] = useState<SocialPosts>(
    (article?.copiq_social_posts as SocialPosts) || {}
  );
  const [socialPublishing, setSocialPublishing] = useState<Record<string, boolean>>({});
  const [socialResults, setSocialResults] = useState<Record<string, { success: boolean; message: string; url?: string }>>({});
  const [socialExcluded, setSocialExcluded] = useState<Record<string, boolean>>({});
  const [socialImagePicker, setSocialImagePicker] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("twitter");

  const hasSocialPosts = Object.keys(socialPosts).length > 0;

  const updateSocialPostContent = (platform: string, newContent: string) => {
    setSocialPosts(prev => ({
      ...prev,
      [platform]: { ...prev[platform], content: newContent }
    }));
  };

  const updateSocialPostImage = (platform: string, imageUrl: string | undefined) => {
    setSocialPosts(prev => ({
      ...prev,
      [platform]: { ...prev[platform], imageUrl }
    }));
  };

  const handleAddPlatform = () => {
    if (socialPosts[selectedPlatform]) {
      alert(`${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} post already exists!`);
      return;
    }
    
    const platformMaxChars: Record<string, number> = {
      twitter: 280,
      facebook: 63206,
      instagram: 2200,
      linkedin: 3000,
    };

    setSocialPosts(prev => ({
      ...prev,
      [selectedPlatform]: {
        postId: crypto.randomUUID(),
        platform: selectedPlatform.toUpperCase(),
        content: '',
        maxCharacters: platformMaxChars[selectedPlatform] || 280,
        copiqPublishUrl: '', // Empty for manual posts
      }
    }));
  };

  const handlePublishSocialPost = async (platform: string) => {
    if (!article) return;
    const post = socialPosts[platform];
    if (!post) return;

    setSocialPublishing(prev => ({ ...prev, [platform]: true }));
    setSocialResults(prev => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });

    try {
      const result = await publishSocialPostsAction(article.article_id, {
        [platform]: post
      });

      if (result.results?.[platform]) {
        const r = result.results[platform];
        if (r.success) {
          setSocialResults(prev => ({
            ...prev,
            [platform]: { success: true, message: 'Published successfully!', url: r.platformUrl }
          }));
          // Update local state with published status
          setSocialPosts(prev => ({
            ...prev,
            [platform]: {
              ...prev[platform],
              status: 'PUBLISHED',
              platformPostId: r.platformPostId,
              platformUrl: r.platformUrl,
              publishedAt: new Date().toISOString()
            }
          }));
        } else {
          setSocialResults(prev => ({
            ...prev,
            [platform]: { success: false, message: r.error || 'Publishing failed' }
          }));
        }
      }
    } catch (err: any) {
      setSocialResults(prev => ({
        ...prev,
        [platform]: { success: false, message: err.message || 'Unexpected error' }
      }));
    } finally {
      setSocialPublishing(prev => ({ ...prev, [platform]: false }));
    }
  };

  // Category to pillar mapping
  const categoryToPillar: Record<string, string[]> = {
    'news': ['Sport', 'Business', 'Weather', 'Traffic & Travel', 'Crime & Punishment', 'Politics', 'Rural', 'Community', 'Visitor Economy News'],
    'inspiration': ['Food & Drink', 'Arts & Culture', 'Features', 'Seasonal', 'Outdoors', 'Shopping', 'Gardens'],
    'history': ['Heritage', 'Genealogy', 'Churches', 'Industrial', 'Archaeology', 'Domesday Book'],
    'guide': ['Tourist Questions', 'Visiting', 'Accessibility', 'Transport'],
    'route': [] // Routes typically don't use categories
  };

  // Filter categories based on article type
  const filteredCategories = React.useMemo(() => {
    if (!articleType || articleType === 'review') {
      // Show all categories for legacy review type
      return categories;
    }
    
    const allowedCategoryNames = categoryToPillar[articleType] || [];
    return categories.filter(cat => allowedCategoryNames.includes(cat.name));
  }, [articleType, categories]);

  // Auto-generate slug from title
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!article) { // Only auto-generate for new articles
      const autoSlug = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent, publishNow?: boolean) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("slug", slug);
    formData.append("excerpt", excerpt);
    formData.append("content", content);
    formData.append("article_type", articleType);
    formData.append("category_id", categoryId);
    formData.append("status", publishNow ? "published" : status);
    formData.append("featured_image_url", featuredImageUrl);
    formData.append("featured_image_alt", featuredImageAlt);
    formData.append("meta_title", metaTitle);
    formData.append("meta_description", metaDescription);
    if (authorId) {
      formData.append("author_id", authorId);
    }
    if (excludeFromPlaceHubs) {
      formData.append("exclude_from_place_hubs", "on");
    }
    if (primaryPlaceId) {
      formData.append("primary_place_id", primaryPlaceId);
    }
    selectedPlaceIds.forEach(id => formData.append("place_ids", id));
    // Include social posts (editors may have edited the content)
    if (hasSocialPosts) {
      formData.append("copiq_social_posts", JSON.stringify(socialPosts));
    }
    // Include PR contacts
    if (prEmails.trim()) {
      formData.append("pr_contacts", JSON.stringify({
        emails: prEmails.trim(),
        sent_at: prSentAt,
      }));
    }

    startTransition(async () => {
      try {
        const result = article
          ? await updateArticleAction(article.article_id, formData)
          : await createArticleAction(formData);

        if (result.success) {
          setSuccess(true);
          // Update status state if we published
          if (publishNow) {
            setStatus("published");
          }
          // Publish social posts when publishing (non-blocking)
          const resolvedArticleId: string | null = article?.article_id || ('articleId' in result && typeof result.articleId === 'string' ? result.articleId : null);
          if (publishNow && hasSocialPosts && resolvedArticleId) {
            const postsToPublish = Object.fromEntries(
              Object.entries(socialPosts).filter(([platform]) => !socialExcluded[platform])
            );
            if (Object.keys(postsToPublish).length > 0) {
            // Fire-and-forget: publish social posts without blocking
            publishSocialPostsAction(resolvedArticleId, postsToPublish).then(socialResult => {
              if (socialResult.results) {
                for (const [platform, r] of Object.entries(socialResult.results)) {
                  if (r.success) {
                    setSocialResults(prev => ({
                      ...prev,
                      [platform]: { success: true, message: 'Published successfully!', url: r.platformUrl }
                    }));
                    setSocialPosts(prev => ({
                      ...prev,
                      [platform]: {
                        ...prev[platform],
                        status: 'PUBLISHED',
                        platformPostId: r.platformPostId,
                        platformUrl: r.platformUrl,
                        publishedAt: new Date().toISOString()
                      }
                    }));
                  } else {
                    setSocialResults(prev => ({
                      ...prev,
                      [platform]: { success: false, message: r.error || 'Publishing failed — use retry' }
                    }));
                  }
                }
              }
            }).catch(() => {
              // Social publish failure is non-blocking
            });
            }
          }
          if (!article && 'articleId' in result && result.articleId) {
            // Redirect to edit page after creating
            router.push(`/admin/articles/${result.articleId}/edit`);
          } else {
            // Refresh the page
            router.refresh();
          }
        } else {
          setError(result.error || "Failed to save article");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
      }
    });
  };

  const handlePlaceToggle = (placeId: string) => {
    setSelectedPlaceIds(prev => {
      if (prev.includes(placeId)) {
        // Remove place
        const newSelected = prev.filter(id => id !== placeId);
        // If removed place was primary, clear primary
        if (primaryPlaceId === placeId) {
          setPrimaryPlaceId("");
        }
        return newSelected;
      } else {
        // Add place
        const newSelected = [...prev, placeId];
        // If it's the first place, make it primary
        if (newSelected.length === 1) {
          setPrimaryPlaceId(placeId);
        }
        return newSelected;
      }
    });
  };

  const getPlaceIdsInRegion = (regionId: string) => {
    // Combine parent_place_id (single parent) with place_association (multi-parent)
    const fromParent = places.filter(p => p.parent_place_id === regionId).map(p => p.place_id);
    const fromAssociation = regionPlaceMap[regionId] || [];
    // Deduplicate
    return Array.from(new Set([...fromParent, ...fromAssociation]));
  };

  const handleSelectRegion = (regionId: string) => {
    const placeIdsInRegion = getPlaceIdsInRegion(regionId);
    
    // Check if all are already selected
    const allSelected = placeIdsInRegion.every(id => selectedPlaceIds.includes(id));
    
    if (allSelected) {
      // Deselect all in region
      setSelectedPlaceIds(prev => prev.filter(id => !placeIdsInRegion.includes(id)));
      // Clear primary if it was in this region
      if (placeIdsInRegion.includes(primaryPlaceId)) {
        setPrimaryPlaceId("");
      }
    } else {
      // Select all in region (add ones not already selected)
      setSelectedPlaceIds(prev => {
        const newIds = placeIdsInRegion.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
    }
  };

  const getRegionSelectionCount = (regionId: string) => {
    const placeIdsInRegion = getPlaceIdsInRegion(regionId);
    const selected = placeIdsInRegion.filter(id => selectedPlaceIds.includes(id));
    return { selected: selected.length, total: placeIdsInRegion.length };
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl font-medium">
          ✓ Article saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              placeholder="Enter article title..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink"
            />
          </div>

          {/* Slug */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">URL Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              placeholder="url-friendly-slug"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-2">Auto-generated from title for new articles</p>
          </div>

          {/* Excerpt */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              placeholder="Brief summary (shown in listings)..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink"
            />
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Content *</label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Write your article content here..."
            />
            <p className="text-xs text-gray-400 mt-2">
              Rich text editor with formatting. Stored as HTML.
            </p>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Publish Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400">Publish</h3>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl font-bold hover:bg-gray-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isPending ? "Saving..." : (status === "published" ? "Update & Publish" : "Save Draft")}
              </button>
              
              {status === "draft" && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={isPending}
                  className="w-full bg-yorkshire-pink text-white px-4 py-3 rounded-xl font-bold hover:bg-pink-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {isPending ? "Publishing..." : "Publish Now"}
                </button>
              )}
              
              {article && (
                <>
                  <Link
                    href={`/admin/articles/${article.article_id}/preview`}
                    target="_blank"
                    className="w-full bg-gray-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </Link>

                  {(article.status === 'published' || article.status === 'publish') && (
                    <Link
                      href={getArticleUrl(article)}
                      target="_blank"
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Live
                    </Link>
                  )}
                  
                  <DeleteArticleButton
                    articleId={article.article_id}
                    articleTitle={article.title}
                    variant="button"
                    redirectAfterDelete={true}
                  />
                </>
              )}
            </div>
          </div>

          {/* Social Posts */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Social Posts
            </h3>
            <p className="text-xs text-gray-500">
              {hasSocialPosts 
                ? "Edit content below, then publish with the article or individually." 
                : "Add social posts to publish to your connected platforms."}
            </p>

            {Object.entries(socialPosts).map(([platform, post]) => {
                const platformLabel = platform === 'twitter' ? 'X.com' : platform.charAt(0).toUpperCase() + platform.slice(1);
                const platformIcon = platform === 'twitter' ? <Twitter className="w-4 h-4" /> : <Share2 className="w-4 h-4" />;
                const charCount = post.content?.length || 0;
                const maxChars = post.maxCharacters || 280;
                const isOverLimit = charCount > maxChars;
                const isPublished = post.status === 'PUBLISHED';
                const isPublishing = socialPublishing[platform];
                const isExcluded = socialExcluded[platform] || false;
                const result = socialResults[platform];

                return (
                  <div key={platform} className={`space-y-2 pt-3 border-t border-gray-100 first:border-0 first:pt-0 ${isExcluded && !isPublished ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        {!isPublished && (
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => setSocialExcluded(prev => ({ ...prev, [platform]: !prev[platform] }))}
                            className="w-4 h-4 rounded border-gray-300 text-yorkshire-pink focus:ring-yorkshire-pink"
                            title={isExcluded ? `Include ${platformLabel} on publish` : `Exclude ${platformLabel} from publish`}
                          />
                        )}
                        {platformIcon}
                        {platformLabel} Post
                        {isExcluded && !isPublished && (
                          <span className="text-xs font-medium text-gray-400">(excluded)</span>
                        )}
                      </label>
                      {isPublished && post.platformUrl && (
                        <a
                          href={post.platformUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Published
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Image thumbnail with add/change/remove */}
                    {post.imageUrl ? (
                      <div className="bg-gray-50 rounded-lg p-2 relative group">
                        <img
                          src={post.imageUrl}
                          alt="Social post image"
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        {!isPublished && (
                          <div className="absolute inset-2 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setSocialImagePicker(platform)}
                              className="px-2 py-1 bg-white text-gray-800 rounded text-xs font-bold hover:bg-gray-100"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSocialPostImage(platform, undefined)}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ) : !isPublished ? (
                      <button
                        type="button"
                        onClick={() => setSocialImagePicker(platform)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        Add Image
                      </button>
                    ) : null}

                    {/* Editable content */}
                    <div className="relative">
                      <textarea
                        value={post.content || ''}
                        onChange={(e) => updateSocialPostContent(platform, e.target.value)}
                        rows={4}
                        disabled={isPublished}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yorkshire-pink resize-none ${
                          isPublished ? 'bg-gray-50 text-gray-500 border-gray-200' : 'border-gray-200'
                        } ${isOverLimit ? 'border-red-300 focus:ring-red-400' : ''}`}
                      />
                      <div className={`text-xs text-right mt-1 font-medium ${
                        isOverLimit ? 'text-red-500' : charCount > maxChars * 0.9 ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        {charCount}/{maxChars}
                      </div>
                    </div>

                    {/* Result messages */}
                    {result && (
                      <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
                        result.success
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {result.success ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {result.message}
                        {result.url && (
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="ml-auto underline">
                            View
                          </a>
                        )}
                      </div>
                    )}

                    {/* Manual publish / retry button */}
                    {!isPublished && (
                      <button
                        type="button"
                        onClick={() => handlePublishSocialPost(platform)}
                        disabled={isPublishing || isOverLimit}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        {isPublishing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            {platformIcon}
                            {result?.success === false ? 'Retry' : `Publish to ${platformLabel}`}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
            })}

            {/* Add Platform */}
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                Add Platform
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yorkshire-pink"
                >
                  <option value="twitter">Twitter / X</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddPlatform}
                  className="px-4 py-2 bg-yorkshire-pink text-white rounded-lg text-sm font-bold hover:bg-pink-700 transition-colors flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Media library picker for social post images */}
            <MediaLibraryPicker
              isOpen={socialImagePicker !== null}
              onClose={() => setSocialImagePicker(null)}
              onSelect={(image) => {
                if (socialImagePicker) {
                  updateSocialPostImage(socialImagePicker, image.url);
                }
                setSocialImagePicker(null);
              }}
              title="Choose Image for Social Post"
            />
          </div>

          {/* Article Type & Category */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Classification
            </h3>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
              <select
                value={articleType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setArticleType(newType);
                  // Clear category if it's not valid for the new type
                  if (categoryId) {
                    const currentCategory = categories.find(c => c.category_id === categoryId);
                    const allowedCategories = categoryToPillar[newType] || [];
                    if (currentCategory && !allowedCategories.includes(currentCategory.name) && newType !== 'review') {
                      setCategoryId('');
                    }
                  }
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink"
              >
                <option value="">Select article type...</option>
                <optgroup label="4-Pillar System">
                  <option value="news">News</option>
                  <option value="inspiration">Inspiration</option>
                  <option value="history">History</option>
                  <option value="guide">Guide</option>
                  <option value="route">Route (GPX Walk/Cycle)</option>
                </optgroup>
                <optgroup label="Legacy (Deprecated)">
                  <option value="review">Review (deprecated)</option>
                </optgroup>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Use the 4-pillar system for new articles. Legacy types are for existing content only.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink"
              >
                <option value="">Select category...</option>
                {filteredCategories.length === 0 && articleType ? (
                  <option disabled>No categories available for {articleType}</option>
                ) : (
                  filteredCategories.map(cat => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
              {filteredCategories.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Showing {filteredCategories.length} {articleType ? `${articleType}-related` : ''} categories
                </p>
              )}
            </div>
          </div>

          {/* Author */}
          {authors.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Author
              </h3>
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink"
              >
                <option value="">No author</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Featured Image */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Featured Image
            </h3>
            
            <FeaturedImageUpload
              currentImageUrl={featuredImageUrl}
              currentAltText={featuredImageAlt}
              onImageChange={(data) => {
                setFeaturedImageUrl(data.url);
                setFeaturedImageAlt(data.altText);
              }}
            />
          </div>

          {/* SEO Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Search className="w-4 h-4" />
              SEO Settings
            </h3>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                SEO Title
                <span className="font-normal text-gray-400 ml-1">({metaTitle.length}/60)</span>
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={title || "Defaults to article title"}
                maxLength={70}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Custom title for search engines (50-60 chars ideal)</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                SEO Description
                <span className="font-normal text-gray-400 ml-1">({metaDescription.length}/160)</span>
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder={excerpt || "Defaults to excerpt"}
                maxLength={170}
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Custom description for search results (150-160 chars ideal)</p>
            </div>
          </div>

          {/* PR Contacts */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              PR Contacts
            </h3>
            <p className="text-xs text-gray-500">
              Email addresses to notify when this article is published. Comma-separated.
            </p>

            <div>
              <input
                type="text"
                value={prEmails}
                onChange={(e) => {
                  setPrEmails(e.target.value);
                  // If emails changed after a send, clear sent_at so it re-sends
                  if (prSentAt && e.target.value.trim() !== prContactsData?.emails) {
                    setPrSentAt(null);
                  }
                }}
                placeholder="pr@agency.com, journalist@paper.co.uk"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink text-sm"
              />
            </div>

            {prSentAt ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Sent on {new Date(prSentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPrSentAt(null)}
                  className="flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Send Again
                </button>
              </div>
            ) : prEmails.trim() ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm">
                <Send className="w-4 h-4" />
                <span>Will be sent automatically when article is published</span>
              </div>
            ) : null}
          </div>

          {/* Places */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Places ({selectedPlaceIds.length})
            </h3>

            {/* Region Quick Select */}
            {regions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Quick select by region:</p>
                <div className="flex flex-wrap gap-2">
                  {regions.map(region => {
                    const { selected, total } = getRegionSelectionCount(region.place_id);
                    const allSelected = selected === total && total > 0;
                    const someSelected = selected > 0 && selected < total;
                    
                    return (
                      <button
                        key={region.place_id}
                        type="button"
                        onClick={() => handleSelectRegion(region.place_id)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                          allSelected
                            ? 'bg-yorkshire-pink text-white'
                            : someSelected
                              ? 'bg-yorkshire-pink/20 text-yorkshire-pink border border-yorkshire-pink'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={`${selected}/${total} places selected`}
                      >
                        {region.name}
                        {total > 0 && (
                          <span className="ml-1 opacity-70">({selected}/{total})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search places... (e.g., Lee...)"
                value={placeSearch}
                onChange={(e) => setPlaceSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yorkshire-pink/20"
              />
              {placeSearch && (
                <button
                  type="button"
                  onClick={() => setPlaceSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {places
                .filter(place => 
                  place.name.toLowerCase().includes(placeSearch.toLowerCase()) ||
                  place.slug.toLowerCase().includes(placeSearch.toLowerCase())
                )
                .map(place => {
                const isSelected = selectedPlaceIds.includes(place.place_id);
                const isPrimary = primaryPlaceId === place.place_id;
                
                return (
                  <div key={place.place_id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePlaceToggle(place.place_id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">{getPlaceLabel(place)}</span>
                      <span className="text-xs text-gray-400 uppercase">{place.type}</span>
                    </label>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={() => setPrimaryPlaceId(place.place_id)}
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          isPrimary
                            ? 'bg-yorkshire-pink text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {isPrimary ? '★ Primary' : 'Set Primary'}
                      </button>
                    )}
                  </div>
                );
              })}
              {placeSearch && places.filter(place => 
                place.name.toLowerCase().includes(placeSearch.toLowerCase()) ||
                place.slug.toLowerCase().includes(placeSearch.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No places found matching "{placeSearch}"
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm pt-4 border-t border-gray-100">
              <input
                type="checkbox"
                checked={excludeFromPlaceHubs}
                onChange={(e) => setExcludeFromPlaceHubs(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="font-medium">Exclude from place hubs</span>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
