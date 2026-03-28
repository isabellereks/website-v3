'use client';

import { Suspense, useState, useRef, FormEvent, KeyboardEvent, ChangeEvent } from 'react';
import '../ipod/ipod.css';

interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  art_url?: string | null;
  preview_url?: string | null;
  spotify_id?: string | null;
  submitted_by?: string;
  hearts?: number;
}

interface Playlist {
  id: string;
  name: string;
  track_ids: string[];
  created_at?: string;
}

interface SearchResult {
  title: string;
  artist: string;
  album: string;
  art_url: string | null;
  preview_url: string | null;
  spotify_id: string;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="admin-page"><div className="admin-container"><div className="admin-empty">Loading...</div></div></div>}>
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const [password, setPassword] = useState<string>('');
  const [authed, setAuthed] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const adminKeyRef = useRef<string>('');

  // Authenticated fetch helper
  const authFetch = (url: string, opts: RequestInit = {}): Promise<Response> => fetch(url, {
    ...opts,
    headers: { ...(opts.headers as Record<string, string>), 'Content-Type': 'application/json', Authorization: `Bearer ${adminKeyRef.current}` },
  });

  // Data
  const [songs, setSongs] = useState<Song[]>([]);
  const [communitySongs, setCommunitySongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Add song search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');
  const [addTarget, setAddTarget] = useState<'songs' | 'community'>('songs');

  // Playlists
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const tryAuth = async (key: string): Promise<void> => {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data: { ok: boolean } = await res.json();
      if (data.ok) { adminKeyRef.current = key; setAuthed(true); setAuthError(''); fetchAll(); }
      else setAuthError('Wrong password');
    } catch { setAuthError('Failed to verify'); }
  };

  const handleLogin = (e: FormEvent<HTMLFormElement>): void => { e.preventDefault(); if (password.trim()) tryAuth(password.trim()); };

  const fetchAll = async (): Promise<void> => {
    setLoading(true);
    const [s, c, p] = await Promise.all([
      fetch('/api/songs').then(r => r.json()).catch(() => []),
      fetch('/api/community-songs').then(r => r.json()).catch(() => []),
      fetch('/api/playlists').then(r => r.json()).catch(() => []),
    ]);
    if (Array.isArray(s)) setSongs(s);
    if (Array.isArray(c)) setCommunitySongs(c);
    if (Array.isArray(p)) setPlaylists(p);
    setLoading(false);
  };

  // ─── Songs ───
  const search = async (): Promise<void> => {
    if (!searchQuery.trim()) return;
    setSearching(true); setSearchError(''); setSearchResults([]);
    try {
      const res = await fetch(`/api/spotify-search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.error) setSearchError(data.error);
      else if (Array.isArray(data)) setSearchResults(data);
    } catch { setSearchError('Search failed'); }
    setSearching(false);
  };

  const addSong = async (track: SearchResult): Promise<void> => {
    const endpoint = addTarget === 'songs' ? '/api/songs' : '/api/community-songs';
    const body = {
      title: track.title, artist: track.artist, album: track.album,
      art_url: track.art_url, preview_url: track.preview_url, spotify_id: track.spotify_id,
      ...(addTarget === 'community' ? { submitted_by: 'admin' } : {}),
    };
    try {
      const res = await authFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
      const data: Song = await res.json();
      if (data.id) {
        if (addTarget === 'songs') setSongs(prev => [data, ...prev]);
        else setCommunitySongs(prev => [data, ...prev]);
      }
    } catch { /* no-op */ }
  };

  const deleteSong = async (id: string): Promise<void> => {
    await authFetch(`/api/songs?id=${id}`, { method: 'DELETE' });
    setSongs(prev => prev.filter(s => s.id !== id));
    // Also remove from playlists
    for (const pl of playlists) {
      if (pl.track_ids.includes(id)) {
        const newIds = pl.track_ids.filter(tid => tid !== id);
        await authFetch(`/api/playlists/${pl.id}`, { method: 'PATCH', body: JSON.stringify({ track_ids: newIds }) });
      }
    }
    fetchAll();
  };

  const deleteCommunitySong = async (id: string): Promise<void> => {
    await authFetch(`/api/community-songs/${id}`, { method: 'DELETE' });
    setCommunitySongs(prev => prev.filter(s => s.id !== id));
  };

  const isAdded = (spotifyId: string): boolean => songs.some(s => s.spotify_id === spotifyId) || communitySongs.some(s => s.spotify_id === spotifyId);

  // ─── Playlists ───
  const createPlaylist = async (): Promise<void> => {
    if (!newPlaylistName.trim()) return;
    try {
      const res = await authFetch('/api/playlists', { method: 'POST', body: JSON.stringify({ name: newPlaylistName.trim() }) });
      const data: Playlist = await res.json();
      if (data.id) setPlaylists(prev => [data, ...prev]);
    } catch { /* no-op */ }
    setNewPlaylistName('');
  };

  const deletePlaylist = async (id: string): Promise<void> => {
    await authFetch(`/api/playlists/${id}`, { method: 'DELETE' });
    setPlaylists(prev => prev.filter(pl => pl.id !== id));
    if (editingPlaylist?.id === id) setEditingPlaylist(null);
  };

  const toggleTrackInPlaylist = async (playlistId: string, songId: string): Promise<void> => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    const has = pl.track_ids.includes(songId);
    const newIds = has ? pl.track_ids.filter(id => id !== songId) : [...pl.track_ids, songId];
    try {
      const res = await authFetch(`/api/playlists/${playlistId}`, { method: 'PATCH', body: JSON.stringify({ track_ids: newIds }) });
      const data: Playlist = await res.json();
      if (data.id) {
        setPlaylists(prev => prev.map(p => p.id === playlistId ? data : p));
        setEditingPlaylist(data);
      }
    } catch { /* no-op */ }
  };

  // All songs combined for playlist editor
  const allSongs: Song[] = [...songs, ...communitySongs];

  // ─── Login ───
  if (!authed) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-login">
            <form onSubmit={handleLogin} className="admin-login-form">
              <input type="password" className="admin-login-input" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="Enter password" autoFocus />
              <button type="submit" className="admin-login-btn">Unlock</button>
            </form>
            {authError && <div className="admin-login-error">{authError}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="admin-page"><div className="admin-container"><div className="admin-empty">Loading...</div></div></div>;

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-title">iPod Admin</div>
          <a href="/ipod" className="admin-link">&larr; Back to iPod</a>
        </div>

        {/* ── Add Song ── */}
        <div className="admin-section">
          <div className="admin-section-header">
            <div className="admin-section-title">Add Song</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className={`admin-tab ${addTarget === 'songs' ? 'active' : ''}`} onClick={() => setAddTarget('songs')}>Songs</button>
              <button className={`admin-tab ${addTarget === 'community' ? 'active' : ''}`} onClick={() => setAddTarget('community')}>Community</button>
            </div>
          </div>
          <div className="admin-search-row">
            <input className="admin-search-input" type="text" value={searchQuery} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && search()} placeholder="Search Spotify..." />
            <button className="admin-search-btn" onClick={search} disabled={searching}>{searching ? '...' : 'Search'}</button>
          </div>
          {searchError && <div className="admin-error">{searchError}</div>}
          {searchResults.length > 0 && (
            <div className="admin-results">
              {searchResults.map(track => (
                <div key={track.spotify_id} className="admin-result-item">
                  {track.art_url ? <img src={track.art_url} alt="" className="admin-result-art" /> : <div className="admin-result-art">&#9835;</div>}
                  <div className="admin-result-meta">
                    <div className="admin-result-title">{track.title}</div>
                    <div className="admin-result-artist">{track.artist} &middot; {track.album}</div>
                  </div>
                  <button className="admin-add-btn" onClick={() => addSong(track)} disabled={isAdded(track.spotify_id)}>
                    {isAdded(track.spotify_id) ? 'Added' : `+ ${addTarget === 'songs' ? 'Songs' : 'Community'}`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Songs ── */}
        <div className="admin-section">
          <div className="admin-section-title" style={{ marginBottom: 12 }}>Songs ({songs.length})</div>
          {songs.length === 0 ? (
            <div className="admin-empty">No songs yet.</div>
          ) : (
            <div className="admin-track-list">
              {songs.map(song => (
                <div key={song.id} className="admin-track-item">
                  {song.art_url ? <img src={song.art_url} alt="" className="admin-track-art" /> : <div className="admin-track-art">&#9835;</div>}
                  <div className="admin-track-meta">
                    <div className="admin-track-title">{song.title}</div>
                    <div className="admin-track-artist">{song.artist}</div>
                  </div>
                  <button className="admin-delete-btn" onClick={() => deleteSong(song.id)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Community Songs ── */}
        <div className="admin-section">
          <div className="admin-section-title" style={{ marginBottom: 12 }}>Community Songs ({communitySongs.length})</div>
          {communitySongs.length === 0 ? (
            <div className="admin-empty">No community songs yet.</div>
          ) : (
            <div className="admin-track-list">
              {communitySongs.map(song => (
                <div key={song.id} className="admin-track-item">
                  {song.art_url ? <img src={song.art_url} alt="" className="admin-track-art" /> : <div className="admin-track-art">&#9835;</div>}
                  <div className="admin-track-meta">
                    <div className="admin-track-title">{song.title}</div>
                    <div className="admin-track-artist">{song.artist} &middot; by {song.submitted_by || 'anonymous'}</div>
                  </div>
                  <div className="admin-track-badges">
                    <span style={{ color: '#e55', fontSize: 12 }}>&hearts; {song.hearts || 0}</span>
                    <button className="admin-delete-btn" onClick={() => deleteCommunitySong(song.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Playlists ── */}
        <div className="admin-section">
          <div className="admin-section-title" style={{ marginBottom: 12 }}>Playlists ({playlists.length})</div>
          <div className="admin-create-row">
            <input className="admin-create-input" type="text" value={newPlaylistName} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPlaylistName(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && createPlaylist()} placeholder="New playlist name..." />
            <button className="admin-create-btn" onClick={createPlaylist}>Create</button>
          </div>
          {playlists.length === 0 ? (
            <div className="admin-empty">No playlists yet.</div>
          ) : (
            <div className="admin-track-list" style={{ gap: 8 }}>
              {playlists.map(pl => (
                <div key={pl.id}>
                  <div className="admin-playlist-item">
                    <div>
                      <div className="admin-playlist-name">{pl.name}</div>
                      <div className="admin-playlist-count">{pl.track_ids.length} songs</div>
                    </div>
                    <div className="admin-playlist-actions">
                      <button className="admin-add-btn" onClick={() => setEditingPlaylist(editingPlaylist?.id === pl.id ? null : pl)}>
                        {editingPlaylist?.id === pl.id ? 'Done' : 'Edit'}
                      </button>
                      <button className="admin-delete-btn" onClick={() => deletePlaylist(pl.id)}>Delete</button>
                    </div>
                  </div>
                  {editingPlaylist?.id === pl.id && (
                    <div className="admin-playlist-editor">
                      <div className="admin-playlist-editor-title">Songs in &ldquo;{pl.name}&rdquo;</div>
                      {allSongs.length === 0 ? (
                        <div className="admin-empty">Add songs first.</div>
                      ) : (
                        allSongs.map(song => {
                          const inPlaylist = editingPlaylist.track_ids.includes(song.id);
                          return (
                            <div key={song.id} className="admin-track-add-row">
                              <div className="admin-track-add-name">
                                {song.title} — <span style={{ color: '#888' }}>{song.artist}</span>
                              </div>
                              <button className={`admin-track-toggle ${inPlaylist ? 'in-playlist' : 'not-in-playlist'}`} onClick={() => toggleTrackInPlaylist(pl.id, song.id)}>
                                {inPlaylist ? '\u2713' : '+'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
