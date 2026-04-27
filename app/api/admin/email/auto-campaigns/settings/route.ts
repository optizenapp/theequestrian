import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
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
  getAutoCampaignSlots,
  getAutoCampaignTemplatesByType,
  setAutoCampaignCategoryPool,
  setAutoCampaignEnabledTypes,
  setAutoCampaignResendConfig,
  setAutoCampaignSlots,
  setAutoCampaignTemplatesByType,
} from '@/lib/email-platform/auto-campaigns/config';
import { listSeoReadyBrandHandles } from '@/lib/email-platform/auto-campaigns/eligible-brands';
import type { AutoCampaignSlot } from '@/lib/email-platform/auto-campaigns/types';

async function loadPayload() {
  const [weekly, slots, categoryPool, resend, templatesByType, enabledTypes, seoBrands, completedStats] = await Promise.all([
    getAutoWeeklySettings(),
    getAutoCampaignSlots(),
    getAutoCampaignCategoryPool(),
    getAutoCampaignResendConfig(),
    getAutoCampaignTemplatesByType(),
    getAutoCampaignEnabledTypes(),
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
      const slots = body.slots.filter((s: unknown): s is AutoCampaignSlot => {
        if (!s || typeof s !== 'object') return false;
        const o = s as Record<string, unknown>;
        return (
          (o.type === 'brand' || o.type === 'on_sale' || o.type === 'category') &&
          typeof o.weekday === 'number' &&
          typeof o.hour === 'number'
        );
      });
      if (slots.length > 0) await setAutoCampaignSlots(slots);
    }
    if (Array.isArray(body?.categoryPool)) {
      await setAutoCampaignCategoryPool(body.categoryPool.filter((x: unknown): x is string => typeof x === 'string'));
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
