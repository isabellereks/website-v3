import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth';

interface DeezerSearchResponse {
  data?: Array<{
    preview: string;
  }>;
}

interface CreateSongBody {
  title: string;
  artist: string;
  album?: string;
  art_url?: string;
  preview_url?: string;
  spotify_id?: string;
}

async function getDeezerPreview(title: string, artist: string): Promise<string | null> {
  try {
    const cleanTitle = title.replace(/\(feat\..*?\)/gi, '').replace(/\[.*?\]/g, '').trim();
    const cleanArtist = artist.split(',')[0].trim();
    const q = `${cleanTitle} ${cleanArtist}`.slice(0, 60);
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) return null;
    const data: DeezerSearchResponse = await res.json();
    return data.data?.[0]?.preview || null;
  } catch { return null; }
}

export async function GET(): Promise<Response> {
  const { data, error } = await supabaseAdmin
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const songs = data || [];
  const needsRefresh = songs.filter((song: { preview_url?: string }) => {
    if (!song.preview_url) return true;
    const match = song.preview_url.match(/exp=(\d+)/);
    if (!match) return true;
    const expiry = parseInt(match[1]) * 1000;
    return Date.now() > expiry - 10 * 60 * 1000;
  });

  if (needsRefresh.length > 0) {
    await Promise.all(
      needsRefresh.map(async (song: CreateSongBody & { id: string }) => {
        const freshUrl = await getDeezerPreview(song.title, song.artist);
        if (freshUrl) {
          song.preview_url = freshUrl;
          supabaseAdmin.from('songs').update({ preview_url: freshUrl }).eq('id', song.id).then(() => {});
        }
      })
    );
  }

  return Response.json(songs);
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const body: CreateSongBody = await request.json();
  const { title, artist, album, art_url, preview_url, spotify_id } = body;
  if (!title || !artist) return Response.json({ error: 'title and artist required' }, { status: 400 });

  let audioUrl: string | null = preview_url || null;
  if (!audioUrl) {
    try {
      const q = `${title} ${artist}`.slice(0, 80);
      const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`);
      const d: DeezerSearchResponse = await res.json();
      audioUrl = d.data?.[0]?.preview || null;
    } catch { /* no-op */ }
  }

  const { data, error } = await supabaseAdmin
    .from('songs')
    .insert({ title, artist, album: album || null, art_url: art_url || null, preview_url: audioUrl, spotify_id: spotify_id || null })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<Response> {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabaseAdmin.from('songs').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
