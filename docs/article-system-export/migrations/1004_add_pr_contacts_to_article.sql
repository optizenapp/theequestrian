-- ============================================================================
-- CANONICAL MIGRATION SCRIPT: scripts/run-migration.js
-- Run with: node scripts/run-migration.js --env=staging --file=1004_add_pr_contacts_to_article.sql
-- ============================================================================

-- Add pr_contacts JSONB column to article table
-- Stores PR contact emails and send status for publish notifications
-- Structure: { "emails": "a@example.com, b@example.com", "sent_at": "ISO8601", "sent_by": "uuid" }
ALTER TABLE article ADD COLUMN IF NOT EXISTS pr_contacts JSONB;

COMMENT ON COLUMN article.pr_contacts IS 'PR contact emails and notification status. { emails: string, sent_at: ISO8601|null, sent_by: uuid|null }';

-- Insert PR article published email template
INSERT INTO email_template (
  template_key, name, description, subject,
  html_body, text_body, from_name, from_email, reply_to, placeholders
) VALUES (
  'pr_article_published',
  'PR Article Published Notification',
  'Sent to PR contacts when their article is published on Yorkshire.com',
  'Your content is now live on Yorkshire.com',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Content is Live</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #000; color: #fff; padding: 30px; text-align: center;">
    <h1 style="margin: 0; font-size: 32px;">YORKSHIRE<span style="color: #d4145a;">.COM</span></h1>
    <p style="margin: 10px 0 0 0; color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Content Notification</p>
  </div>
  
  <div style="padding: 40px 30px; background: #f9f9f9;">
    <h2 style="color: #000; margin: 0 0 20px 0;">Your Content is Now Live!</h2>
    <p>Hi {{contact_name}},</p>
    <p>Thanks for your submission. We''re pleased to let you know that the following content is now live on Yorkshire.com:</p>
    
    <div style="background: #fff; padding: 20px; margin: 20px 0; border-left: 4px solid #d4145a;">
      <h3 style="margin: 0 0 10px 0; color: #d4145a;">{{article_title}}</h3>
      <a href="{{article_url}}" style="color: #d4145a; text-decoration: underline; word-break: break-all;">{{article_url}}</a>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{article_url}}" style="display: inline-block; background: #d4145a; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold;">View Article</a>
    </div>

    <div style="background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #eee; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Want to reach more people?</h3>
      <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">Yorkshire.com offers advertising and sponsored content opportunities to help you reach our growing audience across Yorkshire.</p>
      <a href="{{advertise_url}}" style="color: #d4145a; font-weight: bold; text-decoration: underline;">Learn about advertising options &rarr;</a>
    </div>
  </div>
  
  <div style="padding: 20px 30px; background: #000; color: #999; font-size: 12px; text-align: center;">
    <p>&copy; {{current_year}} Yorkshire.com. All rights reserved.</p>
    <p style="margin: 5px 0 0 0;">114 Wellington Street, Leeds, West Yorkshire LS1 1BA</p>
  </div>
</body>
</html>',
  'Your Content is Now Live on Yorkshire.com

Hi {{contact_name}},

Thanks for your submission. We''re pleased to let you know that the following content is now live:

{{article_title}}
{{article_url}}

---

Want to reach more people?
Yorkshire.com offers advertising and sponsored content opportunities.
Learn more: {{advertise_url}}

---
Yorkshire.com
© {{current_year}} All rights reserved
114 Wellington Street, Leeds, West Yorkshire LS1 1BA',
  'Yorkshire.com',
  'noreply@yorkshire.com',
  'editorial@yorkshire.com',
  '[{"key": "contact_name", "description": "PR contact name or greeting"}, {"key": "article_title", "description": "Published article title"}, {"key": "article_url", "description": "Full URL to the published article"}, {"key": "advertise_url", "description": "Link to advertising page"}, {"key": "current_year", "description": "Current year"}]'::jsonb
) ON CONFLICT (template_key) DO NOTHING;
