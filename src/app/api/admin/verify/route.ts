import { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const ok = key === process.env.ADMIN_KEY;
  return Response.json({ ok });
}
