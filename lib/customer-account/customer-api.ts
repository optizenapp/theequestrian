import type { CustomerAccountEndpoints } from './discovery';

export type AccountCustomer = {
  id: string;
  firstName: string | null;
  email: string | null;
};

type CustomerResponse = {
  data?: {
    customer: {
      id: string;
      firstName: string | null;
      emailAddress: { emailAddress: string | null } | null;
    } | null;
  };
  errors?: Array<{ message: string }>;
};

const ACCOUNT_CUSTOMER_QUERY = `
  query AccountCustomer {
    customer {
      id
      firstName
      emailAddress { emailAddress }
    }
  }
`;

export async function fetchAccountCustomer(
  endpoints: CustomerAccountEndpoints,
  accessToken: string
): Promise<AccountCustomer | null> {
  const response = await fetch(endpoints.graphqlApi, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: accessToken },
    body: JSON.stringify({ query: ACCOUNT_CUSTOMER_QUERY }),
    cache: 'no-store',
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Customer Account API returned ${response.status}`);
  const json = (await response.json()) as CustomerResponse;
  if (json.errors?.length) throw new Error(`Customer Account API error: ${json.errors[0].message}`);
  const customer = json.data?.customer;
  if (!customer) return null;
  return {
    id: customer.id,
    firstName: customer.firstName,
    email: customer.emailAddress?.emailAddress ?? null,
  };
}
