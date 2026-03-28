import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface DeezerSearchResponse {
  data?: Array<{
    preview: string;
  }>;
}

interface CommunitySongBody {
  title: string;
  artist: string;
  album?: string;
  art_url?: string;
  preview_url?: string;
  spotify_id?: string;
  submitted_by?: string;
}

export async function GET(): Promise<Response> {
  const { data, error } = await supabaseAdmin
    .from('community_songs')
    .select('*')
    .order('hearts', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Check which songs have expired or missing Deezer preview URLs
  const songs = data || [];
  const needsRefresh = songs.filter((song: { preview_url?: string }) => {
    if (!song.preview_url) return true;
    // Parse exp= from Deezer URL
    const match = song.preview_url.match(/exp=(\d+)/);
    if (!match) return true;
    const expiry = parseInt(match[1]) * 1000;
    // Refresh if expires within 10 minutes
    return Date.now() > expiry - 10 * 60 * 1000;
  });

  // Only hit Deezer for songs that need it
  if (needsRefresh.length > 0) {
    await Promise.all(
      needsRefresh.map(async (song: CommunitySongBody & { id: string }) => {
        const freshUrl = await getDeezerPreview(song.title, song.artist);
        if (freshUrl) {
          song.preview_url = freshUrl;
          supabaseAdmin.from('community_songs').update({ preview_url: freshUrl }).eq('id', song.id).then(() => {});
        }
      })
    );
  }

  return Response.json(songs);
}

async function getDeezerPreview(title: string, artist: string): Promise<string | null> {
  try {
    // Clean up title/artist for better search results
    const cleanTitle = title.replace(/\(feat\..*?\)/gi, '').replace(/\[.*?\]/g, '').trim();
    const cleanArtist = artist.split(',')[0].trim();
    const q = `${cleanTitle} ${cleanArtist}`.slice(0, 60);
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) return null;
    const data: DeezerSearchResponse = await res.json();
    return data.data?.[0]?.preview || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const body: CommunitySongBody = await request.json();
  const { title, artist, album, art_url, preview_url, spotify_id, submitted_by } = body;

  if (!title || !artist) {
    return Response.json({ error: 'title and artist required' }, { status: 400 });
  }

  // If no preview URL, try Deezer
  let audioUrl: string | null = preview_url || null;
  if (!audioUrl) {
    audioUrl = await getDeezerPreview(title, artist);
  }

  const { data, error } = await supabaseAdmin
    .from('community_songs')
    .insert({
      title,
      artist,
      album: album || null,
      art_url: art_url || null,
      preview_url: audioUrl,
      spotify_id: spotify_id || null,
      submitted_by: submitted_by || 'anonymous',
      hearts: 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
