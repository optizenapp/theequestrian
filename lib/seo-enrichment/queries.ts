export const EnrichmentQueries = {
  selectEligiblePages: `
    WITH product_pages AS (
      SELECT
        'product'::text AS page_type,
        p.handle AS page_identifier,
        COALESCE(pca.canonical_path, '/products/' || p.handle) AS canonical_path,
        co.updated_at AS last_enriched_at,
        true AS is_active
      FROM products p
      LEFT JOIN product_content_overrides co
        ON co.product_handle = p.handle
      LEFT JOIN product_category_assignments pca
        ON pca.product_handle = p.handle
    ),
    collection_pages AS (
      SELECT
        'collection'::text AS page_type,
        cc.url_path AS page_identifier,
        cc.url_path AS canonical_path,
        (
          SELECT MAX(el.created_at)
          FROM enrichment_log el
          WHERE el.page_type = 'collection'
            AND el.page_identifier = cc.url_path
            AND el.applied = TRUE
        ) AS last_enriched_at,
        (cc.status = 'published') AS is_active
      FROM collection_content cc
    ),
    all_pages AS (
      SELECT * FROM product_pages
      UNION ALL
      SELECT * FROM collection_pages
    ),
    recently_enriched AS (
      SELECT DISTINCT page_type, page_identifier
      FROM enrichment_log
      WHERE created_at > NOW() - ($1::text || ' days')::interval
        AND applied = TRUE
    )
    SELECT
      ap.page_type,
      ap.page_identifier,
      ap.canonical_path,
      ap.last_enriched_at
    FROM all_pages ap
    LEFT JOIN recently_enriched re
      ON re.page_type = ap.page_type
     AND re.page_identifier = ap.page_identifier
    WHERE ap.is_active = TRUE
      AND re.page_identifier IS NULL
    ORDER BY ap.last_enriched_at ASC NULLS FIRST
  `,

  enqueuePage: `
    INSERT INTO enrichment_queue (
      page_type,
      page_identifier,
      canonical_path,
      priority_score,
      priority_reasons,
      gsc_data,
      ga4_data
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
    ON CONFLICT (page_type, page_identifier, scheduled_for_day)
    DO UPDATE SET
      canonical_path = EXCLUDED.canonical_path,
      priority_score = EXCLUDED.priority_score,
      priority_reasons = EXCLUDED.priority_reasons,
      gsc_data = EXCLUDED.gsc_data,
      ga4_data = EXCLUDED.ga4_data,
      updated_at = NOW()
    RETURNING id
  `,

  claimBatch: `
    UPDATE enrichment_queue
    SET status = 'processing',
        started_at = NOW(),
        updated_at = NOW()
    WHERE id IN (
      SELECT id
      FROM enrichment_queue
      WHERE status = 'pending'
        AND scheduled_for <= NOW()
      ORDER BY priority_score DESC, created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `,

  markQueueCompleted: `
    UPDATE enrichment_queue
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
  `,

  markQueueFailed: `
    UPDATE enrichment_queue
    SET status = 'failed',
        retry_count = retry_count + 1,
        error_message = $2,
        updated_at = NOW()
    WHERE id = $1
  `,

  requeueFailed: `
    UPDATE enrichment_queue
    SET status = 'pending',
        updated_at = NOW()
    WHERE status = 'failed'
      AND retry_count < $1
  `,

  insertEnrichmentLog: `
    INSERT INTO enrichment_log (
      queue_id,
      page_type,
      page_identifier,
      canonical_path,
      before_content,
      after_content,
      gsc_snapshot,
      ga4_snapshot,
      serp_analysis,
      enrichment_reasoning,
      model_used,
      prompt_tokens,
      completion_tokens,
      total_cost_usd,
      koray_framework_version,
      koray_rule_ids_used,
      before_scores,
      after_scores,
      applied
    ) VALUES (
      $1, $2, $3, $4,
      $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb,
      $10, $11, $12, $13, $14,
      $15, $16::jsonb,
      $17::jsonb, $18::jsonb,
      $19
    )
    RETURNING id
  `,

  rollbackByLogId: `
    UPDATE enrichment_log
    SET rolled_back = TRUE,
        rolled_back_at = NOW()
    WHERE id = $1
    RETURNING *
  `,

  productDataForEnrichment: `
    SELECT
      p.id,
      p.handle,
      p.title,
      p.description,
      p.vendor,
      p.product_type,
      p.tags,
      p.image_alt,
      co.meta_title,
      co.meta_description,
      co.title_override,
      co.description_html,
      co.top_description_html,
      co.bottom_description_html,
      co.bullet_points,
      co.use_headless_title,
      co.use_headless_meta_title,
      co.use_headless_meta_description,
      co.use_headless_description,
      co.use_headless_top_description,
      co.use_headless_bottom_description,
      co.use_headless_bullets,
      co.is_published_headless
    FROM products p
    LEFT JOIN product_content_overrides co ON co.product_handle = p.handle
    WHERE p.handle = $1
    LIMIT 1
  `,

  collectionDataForEnrichment: `
    SELECT
      id,
      url_path,
      h1_title,
      meta_title,
      meta_description,
      short_description,
      long_description,
      faq_items,
      related_categories,
      status,
      parent_url,
      category_level
    FROM collection_content
    WHERE url_path = $1
    LIMIT 1
  `,

  upsertProductOverride: `
    INSERT INTO product_content_overrides (
      product_handle,
      meta_title,
      meta_description,
      title_override,
      description_html,
      top_description_html,
      bottom_description_html,
      bullet_points,
      use_headless_title,
      use_headless_meta_title,
      use_headless_meta_description,
      use_headless_description,
      use_headless_top_description,
      use_headless_bottom_description,
      use_headless_bullets
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb,
      TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
    )
    ON CONFLICT (product_handle) DO UPDATE SET
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description,
      title_override = EXCLUDED.title_override,
      description_html = EXCLUDED.description_html,
      top_description_html = EXCLUDED.top_description_html,
      bottom_description_html = EXCLUDED.bottom_description_html,
      bullet_points = EXCLUDED.bullet_points,
      use_headless_title = TRUE,
      use_headless_meta_title = TRUE,
      use_headless_meta_description = TRUE,
      use_headless_description = TRUE,
      use_headless_top_description = TRUE,
      use_headless_bottom_description = TRUE,
      use_headless_bullets = TRUE,
      updated_at = NOW()
  `,

  /** Metadata-only: SEO fields + bullets; leaves vendor description on PDP untouched */
  upsertProductMetadataOverride: `
    INSERT INTO product_content_overrides (
      product_handle,
      meta_title,
      meta_description,
      title_override,
      bullet_points,
      use_headless_title,
      use_headless_meta_title,
      use_headless_meta_description,
      use_headless_bullets,
      use_headless_description,
      use_headless_top_description,
      use_headless_bottom_description
    ) VALUES (
      $1, $2, $3, $4, $5::jsonb,
      TRUE, TRUE, TRUE, TRUE,
      FALSE, FALSE, FALSE
    )
    ON CONFLICT (product_handle) DO UPDATE SET
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description,
      title_override = EXCLUDED.title_override,
      bullet_points = EXCLUDED.bullet_points,
      use_headless_title = TRUE,
      use_headless_meta_title = TRUE,
      use_headless_meta_description = TRUE,
      use_headless_bullets = TRUE,
      use_headless_description = FALSE,
      use_headless_top_description = FALSE,
      use_headless_bottom_description = FALSE,
      updated_at = NOW()
  `,

  /** Collective framework: metadata + optional normalised supplier HTML + augment blocks */
  upsertProductCollectiveOverride: `
    INSERT INTO product_content_overrides (
      product_handle,
      meta_title,
      meta_description,
      title_override,
      bullet_points,
      description_html,
      top_description_html,
      bottom_description_html,
      use_headless_title,
      use_headless_meta_title,
      use_headless_meta_description,
      use_headless_bullets,
      use_headless_description,
      use_headless_top_description,
      use_headless_bottom_description
    ) VALUES (
      $1, $2, $3, $4, $5::jsonb,
      $6, $7, $8,
      TRUE, TRUE, TRUE, TRUE,
      $9, $10, $11
    )
    ON CONFLICT (product_handle) DO UPDATE SET
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description,
      title_override = EXCLUDED.title_override,
      bullet_points = EXCLUDED.bullet_points,
      description_html = CASE WHEN $9 THEN EXCLUDED.description_html ELSE product_content_overrides.description_html END,
      top_description_html = CASE WHEN $10 THEN EXCLUDED.top_description_html ELSE product_content_overrides.top_description_html END,
      bottom_description_html = CASE WHEN $11 THEN EXCLUDED.bottom_description_html ELSE product_content_overrides.bottom_description_html END,
      use_headless_title = TRUE,
      use_headless_meta_title = TRUE,
      use_headless_meta_description = TRUE,
      use_headless_bullets = TRUE,
      use_headless_description = EXCLUDED.use_headless_description,
      use_headless_top_description = EXCLUDED.use_headless_top_description,
      use_headless_bottom_description = EXCLUDED.use_headless_bottom_description,
      updated_at = NOW()
  `,

  updateCollectionContent: `
    UPDATE collection_content
    SET
      h1_title = $2,
      meta_title = $3,
      meta_description = $4,
      short_description = $5,
      long_description = $6,
      faq_items = $7::jsonb,
      related_categories = $8::jsonb,
      generated_by = 'seo-enrichment',
      version = COALESCE(version, 1) + 1,
      updated_at = NOW()
    WHERE url_path = $1
  `,

  upsertInternalLinkSuggestion: `
    INSERT INTO internal_link_graph (
      source_path,
      target_path,
      anchor_text,
      link_context,
      link_type,
      is_suggested
    ) VALUES ($1, $2, $3, $4, $5, TRUE)
    ON CONFLICT (source_path, target_path)
    DO UPDATE SET
      anchor_text = EXCLUDED.anchor_text,
      link_context = EXCLUDED.link_context,
      link_type = EXCLUDED.link_type,
      is_suggested = TRUE,
      updated_at = NOW()
  `,

  insertPageMetricsHistory: `
    INSERT INTO page_metrics_history (
      page_type,
      page_identifier,
      canonical_path,
      total_impressions,
      total_clicks,
      avg_position,
      avg_ctr,
      top_queries,
      high_impression_low_position,
      high_impression_low_ctr,
      sessions,
      revenue,
      conversions,
      bounce_rate,
      avg_session_duration,
      add_to_carts,
      transactions,
      period_start,
      period_end
    ) VALUES (
      $1, $2, $3,
      $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb,
      $11, $12, $13, $14, $15, $16, $17,
      $18::date, $19::date
    )
    ON CONFLICT (page_type, page_identifier, period_start, period_end)
    DO NOTHING
  `,

  getSerpCache: `
    SELECT results, analysis
    FROM serp_cache
    WHERE query = $1
      AND expires_at > NOW()
    LIMIT 1
  `,

  upsertSerpCache: `
    INSERT INTO serp_cache (query, results, analysis)
    VALUES ($1, $2::jsonb, $3::jsonb)
    ON CONFLICT (query) DO UPDATE SET
      results = EXCLUDED.results,
      analysis = EXCLUDED.analysis,
      crawled_at = NOW(),
      expires_at = NOW() + INTERVAL '7 days'
  `,
} as const;

