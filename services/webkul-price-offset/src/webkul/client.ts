import { config } from '../config';

let cachedAccessToken = config.webkulAccessToken || config.webkulAuthToken;

function buildAuthHeaderValue(token: string) {
  if (!token) return '';
  if (config.webkulAuthHeader.toLowerCase() === 'authorization') {
    if (token.toLowerCase().startsWith('bearer ')) return token;
    return `Bearer ${token}`;
  }
  return token;
}

async function refreshAccessToken() {
  if (!config.webkulRefreshToken || !cachedAccessToken) {
    throw new Error('Missing WEBKUL_REFRESH_TOKEN for OAuth refresh');
  }

  const payload: Record<string, string> = {
    access_token: cachedAccessToken,
    refresh_token: config.webkulRefreshToken,
  };

  const response = await fetch(`${config.webkulBaseUrl}/authorize/token.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Webkul OAuth ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('Webkul OAuth response missing access_token');
  }

  cachedAccessToken = data.access_token;
  return cachedAccessToken;
}

async function doFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
  retryCount = 0
): Promise<T> {
  const url = `${config.webkulBaseUrl}${path}`;
  const headers = new Headers(options.headers || {});
  const authValue = buildAuthHeaderValue(cachedAccessToken);
  if (authValue) {
    headers.set(config.webkulAuthHeader, authValue);
  }
  headers.set('Content-Type', 'application/json');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error(`Webkul API timeout after 30s: ${path}`);
    }
    throw error;
  }

  if (response.status === 401 && retry) {
    await refreshAccessToken();
    return doFetch<T>(path, options, false, retryCount);
  }

  if (response.status === 429 && retry) {
    if (retryCount >= 5) {
      const text = await response.text();
      throw new Error(`Webkul API 429: ${text}`);
    }
    const delayMs = 1000 * 2 ** retryCount;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return doFetch<T>(path, options, true, retryCount + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Webkul API ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

export async function webkulFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!cachedAccessToken && !config.webkulAuthToken) {
    throw new Error('Missing WEBKUL_ACCESS_TOKEN or WEBKUL_AUTH_TOKEN');
  }
  return doFetch<T>(path, options);
}
