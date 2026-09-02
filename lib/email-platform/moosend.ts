import { sql } from '@/lib/db/vercel-postgres';
import { upsertEmailContact, addContactsToList } from '@/lib/email-platform/contacts';
import { logEmailAudit } from '@/lib/email-platform/audit';

type MoosendList = {
  id: string;
  name: string;
};

type MoosendSubscriber = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
};

function getMoosendApiKey(): string {
  const key = process.env.MOOSEND_API_KEY;
  if (!key) {
    throw new Error('MOOSEND_API_KEY is not set');
  }
  return key;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: unknown): string | null {
  const str = normalizeString(value);
  return str ? str.toLowerCase() : null;
}

async function fetchMoosendJson(url: string): Promise<unknown> {
  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Moosend API request failed (${response.status}): ${text || response.statusText}`);
  }
  return response.json();
}

function extractMoosendLists(payload: unknown): MoosendList[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const candidates = [
    p.MailingLists,
    (p.Context as Record<string, unknown> | undefined)?.MailingLists,
    p.Context,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const mapped = candidate
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const id =
          normalizeString(row.ID) ||
          normalizeString(row.Id) ||
          normalizeString(row.id) ||
          normalizeString(row.ListID);
        const name =
          normalizeString(row.Name) ||
          normalizeString(row.name) ||
          normalizeString(row.ListName);
        if (!id || !name) return null;
        return { id, name };
      })
      .filter((item): item is MoosendList => !!item);

    if (mapped.length > 0) return mapped;
  }

  return [];
}

function extractMoosendSubscribers(payload: unknown): { subscribers: MoosendSubscriber[]; hasMore: boolean } {
  if (!payload || typeof payload !== 'object') return { subscribers: [], hasMore: false };
  const p = payload as Record<string, unknown>;
  const context = (p.Context as Record<string, unknown> | undefined) || p;

  const arrays = [context.Subscribers, p.Subscribers, context.Results, p.Results];
  let rawSubscribers: unknown[] = [];
  for (const candidate of arrays) {
    if (Array.isArray(candidate)) {
      rawSubscribers = candidate;
      break;
    }
  }

  const subscribers = rawSubscribers
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const email =
        normalizeEmail(row.Email) ||
        normalizeEmail(row.EmailAddress) ||
        normalizeEmail(row.email);
      if (!email) return null;
      return {
        email,
        firstName: normalizeString(row.Name) || normalizeString(row.FirstName) || null,
        lastName: normalizeString(row.Surname) || normalizeString(row.LastName) || null,
        status: normalizeString(row.Status) || normalizeString(row.status) || null,
      };
    })
    .filter((item): item is MoosendSubscriber => !!item);

  const paging =
    (context.Paging as Record<string, unknown> | undefined) ||
    (p.Paging as Record<string, unknown> | undefined) ||
    {};
  const page = Number(
    paging.CurrentPage || context.Page || p.Page || 1
  );
  const totalPages = Number(
    paging.TotalPageCount || context.TotalPages || p.TotalPages || page
  );
  return { subscribers, hasMore: Number.isFinite(page) && Number.isFinite(totalPages) && page < totalPages };
}

async function fetchMoosendLists(): Promise<MoosendList[]> {
  const apiKey = getMoosendApiKey();
  const urls = [
    `https://api.moosend.com/v3/lists.json?apikey=${encodeURIComponent(apiKey)}`,
    `https://api.moosend.com/v3/lists/list.json?apikey=${encodeURIComponent(apiKey)}`,
  ];

  for (const url of urls) {
    try {
      const payload = await fetchMoosendJson(url);
      const lists = extractMoosendLists(payload);
      if (lists.length > 0) return lists;
    } catch {
      // Try fallback endpoint.
    }
  }

  return [];
}

async function fetchMoosendListSubscribers(listId: string): Promise<MoosendSubscriber[]> {
  const apiKey = getMoosendApiKey();
  const subscribers: MoosendSubscriber[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 500) {
    const urls = [
      `https://api.moosend.com/v3/lists/${encodeURIComponent(listId)}/subscribers.json?apikey=${encodeURIComponent(apiKey)}&page=${page}&pageSize=1000`,
      `https://api.moosend.com/v3/lists/${encodeURIComponent(listId)}/subscribers.json?apikey=${encodeURIComponent(apiKey)}&page=${page}&pagesize=1000`,
      `https://api.moosend.com/v3/subscribers/${encodeURIComponent(listId)}/view.json?apikey=${encodeURIComponent(apiKey)}&page=${page}&pageSize=1000`,
      `https://api.moosend.com/v3/subscribers/${encodeURIComponent(listId)}/view.json?apikey=${encodeURIComponent(apiKey)}&page=${page}&pagesize=1000`,
    ];

    let pagePayload: unknown = null;
    let success = false;
    for (const url of urls) {
      try {
        pagePayload = await fetchMoosendJson(url);
        success = true;
        break;
      } catch {
        // Try fallback URL shape.
      }
    }

    if (!success) {
      throw new Error(`Failed to fetch Moosend subscribers for list ${listId} page ${page}`);
    }

    const extracted = extractMoosendSubscribers(pagePayload);
    subscribers.push(...extracted.subscribers);
    hasMore = extracted.hasMore && extracted.subscribers.length > 0;
    page += 1;
  }

  return subscribers;
}

async function upsertEmailListByName(name: string): Promise<string> {
  const existing = await sql`
    SELECT id
    FROM email_lists
    WHERE name = ${name}
    LIMIT 1
  `;
  if (existing.rows[0]?.id) {
    return existing.rows[0].id as string;
  }

  const inserted = await sql`
    INSERT INTO email_lists (name, description, updated_at)
    VALUES (${name}, ${'Imported from Moosend'}, NOW())
    RETURNING id
  `;
  return inserted.rows[0]?.id as string;
}

export async function importMoosendListsAndSubscribers(input?: {
  listId?: string;
  maxLists?: number;
}): Promise<{
  importedLists: number;
  importedSubscribers: number;
  importedContacts: number;
  failedContacts: number;
  results: Array<{ moosendListId: string; listName: string; importedSubscribers: number; importedContacts: number }>;
}> {
  const requestedListId = normalizeString(input?.listId);
  const allLists = await fetchMoosendLists();
  const selectedLists = requestedListId
    ? allLists.filter((list) => list.id === requestedListId)
    : allLists.slice(0, Math.max(1, input?.maxLists || allLists.length));

  if (selectedLists.length === 0) {
    throw new Error('No Moosend mailing lists found');
  }

  let importedLists = 0;
  let importedSubscribers = 0;
  let importedContacts = 0;
  let failedContacts = 0;
  const results: Array<{
    moosendListId: string;
    listName: string;
    importedSubscribers: number;
    importedContacts: number;
  }> = [];

  for (const list of selectedLists) {
    const localListId = await upsertEmailListByName(list.name);
    const subscribers = await fetchMoosendListSubscribers(list.id);
    importedLists += 1;
    importedSubscribers += subscribers.length;

    let listImportedContacts = 0;
    const chunkSize = 200;
    for (let start = 0; start < subscribers.length; start += chunkSize) {
      const chunk = subscribers.slice(start, start + chunkSize);
      const chunkContactIds: string[] = [];

      for (const subscriber of chunk) {
        try {
          const upsert = await upsertEmailContact({
            email: subscriber.email,
            firstName: subscriber.firstName,
            lastName: subscriber.lastName,
            acceptsMarketing: subscriber.status?.toLowerCase() !== 'unsubscribed',
            source: 'moosend_import',
            metadata: {
              moosendListId: list.id,
              moosendStatus: subscriber.status,
            },
          });
          chunkContactIds.push(upsert.contactId);
          listImportedContacts += 1;
          importedContacts += 1;
        } catch (error) {
          failedContacts += 1;
          console.error('[moosend-import] failed to upsert contact', {
            listId: list.id,
            listName: list.name,
            email: subscriber.email,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (chunkContactIds.length > 0) {
        await addContactsToList(localListId, chunkContactIds, 'moosend_import');
      }
    }

    await logEmailAudit({
      actor: 'admin',
      action: 'moosend_list_imported',
      entityType: 'email_list',
      entityId: localListId,
      payload: {
        moosendListId: list.id,
        listName: list.name,
        importedSubscribers: subscribers.length,
      },
    });

    results.push({
      moosendListId: list.id,
      listName: list.name,
      importedSubscribers: subscribers.length,
      importedContacts: listImportedContacts,
    });
  }

  return {
    importedLists,
    importedSubscribers,
    importedContacts,
    failedContacts,
    results,
  };
}
