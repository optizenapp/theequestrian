/**
 * Resilient wrapper around @vercel/postgres for Neon pooler cold starts
 * and transient PgBouncer errors (e.g. server_login_retry / 08P01).
 */
import { sql as baseSql } from '@vercel/postgres';
import { retryTransientPostgres } from '@/lib/db/transient-errors';

export const sql: typeof baseSql = new Proxy(baseSql, {
  apply(target, thisArg, args) {
    return retryTransientPostgres(() => Reflect.apply(target, thisArg, args));
  },
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (prop === 'query' && typeof value === 'function') {
      return (...queryArgs: Parameters<typeof baseSql.query>) =>
        retryTransientPostgres(() => value.apply(target, queryArgs));
    }
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  },
});
