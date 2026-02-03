 import { NextResponse } from 'next/server';

 export async function GET() {
   return NextResponse.json({
     status: 'not_configured',
     message: 'Feed integrations are not configured yet.',
     feeds: [
       { id: 'gmc', name: 'Google Merchant Center', status: 'pending', lastSync: null },
       { id: 'facebook', name: 'Facebook Catalog', status: 'pending', lastSync: null },
       { id: 'pixel', name: 'Pixel tracking', status: 'pending', lastSync: null },
     ],
   });
 }
