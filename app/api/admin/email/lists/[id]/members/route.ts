import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import { addContactsToList } from '@/lib/email-platform/contacts';
import { upsertEmailContact } from '@/lib/email-platform/contacts';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await sql`
      SELECT
        c.id,
        c.primary_email,
        c.first_name,
        c.last_name,
        s.status AS subscription_status,
        m.created_at AS joined_at
      FROM email_list_memberships m
      INNER JOIN email_contacts c ON c.id = m.contact_id
      LEFT JOIN email_subscriptions s ON s.contact_id = c.id
      WHERE m.list_id = ${id}
      ORDER BY m.created_at DESC
      LIMIT 5000
    `;

    return NextResponse.json({
      members: result.rows.map((row) => ({
        id: row.id as string,
        email: row.primary_email as string,
        firstName: (row.first_name as string | null) ?? null,
        lastName: (row.last_name as string | null) ?? null,
        subscriptionStatus: (row.subscription_status as string | null) ?? 'pending',
        joinedAt: new Date(row.joined_at as string).toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to load list members:', error);
    return NextResponse.json({ error: 'Failed to load list members' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const contactIdsInput = Array.isArray(body?.contactIds)
      ? body.contactIds.filter((value: unknown): value is string => typeof value === 'string')
      : [];
    const emailsInput: string[] = Array.isArray(body?.emails)
      ? body.emails.filter((value: unknown): value is string => typeof value === 'string')
      : [];

    const normalizedEmails = Array.from(
      new Set(
        emailsInput
          .map((email: string) => email.trim().toLowerCase())
          .filter((email: string) => email.includes('@') && email.includes('.'))
      )
    );

    const upsertedContactIds: string[] = [];
    for (const email of normalizedEmails) {
      const contact = await upsertEmailContact({
        email,
        source: 'manual_list_add',
        acceptsMarketing: true,
      });
      upsertedContactIds.push(contact.contactId);
    }

    const contactIds = Array.from(new Set([...contactIdsInput, ...upsertedContactIds]));
    if (contactIds.length === 0) {
      return NextResponse.json(
        { error: 'Provide at least one contact ID or valid email in contactIds[] or emails[]' },
        { status: 400 }
      );
    }

    await addContactsToList(id, contactIds, 'manual');
    return NextResponse.json({
      ok: true,
      added: contactIds.length,
      createdOrUpdatedContacts: upsertedContactIds.length,
    });
  } catch (error) {
    console.error('Failed to add members to list:', error);
    return NextResponse.json({ error: 'Failed to add members to list' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const contactIds = Array.isArray(body?.contactIds)
      ? body.contactIds.filter((value: unknown): value is string => typeof value === 'string')
      : [];
    if (contactIds.length === 0) {
      return NextResponse.json({ error: 'contactIds[] is required' }, { status: 400 });
    }

    for (const contactId of contactIds) {
      await sql`
        DELETE FROM email_list_memberships
        WHERE list_id = ${id}
          AND contact_id = ${contactId}
      `;
    }

    return NextResponse.json({ ok: true, removed: contactIds.length });
  } catch (error) {
    console.error('Failed to remove members from list:', error);
    return NextResponse.json({ error: 'Failed to remove members from list' }, { status: 500 });
  }
}
