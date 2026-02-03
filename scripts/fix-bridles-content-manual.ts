#!/usr/bin/env tsx
/**
 * Manual fix for /horse/tack/bridles content
 * Updates all fields with correct bridles content (not browbands)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ Missing POSTGRES_URL or DATABASE_URL');
  process.exit(1);
}

const sql = neon(connectionString);

const content = {
  h1_title: 'Bridles',
  breadcrumb_label: 'Bridles',
  meta_title: 'Bridles | The Equestrian',
  meta_description: 'Shop premium bridles from top equestrian brands. Quality leather bridles, anatomic designs, and bridle accessories. Free shipping Australia-wide.',
  short_description: 'Discover premium bridles from top equestrian brands. Quality leather bridles, anatomic designs, and bridle accessories for every discipline. Free shipping Australia-wide.',
  long_description: `<h2>Premium Bridles</h2>

<p>Explore quality bridles crafted from premium European leather. Each bridle features adjustable nosebands, padded headpieces, and stainless steel fittings built to last. From schooling bridles to competition show bridles, our collection covers every discipline - dressage, jumping, eventing, and showing. We stock leading manufacturers known for their craftsmanship, comfort, and classical styling. All available for fast delivery across Australia.</p>

<h3>What Makes Great Bridles?</h3>

<ul>
<li><strong>Quality Materials:</strong> Premium leather and stainless steel built to last</li>
<li><strong>Adjustable Fit:</strong> Multiple adjustment points for perfect horse comfort</li>
<li><strong>Classic Styling:</strong> Traditional designs that look professional in any setting</li>
<li><strong>Reliable Hardware:</strong> Buckles and fittings that won't rust or break</li>
</ul>

<h3>Shop by Type</h3>

<p>Browse our complete range of <a href="/horse/tack/bridles/browbands">browbands</a>, <a href="/horse/tack/reins">reins</a>, and other <a href="/horse/tack">tack essentials</a>.</p>`,
  faq_items: JSON.stringify([
    {
      question: "How do I choose the right bridle?",
      answer: "Consider your discipline, horse's head shape, and level of competition. Dressage bridles typically have a flash or crank noseband, while jumping bridles often feature a plain cavesson. Measure your horse's head and check our sizing guide for the best fit."
    },
    {
      question: "Do you offer free shipping on bridles?",
      answer: "Yes! We offer free shipping Australia-wide on all bridles. Orders are typically dispatched within 1-2 business days, with delivery times varying by location."
    },
    {
      question: "What's the difference between a snaffle bridle and a double bridle?",
      answer: "A snaffle bridle has one bit and is used for everyday riding and most competitions. A double bridle (or Weymouth bridle) has two bits - a bradoon and a curb - and is typically used in advanced dressage. Double bridles require more experienced hands."
    },
    {
      question: "How do I care for my leather bridle?",
      answer: "Clean your bridle after each use with a damp cloth to remove sweat and dirt. Apply leather conditioner regularly to keep the leather supple. Store in a cool, dry place away from direct sunlight. Check all stitching and hardware regularly for wear."
    }
  ])
};

(async () => {
  console.log('🔧 Fixing /horse/tack/bridles - COMPLETE CONTENT UPDATE\n');
  
  // Check current state
  const before = await sql`
    SELECT url_path, h1_title, short_description, long_description, faq_items
    FROM collection_content
    WHERE url_path = '/horse/tack/bridles'
  `;
  
  if (before.length === 0) {
    console.log('❌ Page not found in database');
    process.exit(1);
  }
  
  console.log('📋 BEFORE:');
  console.log(`  H1: ${before[0].h1_title}`);
  console.log(`  Short: ${before[0].short_description?.substring(0, 50)}...`);
  console.log(`  Long: ${before[0].long_description?.substring(0, 50)}...`);
  const beforeFaqs = Array.isArray(before[0].faq_items) ? before[0].faq_items : [];
  console.log(`  FAQs: ${beforeFaqs.length} questions`);
  if (beforeFaqs.length > 0) {
    console.log(`    - "${beforeFaqs[0].question}"`);
  }
  
  // Update ALL content fields
  await sql`
    UPDATE collection_content
    SET 
      h1_title = ${content.h1_title},
      breadcrumb_label = ${content.breadcrumb_label},
      meta_title = ${content.meta_title},
      meta_description = ${content.meta_description},
      short_description = ${content.short_description},
      long_description = ${content.long_description},
      faq_items = ${content.faq_items}::jsonb,
      updated_at = NOW()
    WHERE url_path = '/horse/tack/bridles'
  `;
  
  // Check after
  const after = await sql`
    SELECT url_path, h1_title, short_description, long_description, faq_items
    FROM collection_content
    WHERE url_path = '/horse/tack/bridles'
  `;
  
  console.log('\n✅ AFTER:');
  console.log(`  H1: ${after[0].h1_title}`);
  console.log(`  Short: ${after[0].short_description?.substring(0, 50)}...`);
  console.log(`  Long: ${after[0].long_description?.substring(0, 50)}...`);
  const afterFaqs = Array.isArray(after[0].faq_items) ? after[0].faq_items : [];
  console.log(`  FAQs: ${afterFaqs.length} questions`);
  if (afterFaqs.length > 0) {
    console.log(`    - "${afterFaqs[0].question}"`);
  }
  
  console.log('\n✅ Complete! /horse/tack/bridles now has correct content.');
})();
