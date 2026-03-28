import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext): Promise<Response> {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const { id } = await params;
  const { error } = await supabaseAdmin.from('community_songs').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
