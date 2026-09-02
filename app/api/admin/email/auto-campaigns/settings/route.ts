import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import {
  getAutoWeeklySettings,
  setAutoWeeklyFlowEnabled,
  setAutoWeeklyIntroPrompt,
  setAutoWeeklySubjectPrompt,
  setAutoWeeklyTemplateVersionId,
  setAutoWeeklyAudience,
} from '@/lib/email-platform/auto-weekly/settings';
import { listTemplates } from '@/lib/email-platform/templates';
import {
  getAutoCampaignCategoryPool,
  getAutoCampaignEnabledTypes,
  getAutoCampaignResendConfig,
  getAutoCampaignRotation,
  getAutoCampaignSelections,
  getAutoCampaignSlots,
  getAutoCampaignTemplatesByType,
  setAutoCampaignSelections,
  setAutoCampaignCategoryPool,
  setAutoCampaignEnabledTypes,
  setAutoCampaignResendConfig,
  setAutoCampaignSlots,
  setAutoCampaignTemplatesByType,
} from '@/lib/email-platform/auto-campaigns/config';
import { listSeoReadyBrandHandles } from '@/lib/email-platform/auto-campaigns/eligible-brands';
import { getAllCollections } from '@/lib/shopify/collections';
import type { AutoCampaignSlot } from '@/lib/email-platform/auto-campaigns/types';

const ON_SALE_COLLECTION_HANDLE = 'on-sale';

type CategoryOption = {
  handle: string;
  label: string;
};

async function listCategoryOptions(): Promise<CategoryOption[]> {
  const [categoryPool, collections] = await Promise.all([
    getAutoCampaignCategoryPool(),
    getAllCollections(),
  ]);
  const byHandle = new Map<string, CategoryOption>();

  for (const handle of categoryPool) {
    if (handle !== ON_SALE_COLLECTION_HANDLE) {
      byHandle.set(handle, { handle, label: handle });
    }
  }

  for (const collection of collections) {
    if (!collection.handle || collection.handle === ON_SALE_COLLECTION_HANDLE) continue;
    const title = collection.title?.trim() || collection.handle;
    const parent = collection.parentCollection?.trim();
    byHandle.set(collection.handle, {
      handle: collection.handle,
      label: parent ? `${title} (${parent})` : title,
    });
  }

  return Array.from(byHandle.values()).sort((a, b) => a.label.localeCompare(b.label));
}

async function loadPayload() {
  const [weekly, slots, categoryPool, categoryOptions, resend, templatesByType, enabledTypes, selections, seoBrands, completedStats] = await Promise.all([
    getAutoWeeklySettings(),
    getAutoCampaignSlots(),
    getAutoCampaignCategoryPool(),
    listCategoryOptions(),
    getAutoCampaignResendConfig(),
    getAutoCampaignTemplatesByType(),
    getAutoCampaignEnabledTypes(),
    getAutoCampaignSelections(),
    listSeoReadyBrandHandles(),
    sql`
      SELECT
        COALESCE(metadata->>'autoType', 'unknown') AS auto_type,
        COUNT(*)::int AS completed_count
      FROM email_campaigns
      WHERE status = 'completed'
        AND created_by IN ('auto-campaign', 'auto-resend')
      GROUP BY COALESCE(metadata->>'autoType', 'unknown')
    `,
  ]);
  const templates = await listTemplates(100);
  const campaignTemplates = templates.filter((t) => t.templateType === 'campaign');
  const rotation = await getAutoCampaignRotation();
  return {
    enabled: weekly.enabled,
    introPrompt: weekly.introPrompt,
    subjectPrompt: weekly.subjectPrompt,
    templateVersionId: weekly.templateVersionId,
    audience: weekly.audience,
    slots,
    categoryPool,
    resend,
    templatesByType,
    enabledTypes,
    selections,
    brandOptions: seoBrands.map((handle) => ({ handle, label: handle })),
    categoryOptions,
    rotation,
    seoReadyBrandCount: seoBrands.length,
    completedStatsByType: {
      brand: Number(completedStats.rows.find((r) => r.auto_type === 'brand')?.completed_count ?? 0),
      on_sale: Number(completedStats.rows.find((r) => r.auto_type === 'on_sale')?.completed_count ?? 0),
      category: Number(completedStats.rows.find((r) => r.auto_type === 'category')?.completed_count ?? 0),
    },
    templates: campaignTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      activeVersionId: t.activeVersionId,
    })),
  };
}

export async function GET() {
  try {
    return NextResponse.json(await loadPayload());
  } catch (error) {
    console.error('Failed to load auto campaign settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    if (typeof body?.enabled === 'boolean') {
      await setAutoWeeklyFlowEnabled(body.enabled);
    }
    if (typeof body?.introPrompt === 'string') {
      await setAutoWeeklyIntroPrompt(body.introPrompt.trim() || null);
    }
    if (typeof body?.subjectPrompt === 'string') {
      await setAutoWeeklySubjectPrompt(body.subjectPrompt.trim() || null);
    }
    if (body?.templateVersionId !== undefined) {
      const v = body.templateVersionId === null || body.templateVersionId === '' ? null : String(body.templateVersionId).trim();
      await setAutoWeeklyTemplateVersionId(v || null);
    }
    if (body?.audience !== undefined && body.audience !== null) {
      const listIds = Array.isArray(body.audience.listIds) ? body.audience.listIds.filter((x: unknown): x is string => typeof x === 'string') : [];
      const segmentIds = Array.isArray(body.audience.segmentIds)
        ? body.audience.segmentIds.filter((x: unknown): x is string => typeof x === 'string')
        : [];
      await setAutoWeeklyAudience({ listIds, segmentIds });
    }
    if (body?.enabledTypes && typeof body.enabledTypes === 'object') {
      const t = body.enabledTypes as Record<string, unknown>;
      const current = await getAutoCampaignEnabledTypes();
      await setAutoCampaignEnabledTypes({
        brand: typeof t.brand === 'boolean' ? t.brand : current.brand,
        on_sale: typeof t.on_sale === 'boolean' ? t.on_sale : current.on_sale,
        category: typeof t.category === 'boolean' ? t.category : current.category,
      });
    }
    if (Array.isArray(body?.slots)) {
      const slots: AutoCampaignSlot[] = body.slots.flatMap((s: unknown) => {
        if (!s || typeof s !== 'object') return [];
        const o = s as Record<string, unknown>;
        if (
          (o.type !== 'brand' && o.type !== 'on_sale' && o.type !== 'category') ||
          typeof o.weekday !== 'number' ||
          typeof o.hour !== 'number'
        ) {
          return [];
        }
        return [{
          type: o.type,
          weekday: o.weekday,
          hour: o.hour,
          minute: o.minute === 30 ? 30 : 0,
        }];
      });
      if (slots.length > 0) await setAutoCampaignSlots(slots);
    }
    if (Array.isArray(body?.categoryPool)) {
      await setAutoCampaignCategoryPool(body.categoryPool.filter((x: unknown): x is string => typeof x === 'string'));
    }
    if (body?.selections && typeof body.selections === 'object') {
      const selections = body.selections as Record<string, unknown>;
      const brandHandle = typeof selections.brandHandle === 'string' ? selections.brandHandle.trim() : '';
      const categoryCollectionHandle =
        typeof selections.categoryCollectionHandle === 'string' ? selections.categoryCollectionHandle.trim() : '';
      const [brandOptions, categoryOptions] = await Promise.all([
        listSeoReadyBrandHandles(),
        listCategoryOptions(),
      ]);
      if (!brandHandle || !brandOptions.includes(brandHandle)) {
        return NextResponse.json({ error: 'Select a valid brand campaign brand' }, { status: 400 });
      }
      if (!categoryCollectionHandle || !categoryOptions.some((option) => option.handle === categoryCollectionHandle)) {
        return NextResponse.json({ error: 'Select a valid category campaign category' }, { status: 400 });
      }
      await setAutoCampaignSelections({ brandHandle, categoryCollectionHandle });
    }
    if (body?.resend && typeof body.resend === 'object') {
      const r = body.resend as Record<string, unknown>;
      const current = await getAutoCampaignResendConfig();
      await setAutoCampaignResendConfig({
        enabled: typeof r.enabled === 'boolean' ? r.enabled : current.enabled,
        delayHours: typeof r.delayHours === 'number' ? r.delayHours : current.delayHours,
        maxWaves: typeof r.maxWaves === 'number' ? r.maxWaves : current.maxWaves,
      });
    }
    if (body?.templatesByType && typeof body.templatesByType === 'object') {
      const t = body.templatesByType as Record<string, unknown>;
      const cur = await getAutoCampaignTemplatesByType();
      const nextT = { ...cur };
      if (typeof t.brand === 'string') nextT.brand = t.brand.trim() || null;
      if (typeof t.on_sale === 'string') nextT.on_sale = t.on_sale.trim() || null;
      if (typeof t.category === 'string') nextT.category = t.category.trim() || null;
      await setAutoCampaignTemplatesByType(nextT);
    }

    return NextResponse.json({ ok: true, ...(await loadPayload()) });
  } catch (error) {
    console.error('Failed to update auto campaign settings:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to update settings', detail: message }, { status: 500 });
  }
}
