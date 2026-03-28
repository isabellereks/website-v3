import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

interface UpdatePlaylistBody {
  track_ids: string[];
}

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<Response> {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const { id } = await params;
  const { track_ids }: UpdatePlaylistBody = await request.json();
  const { data, error } = await supabaseAdmin
    .from('playlists')
    .update({ track_ids })
    .eq('id', id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request: NextRequest, { params }: RouteContext): Promise<Response> {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const { id } = await params;
  const { error } = await supabaseAdmin.from('playlists').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
