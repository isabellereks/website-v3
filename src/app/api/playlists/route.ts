import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth';

interface CreatePlaylistBody {
  name: string;
}

export async function GET(): Promise<Response> {
  const { data, error } = await supabaseAdmin
    .from('playlists')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const { name }: CreatePlaylistBody = await request.json();
  if (!name) return Response.json({ error: 'name required' }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('playlists')
    .insert({ name, track_ids: [] })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
