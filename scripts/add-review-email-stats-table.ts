#!/usr/bin/env node
/**
 * Add review_email_sends table for tracking email statistics
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { sql } = require('@vercel/postgres');

async function runMigration() {
  try {
    console.log('🗄️  Adding review_email_sends table...\n');

    // Create table
    try {
      console.log('  1. Creating review_email_sends table...');
      await sql`
        CREATE TABLE IF NOT EXISTS review_email_sends (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id VARCHAR(255) NOT NULL,
          order_number VARCHAR(255),
          customer_email VARCHAR(255) NOT NULL,
          customer_name VARCHAR(255),
          product_title VARCHAR(500),
          product_handle VARCHAR(255),
          scheduled_at TIMESTAMP WITH TIME ZONE,
          sent_at TIMESTAMP WITH TIME ZONE,
          status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed')),
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      console.log('     ✅ Table created\n');
    } catch (error: any) {
      if (error?.code === '42P07' || error?.message?.includes('already exists')) {
        console.log('     ⚠️  Table already exists (skipping)\n');
      } else {
        throw error;
      }
    }

    // Create indexes
    try {
      console.log('  2. Creating indexes...');
      await sql`
        CREATE INDEX IF NOT EXISTS idx_review_email_sends_order_id ON review_email_sends(order_id);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_review_email_sends_customer_email ON review_email_sends(customer_email);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_review_email_sends_sent_at ON review_email_sends(sent_at DESC);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_review_email_sends_status ON review_email_sends(status);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_review_email_sends_created_at ON review_email_sends(created_at DESC);
      `;
      console.log('     ✅ All indexes created\n');
    } catch (error: any) {
      if (error?.code === '42P07' || error?.message?.includes('already exists')) {
        console.log('     ⚠️  Some indexes already exist (skipping)\n');
      } else {
        throw error;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Review email stats table is ready.');
    console.log('   The webhook will now automatically track all email sends.\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
