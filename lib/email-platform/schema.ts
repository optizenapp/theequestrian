import { sql } from '@vercel/postgres';

export async function ensureEmailPlatformSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS email_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      primary_email TEXT NOT NULL UNIQUE,
      shopify_customer_id TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      accepts_marketing BOOLEAN DEFAULT true,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_contact_identities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      external_id TEXT NOT NULL,
      external_email TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, external_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_subscriptions (
      contact_id UUID PRIMARY KEY REFERENCES email_contacts(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'suppressed', 'pending')),
      source TEXT NOT NULL DEFAULT 'import',
      consent_captured_at TIMESTAMPTZ,
      unsubscribed_at TIMESTAMPTZ,
      suppression_reason TEXT,
      unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS customer_order_facts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id TEXT NOT NULL UNIQUE,
      order_number TEXT,
      shopify_customer_id TEXT,
      contact_id UUID REFERENCES email_contacts(id) ON DELETE SET NULL,
      customer_email TEXT,
      order_created_at TIMESTAMPTZ,
      order_fulfilled_at TIMESTAMPTZ,
      financial_status TEXT,
      fulfillment_status TEXT,
      cancelled_at TIMESTAMPTZ,
      currency TEXT,
      subtotal_amount NUMERIC(12,2),
      total_amount NUMERIC(12,2),
      total_refunded_amount NUMERIC(12,2),
      line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS customer_aggregate_metrics (
      contact_id UUID PRIMARY KEY REFERENCES email_contacts(id) ON DELETE CASCADE,
      order_count INTEGER NOT NULL DEFAULT 0,
      lifetime_value NUMERIC(12,2) NOT NULL DEFAULT 0,
      average_order_value NUMERIC(12,2) NOT NULL DEFAULT 0,
      first_order_at TIMESTAMPTZ,
      last_order_at TIMESTAMPTZ,
      last_order_days_ago INTEGER,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS customer_product_affinity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,
      product_type TEXT,
      vendor TEXT,
      product_handle TEXT,
      order_count INTEGER NOT NULL DEFAULT 0,
      total_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(contact_id, product_type, vendor, product_handle)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_lists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_list_memberships (
      list_id UUID NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (list_id, contact_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_segments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      rules JSONB NOT NULL DEFAULT '{"mode":"all","conditions":[]}'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_evaluated_at TIMESTAMPTZ,
      total_members INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_segment_memberships (
      segment_id UUID NOT NULL REFERENCES email_segments(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,
      computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(segment_id, contact_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      template_type TEXT NOT NULL CHECK (template_type IN ('campaign', 'sequence_step', 'review')),
      active_version_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_template_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      subject_template TEXT NOT NULL,
      html_template TEXT NOT NULL,
      blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
      from_name TEXT,
      from_email TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(template_id, version_number)
    )
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'email_templates_active_version_fk'
          AND conrelid = 'email_templates'::regclass
      ) THEN
        ALTER TABLE email_templates
          ADD CONSTRAINT email_templates_active_version_fk
          FOREIGN KEY (active_version_id) REFERENCES email_template_versions(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled', 'pending_approval')),
      template_version_id UUID REFERENCES email_template_versions(id) ON DELETE SET NULL,
      audience JSONB NOT NULL DEFAULT '{}'::jsonb,
      scheduled_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      failure_reason TEXT,
      created_by TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb
  `;
  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_campaigns_status_check' AND conrelid = 'email_campaigns'::regclass) THEN
        ALTER TABLE email_campaigns DROP CONSTRAINT email_campaigns_status_check;
      END IF;
      ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_status_check
        CHECK (status IN ('draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled', 'pending_approval'));
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_campaign_recipients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'scheduled', 'sent', 'delivered', 'failed', 'cancelled', 'skipped')),
      skip_reason TEXT,
      provider_message_id TEXT,
      scheduled_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(campaign_id, contact_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
      trigger_type TEXT NOT NULL CHECK (trigger_type IN ('new_customer', 'first_order', 'repeat_customer', 'product_type_purchased', 'ltv_threshold_crossed', 'winback_eligible')),
      trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
      active_version_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_sequence_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      entry_rules JSONB NOT NULL DEFAULT '{"mode":"all","conditions":[]}'::jsonb,
      stop_rules JSONB NOT NULL DEFAULT '{"mode":"any","conditions":[]}'::jsonb,
      is_published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(sequence_id, version_number)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_sequence_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sequence_version_id UUID NOT NULL REFERENCES email_sequence_versions(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      step_type TEXT NOT NULL CHECK (step_type IN ('wait', 'send_email', 'condition_gate')),
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(sequence_version_id, step_order)
    )
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'email_sequences_active_version_fk'
          AND conrelid = 'email_sequences'::regclass
      ) THEN
        ALTER TABLE email_sequences
          ADD CONSTRAINT email_sequences_active_version_fk
          FOREIGN KEY (active_version_id) REFERENCES email_sequence_versions(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
      sequence_version_id UUID NOT NULL REFERENCES email_sequence_versions(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES email_contacts(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped', 'failed')),
      current_step_order INTEGER NOT NULL DEFAULT 1,
      enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      exited_at TIMESTAMPTZ,
      exit_reason TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      UNIQUE(sequence_id, sequence_version_id, contact_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_sequence_step_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enrollment_id UUID NOT NULL REFERENCES email_sequence_enrollments(id) ON DELETE CASCADE,
      step_id UUID NOT NULL REFERENCES email_sequence_steps(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'skipped')),
      ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      details JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_sends (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id UUID REFERENCES email_contacts(id) ON DELETE SET NULL,
      recipient_email TEXT NOT NULL,
      campaign_recipient_id UUID REFERENCES email_campaign_recipients(id) ON DELETE SET NULL,
      sequence_execution_id UUID REFERENCES email_sequence_step_executions(id) ON DELETE SET NULL,
      template_version_id UUID REFERENCES email_template_versions(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('draft', 'queued', 'scheduled', 'sent', 'delivered', 'failed', 'cancelled')),
      provider TEXT NOT NULL DEFAULT 'ses',
      provider_message_id TEXT,
      subject TEXT,
      scheduled_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,
      clicked_at TIMESTAMPTZ,
      open_count INTEGER NOT NULL DEFAULT 0,
      click_count INTEGER NOT NULL DEFAULT 0,
      cancelled_at TIMESTAMPTZ,
      error_message TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ`;
  await sql`ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ`;
  await sql`ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS open_count INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE email_sends ALTER COLUMN provider SET DEFAULT 'ses'`;

  await sql`
    CREATE TABLE IF NOT EXISTS email_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      send_id UUID REFERENCES email_sends(id) ON DELETE SET NULL,
      provider TEXT NOT NULL DEFAULT 'ses',
      provider_message_id TEXT,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE email_events ALTER COLUMN provider SET DEFAULT 'ses'`;

  await sql`
    CREATE TABLE IF NOT EXISTS email_link_clicks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      send_id UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
      clicked_url TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_email_contacts_primary_email ON email_contacts(primary_email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_contacts_shopify_customer_id ON email_contacts(shopify_customer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_subscriptions_status ON email_subscriptions(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_customer_order_facts_contact_id ON customer_order_facts(contact_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_customer_order_facts_order_created_at ON customer_order_facts(order_created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_customer_order_facts_shopify_customer_id ON customer_order_facts(shopify_customer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_list_memberships_contact ON email_list_memberships(contact_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_segment_memberships_contact ON email_segment_memberships(contact_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign ON email_campaign_recipients(campaign_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_status ON email_campaign_recipients(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_sequence_enrollments_next_run ON email_sequence_enrollments(next_run_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_sends_recipient_email ON email_sends(recipient_email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_sends_provider_message_id ON email_sends(provider_message_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_recipient_id ON email_sends(campaign_recipient_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_sends_opened_at ON email_sends(opened_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_sends_clicked_at ON email_sends(clicked_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_events_provider_message_id ON email_events(provider_message_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_link_clicks_send_id ON email_link_clicks(send_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_link_clicks_clicked_at ON email_link_clicks(clicked_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS email_platform_config (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO email_platform_config (key, value, updated_at)
    VALUES ('auto_weekly_enabled', '{"enabled": false}'::jsonb, NOW())
    ON CONFLICT (key) DO NOTHING
  `;
}
