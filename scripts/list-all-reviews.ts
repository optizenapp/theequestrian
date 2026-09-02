import { sql } from '@/lib/db/vercel-postgres';

async function listAllReviewedProducts() {
  try {
    console.log('Fetching all products with reviews...');
    
    const result = await sql`
      SELECT 
        product_handle,
        COUNT(*) as review_count,
        AVG(rating)::numeric(3,2) as avg_rating
      FROM reviews
      WHERE status = 'approved'
      GROUP BY product_handle
      ORDER BY review_count DESC;
    `;

    if (result.rows.length === 0) {
      console.log('No approved reviews found in the database.');
      return;
    }

    console.log(`\nFound ${result.rows.length} products with reviews:\n`);
    
    result.rows.forEach(row => {
      console.log(`${row.product_handle} (${row.review_count} reviews, ${row.avg_rating}⭐)`);
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
  }
}

listAllReviewedProducts();
