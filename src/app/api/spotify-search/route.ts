import { NextRequest } from 'next/server';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let cachedToken: string | null = null;
let tokenExpiry = 0;

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  preview_url: string | null;
}

interface SpotifySearchResponse {
  tracks?: {
    items: SpotifyTrack[];
  };
}

interface DeezerSearchResponse {
  data?: Array<{
    preview: string;
  }>;
}

interface SearchResultTrack {
  title: string;
  artist: string;
  album: string;
  art_url: string | null;
  preview_url: string | null;
  spotify_id: string;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('Failed to get Spotify token');
  const data: SpotifyTokenResponse = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

// Fallback: get 30s preview from Deezer (free, no auth needed)
async function getDeezerPreview(title: string, artist: string): Promise<string | null> {
  try {
    const q = `${title} ${artist}`.slice(0, 80);
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) return null;
    const data: DeezerSearchResponse = await res.json();
    return data.data?.[0]?.preview || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return Response.json({ error: 'query parameter required' }, { status: 400 });
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return Response.json({ error: 'Spotify credentials not configured' }, { status: 500 });
  }

  try {
    const token = await getToken();
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('Search failed');
    const data: SpotifySearchResponse = await res.json();

    const spotifyTracks: SearchResultTrack[] = (data.tracks?.items || []).slice(0, 5).map((t) => ({
      title: t.name,
      artist: t.artists?.map((a) => a.name).join(', ') || 'Unknown',
      album: t.album?.name || 'Unknown',
      art_url: t.album?.images?.[0]?.url || null,
      preview_url: t.preview_url || null,
      spotify_id: t.id,
    }));

    // Fill in missing previews from Deezer
    const tracks: SearchResultTrack[] = await Promise.all(
      spotifyTracks.map(async (t) => {
        if (!t.preview_url) {
          t.preview_url = await getDeezerPreview(t.title, t.artist);
        }
        return t;
      })
    );

    return Response.json(tracks);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
