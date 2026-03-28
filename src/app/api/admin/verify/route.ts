import { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
  const { key } = await request.json();
  const ok = key === process.env.ADMIN_KEY;
  return Response.json({ ok });
}
