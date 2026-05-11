import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { getSocialCredential } from '@/lib/social/credentials';
import { getMetaSystemCredential } from '@/lib/social/meta-system';

type CredentialMetadata = {
  linkedInstagramId?: string | null;
  linkedInstagramUsername?: string | null;
};

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const systemCredential = await getMetaSystemCredential();
    if (systemCredential) {
      return NextResponse.json({
        connected: true,
        source: systemCredential.source,
        accountLabel: systemCredential.pageName,
        pageId: systemCredential.pageId,
        expiresAt: null,
        linkedInstagramId: systemCredential.instagramId,
        linkedInstagramUsername: systemCredential.instagramUsername,
      });
    }
    const credential = await getSocialCredential('facebook');
    if (!credential) {
      return NextResponse.json({ connected: false });
    }
    const metadata = credential.metadata as CredentialMetadata;
    return NextResponse.json({
      connected: true,
      accountLabel: credential.accountLabel,
      pageId: credential.externalAccountId,
      expiresAt: credential.expiresAt?.toISOString() ?? null,
      linkedInstagramId: metadata?.linkedInstagramId ?? null,
      linkedInstagramUsername: metadata?.linkedInstagramUsername ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Facebook status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
