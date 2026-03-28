import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

interface HeartActionBody {
  action: 'like' | 'unlike';
}

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  const { action }: HeartActionBody = await request.json();

  if (action !== 'like' && action !== 'unlike') {
    return Response.json({ error: 'action must be "like" or "unlike"' }, { status: 400 });
  }

  // Get current hearts
  const { data: song, error: fetchError } = await supabaseAdmin
    .from('community_songs')
    .select('hearts')
    .eq('id', id)
    .single();

  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });

  const currentHearts = (song as { hearts: number } | null)?.hearts || 0;
  const newHearts = Math.max(0, currentHearts + (action === 'like' ? 1 : -1));

  const { data, error } = await supabaseAdmin
    .from('community_songs')
    .update({ hearts: newHearts })
    .eq('id', id)
    .select('hearts')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ hearts: (data as { hearts: number }).hearts });
}
