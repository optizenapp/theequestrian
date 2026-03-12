-- Seed default "Uncategorized" article category if missing
INSERT INTO article_category (category_id, slug, name, description, sort_order)
SELECT gen_random_uuid(), 'uncategorized', 'Uncategorized', 'Articles without a category', 0
WHERE NOT EXISTS (SELECT 1 FROM article_category WHERE slug = 'uncategorized' OR name ILIKE '%Uncategorized%');
