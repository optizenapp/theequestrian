 import { NextResponse } from 'next/server';

 export async function GET() {
   return NextResponse.json({
     status: 'not_configured',
     message: 'Email service not configured. Replace Moosend with Mailgun/SendGrid.',
     campaigns: [],
   });
 }
