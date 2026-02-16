"""All SQL queries for the enrichment pipeline."""


class PageQueries:
    """Queries for fetching pages to enrich."""

    # Denormalized product view for enrichment
    PRODUCT_ENRICHMENT_VIEW = """
        SELECT
            p.id AS product_id,
            p.handle AS product_handle,
            p.title AS shopify_title,
            p.description AS shopify_description,
            p.product_type,
            p.vendor,
            p.tags,
            p.image_url,
            p.image_alt,

            -- Current headless overrides
            co.id AS override_id,
            co.meta_title,
            co.meta_description,
            co.slug_override,
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
            co.is_published_headless,

            -- Category context (aggregated)
            COALESCE(
                json_agg(DISTINCT jsonb_build_object(
                    'canonical_path', pca.canonical_path,
                    'top_level', pca.top_level,
                    'parent_category', pca.parent_category,
                    'subcategory', pca.subcategory_handle
                )) FILTER (WHERE pca.id IS NOT NULL),
                '[]'
            ) AS categories

        FROM products p
        LEFT JOIN product_content_overrides co ON co.product_handle = p.handle
        LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
        WHERE p.handle = %(handle)s
        GROUP BY p.id, co.id
    """

    # Collection enrichment view
    COLLECTION_ENRICHMENT_VIEW = """
        SELECT
            cc.id,
            cc.url_path,
            cc.parent_url,
            cc.category_level,
            cc.breadcrumb_label,
            cc.h1_title,
            cc.meta_title,
            cc.meta_description,
            cc.short_description,
            cc.long_description,
            cc.faq_items,
            cc.related_categories,
            cc.status,
            cc.default_sort,
            cc.generated_by,
            cc.version,

            -- Taxonomy mapping
            cm.top_level,
            cm.parent_category,
            cm.subcategory_handle,
            cm.product_type AS mapped_product_type,

            -- Product count in this collection
            (SELECT COUNT(*)
             FROM product_category_assignments pca
             WHERE pca.canonical_path = cc.url_path
            ) AS product_count,

            -- Sibling collections (same parent)
            COALESCE(
                (SELECT json_agg(jsonb_build_object(
                    'url_path', sibling.url_path,
                    'h1_title', sibling.h1_title,
                    'breadcrumb_label', sibling.breadcrumb_label
                ))
                FROM collection_content sibling
                WHERE sibling.parent_url = cc.parent_url
                  AND sibling.url_path != cc.url_path
                  AND sibling.status = 'published'),
                '[]'
            ) AS sibling_collections,

            -- Child collections
            COALESCE(
                (SELECT json_agg(jsonb_build_object(
                    'url_path', child.url_path,
                    'h1_title', child.h1_title,
                    'breadcrumb_label', child.breadcrumb_label
                ))
                FROM collection_content child
                WHERE child.parent_url = cc.url_path
                  AND child.status = 'published'),
                '[]'
            ) AS child_collections

        FROM collection_content cc
        LEFT JOIN collection_mapping cm
            ON cm.top_level = split_part(cc.url_path, '/', 2)
           AND cm.parent_category = split_part(cc.url_path, '/', 3)
           AND cm.subcategory_handle = split_part(cc.url_path, '/', 4)
        WHERE cc.url_path = %(url_path)s
    """

    # Get all pages eligible for enrichment (not enriched in last N days)
    PAGES_NEEDING_ENRICHMENT = """
        WITH product_pages AS (
            SELECT
                'product' AS page_type,
                p.handle AS page_identifier,
                co.updated_at AS last_enriched,
                COALESCE(co.is_published_headless, true) AS is_active
            FROM products p
            LEFT JOIN product_content_overrides co ON co.product_handle = p.handle
        ),
        collection_pages AS (
            SELECT
                'collection' AS page_type,
                cc.url_path AS page_identifier,
                cc.updated_at AS last_enriched,
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
            WHERE created_at > NOW() - INTERVAL '%(interval_days)s days'
              AND applied = TRUE
        )
        SELECT
            ap.page_type,
            ap.page_identifier,
            ap.last_enriched
        FROM all_pages ap
        LEFT JOIN recently_enriched re
            ON re.page_type = ap.page_type
           AND re.page_identifier = ap.page_identifier
        WHERE re.page_identifier IS NULL
          AND ap.is_active = TRUE
        ORDER BY ap.last_enriched ASC NULLS FIRST
    """


class QueueQueries:
    """Queries for the enrichment queue."""

    ENQUEUE_PAGE = """
        INSERT INTO enrichment_queue (page_type, page_identifier, priority_score, priority_reasons, gsc_data, ga4_data)
        VALUES (%(page_type)s, %(page_identifier)s, %(priority_score)s, %(priority_reasons)s, %(gsc_data)s, %(ga4_data)s)
        ON CONFLICT (page_type, page_identifier, (scheduled_for::date))
        DO UPDATE SET
            priority_score = EXCLUDED.priority_score,
            priority_reasons = EXCLUDED.priority_reasons,
            gsc_data = EXCLUDED.gsc_data,
            ga4_data = EXCLUDED.ga4_data,
            updated_at = NOW()
        RETURNING id
    """

    CLAIM_NEXT_BATCH = """
        UPDATE enrichment_queue
        SET status = 'processing', started_at = NOW(), updated_at = NOW()
        WHERE id IN (
            SELECT id FROM enrichment_queue
            WHERE status = 'pending'
              AND scheduled_for <= NOW()
            ORDER BY priority_score DESC
            LIMIT %(batch_size)s
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
    """

    MARK_COMPLETED = """
        UPDATE enrichment_queue
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = %(id)s
    """

    MARK_FAILED = """
        UPDATE enrichment_queue
        SET status = 'failed',
            error_message = %(error)s,
            retry_count = retry_count + 1,
            updated_at = NOW()
        WHERE id = %(id)s
    """

    # Re-queue failed items (up to 3 retries)
    REQUEUE_FAILED = """
        UPDATE enrichment_queue
        SET status = 'pending', updated_at = NOW()
        WHERE status = 'failed'
          AND retry_count < 3
    """


class EnrichmentLogQueries:
    """Queries for the audit log."""

    INSERT_LOG = """
        INSERT INTO enrichment_log (
            queue_id, page_type, page_identifier,
            before_content, after_content,
            gsc_snapshot, ga4_snapshot, serp_analysis,
            enrichment_reasoning, model_used,
            prompt_tokens, completion_tokens, total_cost_usd,
            before_scores, after_scores,
            applied
        ) VALUES (
            %(queue_id)s, %(page_type)s, %(page_identifier)s,
            %(before_content)s, %(after_content)s,
            %(gsc_snapshot)s, %(ga4_snapshot)s, %(serp_analysis)s,
            %(enrichment_reasoning)s, %(model_used)s,
            %(prompt_tokens)s, %(completion_tokens)s, %(total_cost_usd)s,
            %(before_scores)s, %(after_scores)s,
            %(applied)s
        )
        RETURNING id
    """

    ROLLBACK_ENRICHMENT = """
        UPDATE enrichment_log
        SET rolled_back = TRUE, rolled_back_at = NOW()
        WHERE id = %(log_id)s
        RETURNING before_content, page_type, page_identifier
    """


class WriteQueries:
    """Queries for writing enriched content back."""

    UPSERT_PRODUCT_OVERRIDE = """
        INSERT INTO product_content_overrides (
            product_handle,
            meta_title, meta_description,
            title_override,
            description_html, top_description_html, bottom_description_html,
            bullet_points,
            use_headless_title, use_headless_meta_title, use_headless_meta_description,
            use_headless_description, use_headless_top_description,
            use_headless_bottom_description, use_headless_bullets
        ) VALUES (
            %(product_handle)s,
            %(meta_title)s, %(meta_description)s,
            %(title_override)s,
            %(description_html)s, %(top_description_html)s, %(bottom_description_html)s,
            %(bullet_points)s,
            TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
        )
        ON CONFLICT (product_handle)
        DO UPDATE SET
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
    """

    UPDATE_COLLECTION_CONTENT = """
        UPDATE collection_content SET
            h1_title = %(h1_title)s,
            meta_title = %(meta_title)s,
            meta_description = %(meta_description)s,
            short_description = %(short_description)s,
            long_description = %(long_description)s,
            faq_items = %(faq_items)s,
            related_categories = %(related_categories)s,
            generated_by = 'enrichment_pipeline',
            version = version + 1,
            updated_at = NOW()
        WHERE url_path = %(url_path)s
    """

    UPSERT_INTERNAL_LINK = """
        INSERT INTO internal_link_graph (source_path, target_path, anchor_text, link_context, link_type, is_suggested)
        VALUES (%(source_path)s, %(target_path)s, %(anchor_text)s, %(link_context)s, %(link_type)s, TRUE)
        ON CONFLICT (source_path, target_path)
        DO UPDATE SET
            anchor_text = EXCLUDED.anchor_text,
            link_context = EXCLUDED.link_context,
            link_type = EXCLUDED.link_type,
            updated_at = NOW()
    """


class SerpCacheQueries:
    """Queries for SERP cache."""

    GET_CACHED = """
        SELECT results, analysis, crawled_at
        FROM serp_cache
        WHERE query = %(query)s
          AND expires_at > NOW()
    """

    UPSERT_CACHE = """
        INSERT INTO serp_cache (query, results, analysis)
        VALUES (%(query)s, %(results)s, %(analysis)s)
        ON CONFLICT (query)
        DO UPDATE SET
            results = EXCLUDED.results,
            analysis = EXCLUDED.analysis,
            crawled_at = NOW(),
            expires_at = NOW() + INTERVAL '7 days'
    """
