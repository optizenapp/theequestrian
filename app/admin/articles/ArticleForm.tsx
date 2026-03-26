'use client';

import React, { useState, useTransition } from 'react';
import { createArticleAction, updateArticleAction } from './actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DeleteArticleButton } from './DeleteArticleButton';
import { getArticleUrl } from '@/lib/articles';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

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

interface Article {
  article_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  article_type: string;
  primary_category_id: string | null;
  status: string;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  headless_cta_path?: string | null;
  headless_cta_label?: string | null;
  headless_related_handles?: string | null;
  exclude_from_place_hubs: boolean | null;
  article_place: Array<{ place_id: string; primary_place: boolean | null; place: { name: string; slug: string } }>;
  article_category?: { slug: string; name: string } | null;
}

interface Props {
  categories: Category[];
  places: Place[];
  regions?: Place[];
  regionPlaceMap?: Record<string, string[]>;
  article?: Article;
  authors?: { id: string; name: string | null; image: string | null }[];
}

export default function ArticleForm({
  categories,
  places,
  regions = [],
  regionPlaceMap = {},
  article,
  authors = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState(article?.title ?? '');
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [content, setContent] = useState(article?.content ?? '');
  const [articleType, setArticleType] = useState(article?.article_type ?? 'news');
  const [categoryId, setCategoryId] = useState(article?.primary_category_id ?? '');
  const [status, setStatus] = useState(article?.status ?? 'draft');
  const [featuredImageUrl, setFeaturedImageUrl] = useState(article?.featured_image_url ?? '');
  const [featuredImageAlt, setFeaturedImageAlt] = useState(article?.featured_image_alt ?? '');
  const [metaTitle, setMetaTitle] = useState(article?.meta_title ?? '');
  const [metaDescription, setMetaDescription] = useState(article?.meta_description ?? '');
  const [headlessCtaPath, setHeadlessCtaPath] = useState(article?.headless_cta_path ?? '');
  const [headlessCtaLabel, setHeadlessCtaLabel] = useState(article?.headless_cta_label ?? '');
  const [headlessRelatedHandles, setHeadlessRelatedHandles] = useState(
    article?.headless_related_handles ?? ''
  );
  const [excludeFromPlaceHubs, setExcludeFromPlaceHubs] = useState(article?.exclude_from_place_hubs ?? false);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>(
    article?.article_place?.map((ap) => ap.place_id) ?? []
  );
  const [primaryPlaceId, setPrimaryPlaceId] = useState(
    article?.article_place?.find((ap) => ap.primary_place)?.place_id ?? ''
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!article) {
      const autoSlug = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  const handleSubmit = (e: React.FormEvent, publishNow?: boolean) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('slug', slug);
    formData.append('excerpt', excerpt);
    formData.append('content', content);
    formData.append('article_type', articleType);
    formData.append('category_id', categoryId);
    formData.append('status', publishNow ? 'published' : status);
    formData.append('featured_image_url', featuredImageUrl);
    formData.append('featured_image_alt', featuredImageAlt);
    formData.append('meta_title', metaTitle);
    formData.append('meta_description', metaDescription);
    formData.append('headless_cta_path', headlessCtaPath);
    formData.append('headless_cta_label', headlessCtaLabel);
    formData.append('headless_related_handles', headlessRelatedHandles);
    if (excludeFromPlaceHubs) formData.append('exclude_from_place_hubs', 'on');
    if (primaryPlaceId) formData.append('primary_place_id', primaryPlaceId);
    selectedPlaceIds.forEach((id) => formData.append('place_ids', id));

    startTransition(async () => {
      const result = article
        ? await updateArticleAction(article.article_id, formData)
        : await createArticleAction(formData);
      if (result.success) {
        setSuccess(true);
        if (publishNow) setStatus('published');
        if (!article && 'articleId' in result && result.articleId) {
          router.push(`/admin/articles/${result.articleId}/edit`);
        } else {
          router.refresh();
        }
      } else {
        setError(result.error ?? 'Failed to save');
      }
    });
  };

  const togglePlace = (placeId: string) => {
    setSelectedPlaceIds((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
  };

  return (
    <div className="space-y-8">
      {article && (
        <div className="flex items-center justify-between">
          <Link
            href="/admin/articles"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-action"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Articles
          </Link>
          <a
            href={getArticleUrl(article)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-action hover:underline"
          >
            View article →
          </a>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-8">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Article saved.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
              required
            />
            <p className="text-xs text-gray-500 mt-1">URL: /news/{slug || '...'}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <RichTextEditor
            key={article?.article_id ?? 'new'}
            content={content}
            onChange={setContent}
            placeholder="Write your article content…"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Article type</label>
            <select
              value={articleType}
              onChange={(e) => setArticleType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
            >
              <option value="news">News</option>
              <option value="blog">Blog</option>
              <option value="guide">Guide</option>
              <option value="inspiration">Inspiration</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
            >
              <option value="">— Select —</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Featured image URL</label>
            <input
              type="url"
              value={featuredImageUrl}
              onChange={(e) => setFeaturedImageUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Featured image alt</label>
            <input
              type="text"
              value={featuredImageAlt}
              onChange={(e) => setFeaturedImageAlt(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta title</label>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta description</label>
            <input
              type="text"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Shop CTA &amp; related products (headless)
          </h3>
          <p className="text-xs text-gray-600">
            Shown on the public /news article: sticky CTA, sidebar button, and optional product grid.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA path</label>
              <input
                type="text"
                value={headlessCtaPath}
                onChange={(e) => setHeadlessCtaPath(e.target.value)}
                placeholder="/rider/helmets"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA label</label>
              <input
                type="text"
                value={headlessCtaLabel}
                onChange={(e) => setHeadlessCtaLabel(e.target.value)}
                placeholder="Shop riding helmets"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Related product handles
              </label>
              <input
                type="text"
                value={headlessRelatedHandles}
                onChange={(e) => setHeadlessRelatedHandles(e.target.value)}
                placeholder="handle-one, handle-two"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-action/30"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={excludeFromPlaceHubs}
              onChange={(e) => setExcludeFromPlaceHubs(e.target.checked)}
              className="rounded border-gray-300 text-action"
            />
            <span className="text-sm font-medium text-gray-700">Exclude from place hubs</span>
          </label>
        </div>

        {places.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Places</label>
            <div className="flex flex-wrap gap-2">
              {places.map((place) => (
                <label key={place.place_id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 bg-white">
                  <input
                    type="checkbox"
                    checked={selectedPlaceIds.includes(place.place_id)}
                    onChange={() => togglePlace(place.place_id)}
                    className="rounded border-gray-300 text-action"
                  />
                  <span className="text-sm">{place.name}</span>
                  <input
                    type="radio"
                    name="primary_place"
                    checked={primaryPlaceId === place.place_id}
                    onChange={() => setPrimaryPlaceId(place.place_id)}
                    className="ml-1"
                  />
                  <span className="text-xs text-gray-500">Primary</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-action px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isPending}
            className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            Save &amp; Publish
          </button>
          {article && (
            <div className="ml-auto">
              <DeleteArticleButton
                articleId={article.article_id}
                articleTitle={article.title}
                variant="button"
                redirectAfterDelete
              />
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
