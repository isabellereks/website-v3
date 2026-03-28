// Curated/hardcoded tracks for the Songs screen
// Add your own MP3s to /public/music/ and art to /public/art/

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  art?: string;
  art_url?: string | null;
  src?: string;
  preview_url?: string | null;
  spotify_id?: string | null;
  submitted_by?: string;
  hearts?: number;
  created_at?: string;
}

const tracks: Track[] = [];

export default tracks;
