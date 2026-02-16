import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import { seoEnrichmentConfig } from '@/lib/seo-enrichment/config';
import { log } from '@/lib/seo-enrichment/logger';
import { SimpleRateLimiter } from '@/lib/seo-enrichment/rate-limiter';
import type { Ga4Metrics, GscMetrics } from '@/lib/seo-enrichment/types';

const GSC_SCOPE = ['https://www.googleapis.com/auth/webmasters.readonly'];

const gscLimiter = new SimpleRateLimiter(3);
const ga4Limiter = new SimpleRateLimiter(3);

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function defaultGscMetrics(): GscMetrics {
  return {
    totalImpressions: 0,
    totalClicks: 0,
    avgPosition: 0,
    avgCtr: 0,
    topQueries: [],
    highImpressionLowPosition: [],
    highImpressionLowCtr: [],
  };
}

function defaultGa4Metrics(): Ga4Metrics {
  return {
    sessions: 0,
    revenue: 0,
    conversions: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    addToCarts: 0,
    transactions: 0,
  };
}

function readServiceAccount(value: string): { client_email: string; private_key: string } & Record<string, unknown> {
  const trimmed = value.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed) as {
      client_email: string;
      private_key: string;
    } & Record<string, unknown>;
  }
  return JSON.parse(fs.readFileSync(trimmed, 'utf-8')) as {
    client_email: string;
    private_key: string;
  } & Record<string, unknown>;
}

export class AnalyticsCollector {
  private ga4Client: BetaAnalyticsDataClient | null = null;
  private gscJwt: JWT | null = null;

  private getGa4Client(): BetaAnalyticsDataClient | null {
    if (!seoEnrichmentConfig.ga4ServiceAccountJson) return null;
    if (this.ga4Client) return this.ga4Client;
    const credentials = readServiceAccount(seoEnrichmentConfig.ga4ServiceAccountJson);
    this.ga4Client = new BetaAnalyticsDataClient({ credentials });
    return this.ga4Client;
  }

  private async getGscAccessToken(): Promise<string | null> {
    if (!seoEnrichmentConfig.gscServiceAccountJson) return null;
    if (!this.gscJwt) {
      const credentials = readServiceAccount(seoEnrichmentConfig.gscServiceAccountJson);
      this.gscJwt = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: GSC_SCOPE,
      });
    }
    const token = await this.gscJwt.getAccessToken();
    return token.token || null;
  }

  async collectForPath(pagePath: string): Promise<{ gsc: GscMetrics; ga4: Ga4Metrics }> {
    const [gsc, ga4] = await Promise.all([
      this.getGscDataForPath(pagePath),
      this.getGa4DataForPath(pagePath),
    ]);
    return { gsc, ga4 };
  }

  async getGscDataForPath(pagePath: string): Promise<GscMetrics> {
    try {
      if (!seoEnrichmentConfig.gscSiteUrl || !seoEnrichmentConfig.gscServiceAccountJson) {
        return defaultGscMetrics();
      }

      await gscLimiter.waitTurn();
      const token = await this.getGscAccessToken();
      if (!token) return defaultGscMetrics();

      const end = new Date();
      const start = new Date(end.getTime() - seoEnrichmentConfig.lookbackDays * 24 * 60 * 60 * 1000);
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);
      const pageUrl = `${seoEnrichmentConfig.gscSiteUrl.replace(/\/$/, '')}${pagePath}`;

      const response = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
          seoEnrichmentConfig.gscSiteUrl
        )}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ['query'],
            dimensionFilterGroups: [
              {
                filters: [{ dimension: 'page', operator: 'equals', expression: pageUrl }],
              },
            ],
            rowLimit: 100,
            startRow: 0,
          }),
        }
      );

      if (!response.ok) {
        log('warn', 'GSC request failed', { pagePath, status: response.status });
        return defaultGscMetrics();
      }

      const data = (await response.json()) as { rows?: Array<Record<string, unknown>> };
      const rows = data.rows || [];
      const topQueries = rows
        .map((row) => ({
          query: String((row.keys as string[] | undefined)?.[0] || ''),
          impressions: safeNumber(row.impressions),
          clicks: safeNumber(row.clicks),
          position: Number(safeNumber(row.position).toFixed(1)),
          ctr: Number(safeNumber(row.ctr).toFixed(4)),
        }))
        .filter((q) => q.query.length > 0)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 20);

      const totalImpressions = topQueries.reduce((sum, row) => sum + row.impressions, 0);
      const totalClicks = topQueries.reduce((sum, row) => sum + row.clicks, 0);
      const avgPosition =
        totalImpressions > 0
          ? Number(
              (
                topQueries.reduce((sum, row) => sum + row.position * row.impressions, 0) / totalImpressions
              ).toFixed(1)
            )
          : 0;
      const avgCtr = totalImpressions > 0 ? Number((totalClicks / totalImpressions).toFixed(4)) : 0;

      const highImpressionLowPosition = topQueries
        .filter((row) => row.impressions >= 50 && row.position > 10)
        .slice(0, 10)
        .map((row) => ({ query: row.query, impressions: row.impressions, position: row.position }));

      const highImpressionLowCtr = topQueries
        .filter((row) => row.impressions >= 100 && row.ctr < 0.02 && row.position <= 10)
        .slice(0, 10)
        .map((row) => ({
          query: row.query,
          impressions: row.impressions,
          position: row.position,
          ctr: row.ctr,
        }));

      return {
        totalImpressions,
        totalClicks,
        avgPosition,
        avgCtr,
        topQueries,
        highImpressionLowPosition,
        highImpressionLowCtr,
      };
    } catch (error) {
      log('warn', 'GSC collector failed', { pagePath, error: String(error) });
      return defaultGscMetrics();
    }
  }

  async getGa4DataForPath(pagePath: string): Promise<Ga4Metrics> {
    try {
      const client = this.getGa4Client();
      if (!client || !seoEnrichmentConfig.ga4PropertyId) return defaultGa4Metrics();
      await ga4Limiter.waitTurn();

      const end = new Date();
      const start = new Date(end.getTime() - seoEnrichmentConfig.lookbackDays * 24 * 60 * 60 * 1000);
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);

      const [report] = await client.runReport({
        property: seoEnrichmentConfig.ga4PropertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalRevenue' },
          { name: 'conversions' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'addToCarts' },
          { name: 'transactions' },
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: {
              matchType: 'EXACT',
              value: pagePath,
            },
          },
        },
      });

      const row = report.rows?.[0];
      if (!row || !row.metricValues) return defaultGa4Metrics();
      const metrics = row.metricValues;
      return {
        sessions: safeNumber(metrics[0]?.value),
        revenue: safeNumber(metrics[1]?.value),
        conversions: safeNumber(metrics[2]?.value),
        bounceRate: Number(safeNumber(metrics[3]?.value).toFixed(4)),
        avgSessionDuration: Number(safeNumber(metrics[4]?.value).toFixed(1)),
        addToCarts: safeNumber(metrics[5]?.value),
        transactions: safeNumber(metrics[6]?.value),
      };
    } catch (error) {
      log('warn', 'GA4 collector failed', { pagePath, error: String(error) });
      return defaultGa4Metrics();
    }
  }
}

