/** Shared Neon / PgBouncer transient error detection for retry logic. */

export function postgresErrorCode(err: unknown): string {
  if (typeof err === 'object' && err && 'code' in err) {
    return String((err as { code: string }).code);
  }
  return '';
}

export function isTransientPostgresError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  const code = postgresErrorCode(err);

  return (
    msg.includes('query_wait_timeout') ||
    msg.includes('MaxClientsInSessionMode') ||
    msg.includes('server_login_retry') ||
    msg.includes('server login has been failing') ||
    msg.includes("Couldn't connect to compute node") ||
    msg.includes('server conn crashed') ||
    code === '08P01' ||
    code === '57P01' ||
    (msg.includes('timeout') && msg.includes('query'))
  );
}

export async function retryTransientPostgres<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 4;
  const baseDelayMs = options?.baseDelayMs ?? 1500;
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (isTransientPostgresError(err) && attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
        continue;
      }
      throw err;
    }
  }

  throw lastErr;
}
