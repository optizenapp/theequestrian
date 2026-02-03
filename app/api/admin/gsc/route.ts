 import { NextResponse } from 'next/server';

 export async function GET() {
   return NextResponse.json({
     status: 'not_configured',
     message: 'Google Search Console integration is not configured yet.',
     data: {
       clicks: 0,
       impressions: 0,
       ctr: 0,
       position: 0,
     },
   });
 }
