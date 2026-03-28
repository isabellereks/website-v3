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

interface FormattedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  art: string | null;
  previewUrl: string | null;
}

async function getAccessToken(): Promise<string> {
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

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const trackId = searchParams.get('trackId');

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return Response.json(
      { error: 'Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local' },
      { status: 500 }
    );
  }

  try {
    const token = await getAccessToken();

    if (trackId) {
      const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Track not found');
      const track: SpotifyTrack = await res.json();
      return Response.json(formatTrack(track));
    }

    if (query) {
      const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Search failed');
      const data: SpotifySearchResponse = await res.json();
      return Response.json({
        tracks: (data.tracks?.items || []).map(formatTrack),
      });
    }

    return Response.json({ error: 'Provide q or trackId parameter' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

function formatTrack(track: SpotifyTrack): FormattedTrack {
  return {
    id: track.id,
    title: track.name,
    artist: track.artists?.map((a) => a.name).join(', ') || 'Unknown',
    album: track.album?.name || 'Unknown',
    art: track.album?.images?.[0]?.url || null,
    previewUrl: track.preview_url || null,
  };
}
