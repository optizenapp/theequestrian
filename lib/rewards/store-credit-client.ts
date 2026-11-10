import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { centsToAmount, toCents } from './money';

export type PostingResult =
  | { outcome: 'posted'; transactionId: string | null }
  | { outcome: 'failed'; error: string }
  | { outcome: 'ambiguous'; error: string };

type TransactionPayload = {
  storeCreditAccountTransaction: { id?: string } | null;
  userErrors: Array<{ code: string | null; message: string }>;
};

type MutationResponse = {
  data?: { storeCreditAccountCredit?: TransactionPayload; storeCreditAccountDebit?: TransactionPayload };
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
};

const CREDIT_MUTATION = `
  mutation RewardsStoreCreditCredit($id: ID!, $creditInput: StoreCreditAccountCreditInput!) {
    storeCreditAccountCredit(id: $id, creditInput: $creditInput) {
      storeCreditAccountTransaction { ... on StoreCreditAccountCreditTransaction { id } }
      userErrors { code message }
    }
  }
`;

const DEBIT_MUTATION = `
  mutation RewardsStoreCreditDebit($id: ID!, $debitInput: StoreCreditAccountDebitInput!) {
    storeCreditAccountDebit(id: $id, debitInput: $debitInput) {
      storeCreditAccountTransaction { ... on StoreCreditAccountDebitTransaction { id } }
      userErrors { code message }
    }
  }
`;

/**
 * Store credit mutations have no idempotency key, so every outcome is classified:
 * 'failed' means Shopify definitely made no change and the write may be retried;
 * 'ambiguous' means it may have applied, and only a person checking Shopify can say.
 */
export async function postStoreCredit(
  kind: 'credit' | 'debit',
  customerId: string,
  amountCents: number,
  currencyCode: string
): Promise<PostingResult> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!storeDomain || !accessToken) return { outcome: 'failed', error: 'Shopify Admin credentials are not configured' };

  const money = { amount: centsToAmount(amountCents), currencyCode };
  const variables =
    kind === 'credit' ? { id: customerId, creditInput: { creditAmount: money } } : { id: customerId, debitInput: { debitAmount: money } };

  let response: Response;
  try {
    response = await fetch(`https://${storeDomain}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: kind === 'credit' ? CREDIT_MUTATION : DEBIT_MUTATION, variables }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    return { outcome: 'ambiguous', error: `Request did not complete: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (response.status >= 500) return { outcome: 'ambiguous', error: `Shopify returned ${response.status}` };
  if (!response.ok) return { outcome: 'failed', error: `Shopify returned ${response.status}` };

  let json: MutationResponse;
  try {
    json = (await response.json()) as MutationResponse;
  } catch {
    return { outcome: 'ambiguous', error: 'Unreadable Shopify response' };
  }
  if (json.errors?.length) {
    const internal = json.errors.some((e) => e.extensions?.code === 'INTERNAL_SERVER_ERROR');
    return { outcome: internal ? 'ambiguous' : 'failed', error: json.errors.map((e) => e.message).join('; ') };
  }
  const payload = kind === 'credit' ? json.data?.storeCreditAccountCredit : json.data?.storeCreditAccountDebit;
  if (!payload) return { outcome: 'ambiguous', error: 'Shopify response had no mutation payload' };
  if (payload.userErrors.length) {
    return { outcome: 'failed', error: payload.userErrors.map((e) => `${e.code ?? 'ERROR'}: ${e.message}`).join('; ') };
  }
  if (!payload.storeCreditAccountTransaction) return { outcome: 'ambiguous', error: 'No transaction returned' };
  return { outcome: 'posted', transactionId: payload.storeCreditAccountTransaction.id ?? null };
}

type BalanceResponse = {
  customer: { storeCreditAccounts: { nodes: Array<{ balance: { amount: string; currencyCode: string } }> } } | null;
};

export async function getStoreCreditBalanceCents(customerId: string, currencyCode: string): Promise<number> {
  const data = await shopifyAdminFetch<BalanceResponse>({
    query: `query RewardsStoreCreditBalance($id: ID!) {
      customer(id: $id) { storeCreditAccounts(first: 10) { nodes { balance { amount currencyCode } } } }
    }`,
    variables: { id: customerId },
  });
  if (!data.customer) throw new Error('Customer not found when reading store credit balance');
  const account = data.customer.storeCreditAccounts.nodes.find((node) => node.balance.currencyCode === currencyCode);
  return account ? toCents(account.balance.amount) : 0;
}

export const REQUIRED_STORE_CREDIT_SCOPES = [
  'read_store_credit_accounts',
  'read_store_credit_account_transactions',
  'write_store_credit_account_transactions',
];

export async function getMissingStoreCreditScopes(): Promise<string[]> {
  const data = await shopifyAdminFetch<{ currentAppInstallation: { accessScopes: Array<{ handle: string }> } }>({
    query: 'query RewardsAccessScopes { currentAppInstallation { accessScopes { handle } } }',
  });
  const granted = new Set(data.currentAppInstallation.accessScopes.map((scope) => scope.handle));
  return REQUIRED_STORE_CREDIT_SCOPES.filter(
    (scope) => !granted.has(scope) && !granted.has(scope.replace(/^read_/, 'write_'))
  );
}
