import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Deprecated',
      message: 'Resend webhooks are disabled. Configure SES events instead.',
    },
    { status: 410 }
  );
}
