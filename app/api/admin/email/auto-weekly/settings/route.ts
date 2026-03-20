import { NextRequest, NextResponse } from 'next/server';
import {
  getAutoWeeklySettings,
  setAutoWeeklyFlowEnabled,
  setAutoWeeklyIntroPrompt,
  setAutoWeeklySubjectPrompt,
  setAutoWeeklyTemplateVersionId,
  setAutoWeeklyAudience,
} from '@/lib/email-platform/auto-weekly/settings';
import { listTemplates } from '@/lib/email-platform/templates';

export async function GET() {
  try {
    const settings = await getAutoWeeklySettings();
    const templates = await listTemplates(100);
    const campaignTemplates = templates.filter((t) => t.templateType === 'campaign');
    return NextResponse.json({
      enabled: settings.enabled,
      introPrompt: settings.introPrompt,
      subjectPrompt: settings.subjectPrompt,
      templateVersionId: settings.templateVersionId,
      audience: settings.audience,
      templates: campaignTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        activeVersionId: t.activeVersionId,
      })),
    });
  } catch (error) {
    console.error('Failed to get auto weekly settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await getAutoWeeklySettings();

    if (typeof body?.enabled === 'boolean') {
      await setAutoWeeklyFlowEnabled(body.enabled);
      settings.enabled = body.enabled;
    }
    if (typeof body?.introPrompt === 'string') {
      await setAutoWeeklyIntroPrompt(body.introPrompt.trim() || null);
      settings.introPrompt = body.introPrompt.trim() || null;
    }
    if (typeof body?.subjectPrompt === 'string') {
      await setAutoWeeklySubjectPrompt(body.subjectPrompt.trim() || null);
      settings.subjectPrompt = body.subjectPrompt.trim() || null;
    }
    if (body?.templateVersionId !== undefined) {
      const v = body.templateVersionId === null || body.templateVersionId === '' ? null : String(body.templateVersionId).trim();
      await setAutoWeeklyTemplateVersionId(v || null);
      settings.templateVersionId = v || null;
    }
    if (body?.audience !== undefined && body.audience !== null) {
      const listIds = Array.isArray(body.audience.listIds) ? body.audience.listIds.filter((x): x is string => typeof x === 'string') : [];
      const segmentIds = Array.isArray(body.audience.segmentIds) ? body.audience.segmentIds.filter((x): x is string => typeof x === 'string') : [];
      await setAutoWeeklyAudience({ listIds, segmentIds });
      settings.audience = { listIds, segmentIds };
    }

    return NextResponse.json({
      ok: true,
      enabled: settings.enabled,
      introPrompt: settings.introPrompt,
      subjectPrompt: settings.subjectPrompt,
      templateVersionId: settings.templateVersionId,
      audience: settings.audience,
    });
  } catch (error) {
    console.error('Failed to update auto weekly settings:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to update settings', detail: message },
      { status: 500 }
    );
  }
}
