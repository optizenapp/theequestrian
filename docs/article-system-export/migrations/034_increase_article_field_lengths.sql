-- Increase column lengths for articles to handle long WP URLs and titles
ALTER TABLE article ALTER COLUMN title TYPE VARCHAR(1000);
ALTER TABLE article ALTER COLUMN featured_image_url TYPE VARCHAR(2000);
ALTER TABLE article ALTER COLUMN author_image_url TYPE VARCHAR(1000);

