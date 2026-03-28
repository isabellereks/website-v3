'use client';

import { useState, useRef, useEffect, useCallback, ReactNode, MouseEvent as ReactMouseEvent, ChangeEvent, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Extend Window for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface Song {
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

interface MenuItem {
  label: string;
  screen: string;
}

interface ClickWheelProps {
  onMenu: () => void;
  onSelect: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onScrollUp: () => void;
  onScrollDown: () => void;
}

// Haptic click feedback
// iOS haptic feedback
let iosHaptic: (() => void) | null = null;
if (typeof window !== 'undefined') {
  import('ios-haptics').then(({ haptic, supportsHaptics }) => {
    if (supportsHaptics) iosHaptic = haptic;
  }).catch(() => {});
}

function hapticClick(): void {
  // iOS haptics
  if (iosHaptic) { iosHaptic(); return; }
  // Android vibration
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(5);
  // Audio click fallback (desktop)
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    gain.gain.value = 0.03;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch { /* no-op */ }
}

// Songs fetched from Supabase
import './ipod.css';

function formatTime(s: number): string {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function getLikedSongs(): string[] {
  try { return JSON.parse(localStorage.getItem('liked_songs') || '[]') || []; } catch { return []; }
}
function saveLikedSongs(arr: string[]): void { localStorage.setItem('liked_songs', JSON.stringify(arr)); }

export default function IPod() {
  const [navStack, setNavStack] = useState<string[]>(['main']);
  const [selectedIndices, setSelectedIndices] = useState<Record<string, number>>({});
  const [currentTrackIdx, setCurrentTrackIdx] = useState<number | null>(null);
  const [currentTrackList, setCurrentTrackList] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [slideDir, setSlideDir] = useState<number>(1);

  // Community
  const [communitySongs, setCommunitySongs] = useState<Song[]>([]);
  const [communityLoading, setCommunityLoading] = useState<boolean>(false);
  const [likedSongs, setLikedSongsState] = useState<string[]>([]);

  // Songs (curated from Supabase)
  const [curatedTracks, setCuratedTracks] = useState<Song[]>([]);

  // Playlists (from Supabase)
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);

  // Search (results live inside iPod)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Confirm add (name input above iPod)
  const [pendingTrack, setPendingTrack] = useState<SearchResult | null>(null);
  const [submitName, setSubmitName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const isFirstRender = useRef<boolean>(true);
  const currentScreen = navStack[navStack.length - 1];

  useEffect(() => { isFirstRender.current = false; }, []);
  useEffect(() => { setLikedSongsState(getLikedSongs()); }, []);

  // Fetch curated songs and playlists from Supabase
  useEffect(() => {
    fetch('/api/songs').then(r => r.json()).then((d: unknown) => { if (Array.isArray(d)) setCuratedTracks(d); }).catch(() => {});
    fetch('/api/playlists').then(r => r.json()).then((d: unknown) => { if (Array.isArray(d)) setPlaylists(d); }).catch(() => {});
  }, []);

  const fetchCommunity = useCallback(async () => {
    setCommunityLoading(true);
    try {
      const res = await fetch('/api/community-songs');
      const data: unknown = await res.json();
      if (Array.isArray(data)) setCommunitySongs(data);
    } catch { /* no-op */ }
    setCommunityLoading(false);
  }, []);

  useEffect(() => { fetchCommunity(); }, [fetchCommunity]);

  // Focus inputs when screens change
  useEffect(() => {
    if (currentScreen === 'search') searchInputRef.current?.focus();
  }, [currentScreen]);

  useEffect(() => {
    if (pendingTrack) nameInputRef.current?.focus();
  }, [pendingTrack]);

  // Audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = (): void => setCurrentTime(audio.currentTime);
    const onDuration = (): void => setDuration(audio.duration || 0);
    const onEnded = (): void => {
      if (currentTrackIdx !== null && currentTrackIdx < currentTrackList.length - 1) {
        doPlayTrack(currentTrackIdx + 1, currentTrackList);
      } else {
        setIsPlaying(false);
      }
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentTrackIdx, currentTrackList]);

  // ─── Navigation ───
  const getIndex = (screen: string): number => selectedIndices[screen] || 0;
  const setIndex = (screen: string, idx: number): void => setSelectedIndices((prev) => ({ ...prev, [screen]: idx }));

  // Auto-scroll selected item into view
  useEffect(() => {
    const el = document.querySelector('.ipod-menu-item.selected');
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndices, currentScreen]);

  const pushScreen = useCallback((screen: string): void => {
    setSlideDir(1);
    setNavStack((prev) => [...prev, screen]);
  }, []);

  const popScreen = useCallback((): void => {
    if (navStack.length <= 1) return;
    setSlideDir(-1);
    setNavStack((prev) => prev.slice(0, -1));
  }, [navStack.length]);

  // ─── Playback ───
  const doPlayTrack = useCallback((idx: number, trackList: Song[]): void => {
    const track = trackList[idx];
    if (!track) return;
    setCurrentTrackIdx(idx);
    setCurrentTrackList(trackList);
    setCurrentTime(0);
    setDuration(0);
    const audio = audioRef.current;
    if (!audio) return;
    const src = track.src || track.preview_url;
    if (src) {
      audio.src = src;
      audio.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audio.pause();
      audio.removeAttribute('src');
      setIsPlaying(false);
    }
    setSlideDir(1);
    setNavStack((prev) => {
      const without = prev.filter((s) => s !== 'nowPlaying');
      return [...without, 'nowPlaying'];
    });
  }, []);

  const togglePlay = useCallback((): void => {
    const audio = audioRef.current;
    if (!audio || currentTrackIdx === null) return;
    const track = currentTrackList[currentTrackIdx];
    const src = track?.src || track?.preview_url;
    if (!src) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().catch(() => {}); setIsPlaying(true); }
  }, [isPlaying, currentTrackIdx, currentTrackList]);

  const skipNext = useCallback((): void => {
    if (currentTrackIdx === null) return;
    doPlayTrack((currentTrackIdx + 1) % currentTrackList.length, currentTrackList);
  }, [currentTrackIdx, currentTrackList, doPlayTrack]);

  const skipPrev = useCallback((): void => {
    if (currentTrackIdx === null) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    doPlayTrack(currentTrackIdx === 0 ? currentTrackList.length - 1 : currentTrackIdx - 1, currentTrackList);
  }, [currentTrackIdx, currentTrackList, doPlayTrack]);

  const seek = useCallback((e: ReactMouseEvent<HTMLDivElement>): void => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  }, [duration]);

  // ─── Hearts ───
  const toggleHeart = useCallback(async (songId: string): Promise<void> => {
    const liked = getLikedSongs();
    const isLiked = liked.includes(songId);
    const newLiked = isLiked ? liked.filter((id) => id !== songId) : [...liked, songId];
    saveLikedSongs(newLiked);
    setLikedSongsState(newLiked);
    setCommunitySongs((prev) =>
      prev.map((s) => s.id === songId ? { ...s, hearts: Math.max(0, (s.hearts || 0) + (isLiked ? -1 : 1)) } : s)
    );
    try {
      await fetch(`/api/community-songs/${songId}/heart`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isLiked ? 'unlike' : 'like' }),
      });
    } catch { /* no-op */ }
  }, []);

  // ─── Spotify search ───
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q?: string): Promise<void> => {
    const query = q ?? searchQuery;
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    setSearchError('');
    setIndex('searchResults', 0);
    try {
      const res = await fetch(`/api/spotify-search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) { setSearchError(data.error); }
      else if (Array.isArray(data)) {
        setSearchResults(data);
        // Push to results screen if not already there
        setNavStack((prev) => {
          if (prev[prev.length - 1] === 'searchResults') return prev;
          setSlideDir(1);
          const without = prev.filter((s) => s !== 'searchResults');
          return [...without, 'searchResults'];
        });
      }
    } catch { setSearchError('Search failed'); }
    setIsSearching(false);
  }, [searchQuery]);

  // Debounced live search
  const handleSearchInput = useCallback((value: string): void => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  }, [doSearch]);

  const submitSong = useCallback(async (): Promise<void> => {
    if (!pendingTrack) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/community-songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pendingTrack.title,
          artist: pendingTrack.artist,
          album: pendingTrack.album,
          art_url: pendingTrack.art_url,
          preview_url: pendingTrack.preview_url,
          spotify_id: pendingTrack.spotify_id,
          submitted_by: submitName.trim() || 'anonymous',
        }),
      });
      // Clean up and go back to community
      setPendingTrack(null);
      setSubmitName('');
      setSearchQuery('');
      setSearchResults([]);
      fetchCommunity();
      setSlideDir(-1);
      setNavStack((prev) => prev.filter((s) => s !== 'search' && s !== 'searchResults' && s !== 'confirmAdd'));
    } catch { /* no-op */ }
    setIsSubmitting(false);
  }, [pendingTrack, submitName, fetchCommunity]);

  // ─── Screen data ───
  const getMenuItems = (screen: string): MenuItem[] => {
    switch (screen) {
      case 'main': return [{ label: 'Music', screen: 'music' }, { label: 'Settings', screen: 'settings' }];
      case 'music': return [{ label: 'Songs', screen: 'songs' }, { label: 'Playlists', screen: 'playlists' }, { label: 'Community', screen: 'community' }];
      case 'settings': return [{ label: 'About', screen: 'about' }];
      default: return [];
    }
  };

  const getScreenTitle = (screen: string): string => ({
    main: "isa's iPod", music: 'Music', songs: 'Songs', nowPlaying: 'Now Playing',
    settings: 'Settings', about: 'About', community: 'Community',
    playlists: 'Playlists', playlistDetail: currentPlaylist?.name || 'Playlist',
    search: 'Search', searchResults: 'Results', confirmAdd: 'Add Song',
  } as Record<string, string>)[screen] || '';

  const getListLength = (screen: string): number => {
    if (screen === 'songs') return curatedTracks.length;
    if (screen === 'community') return communitySongs.length + 1;
    if (screen === 'playlists') return playlists.length;
    if (screen === 'playlistDetail' && currentPlaylist) return currentPlaylist.track_ids.length;
    if (screen === 'searchResults') return searchResults.length;
    return getMenuItems(screen).length;
  };

  // ─── Wheel ───
  const scrollUp = useCallback((): void => {
    if (currentScreen === 'about' || currentScreen === 'search' || currentScreen === 'confirmAdd') return;
    const idx = getIndex(currentScreen);
    if (idx > 0) setIndex(currentScreen, idx - 1);
  }, [currentScreen, selectedIndices]);

  const scrollDown = useCallback((): void => {
    if (currentScreen === 'about' || currentScreen === 'search' || currentScreen === 'confirmAdd') return;
    const idx = getIndex(currentScreen);
    const max = getListLength(currentScreen) - 1;
    if (idx < max) setIndex(currentScreen, idx + 1);
  }, [currentScreen, selectedIndices, communitySongs.length, searchResults.length, playlists.length, currentPlaylist]);

  const handleSelect = useCallback((): void => {
    if (currentScreen === 'nowPlaying' || currentScreen === 'about') return;

    if (currentScreen === 'search') { doSearch(); return; }

    if (currentScreen === 'searchResults') {
      const track = searchResults[getIndex('searchResults')];
      if (track) {
        setPendingTrack(track);
        setSubmitName('');
        pushScreen('confirmAdd');
      }
      return;
    }

    if (currentScreen === 'confirmAdd') {
      submitSong();
      return;
    }

    if (currentScreen === 'playlists') {
      const pl = playlists[getIndex('playlists')];
      if (pl) { setCurrentPlaylist(pl); setIndex('playlistDetail', 0); pushScreen('playlistDetail'); }
      return;
    }

    if (currentScreen === 'playlistDetail' && currentPlaylist) {
      const allSongs: Song[] = [...curatedTracks, ...communitySongs];
      const playlistTracks = currentPlaylist.track_ids.map(id => allSongs.find(s => s.id === id)).filter((s): s is Song => Boolean(s));
      const idx = getIndex('playlistDetail');
      if (idx < playlistTracks.length) doPlayTrack(idx, playlistTracks);
      return;
    }

    if (currentScreen === 'songs') {
      const idx = getIndex('songs');
      if (idx < curatedTracks.length) doPlayTrack(idx, curatedTracks);
      return;
    }

    if (currentScreen === 'community') {
      const idx = getIndex('community');
      if (idx < communitySongs.length) {
        doPlayTrack(idx, communitySongs);
      } else {
        // "+ Add Song" -> push search screen
        setSearchQuery('');
        setSearchResults([]);
        setSearchError('');
        setPendingTrack(null);
        pushScreen('search');
      }
      return;
    }

    const items = getMenuItems(currentScreen);
    const idx = getIndex(currentScreen);
    if (items[idx]) pushScreen(items[idx].screen);
  }, [currentScreen, selectedIndices, pushScreen, doPlayTrack, communitySongs, searchResults, doSearch, submitSong]);

  const handleMenu = useCallback((): void => {
    if (currentScreen === 'confirmAdd') {
      setPendingTrack(null);
    }
    if (currentScreen === 'search' || currentScreen === 'searchResults') {
      setSearchQuery('');
      setSearchResults([]);
      setSearchError('');
      setPendingTrack(null);
    }
    popScreen();
  }, [popScreen, currentScreen]);

  const handlePrev = useCallback((): void => {
    if (currentScreen === 'nowPlaying') skipPrev(); else scrollUp();
  }, [currentScreen, skipPrev, scrollUp]);
  const handleNext = useCallback((): void => {
    if (currentScreen === 'nowPlaying') skipNext(); else scrollDown();
  }, [currentScreen, skipNext, scrollDown]);
  const handlePlayPause = useCallback((): void => togglePlay(), [togglePlay]);

  // ─── Render screens ───
  const renderScreen = (screen: string): ReactNode => {
    if (screen === 'nowPlaying') {
      const track = currentTrackIdx !== null ? currentTrackList[currentTrackIdx] : null;
      if (!track) return <div className="stub-screen">No track selected</div>;
      const remaining = duration > 0 ? -(duration - currentTime) : 0;
      const isCommunity = !!track.submitted_by;
      const isLiked = likedSongs.includes(track.id);
      return (
        <div className="now-playing">
          <div className="now-playing-info">
            <div className="now-playing-art-wrapper">
              <div className="now-playing-art">
                {(track.art || track.art_url) ? <img src={track.art || track.art_url || undefined} alt="" /> : <div className="now-playing-art-placeholder">&#9835;</div>}
              </div>
            </div>
            <div className="now-playing-meta">
              <div className="now-playing-title">{track.title}</div>
              <div className="now-playing-artist">{track.artist}</div>
              <div className="now-playing-album">{track.album}</div>
              <div className="now-playing-tracknum">{(currentTrackIdx ?? 0) + 1} of {currentTrackList.length}</div>
              {isCommunity && (
                <div className="now-playing-submitted">submitted by {track.submitted_by || 'anonymous'}</div>
              )}
            </div>
          </div>
          <div className="now-playing-progress">
            {isCommunity && (
              <div className="progress-heart-row">
                <span className="now-playing-heart" onClick={() => toggleHeart(track.id)}>
                  <span className={`heart-btn ${isLiked ? 'liked' : ''}`}>{isLiked ? '\u2665' : '\u2661'}</span>
                  <span className="heart-count">{track.hearts || 0}</span>
                </span>
              </div>
            )}
            <div className="progress-bar-row">
              <span className="progress-time-left">{formatTime(currentTime)}</span>
              <div className="progress-bar-container" onClick={seek}>
                <div className="progress-bar-fill" style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }} />
              </div>
              <span className="progress-time-right">{remaining ? `-${formatTime(Math.abs(remaining))}` : '-0:00'}</span>
            </div>
          </div>
        </div>
      );
    }

    if (screen === 'about') {
      return (
        <div className="about-screen">
          <div className="about-name">isa&apos;s iPod</div>
          <div className="about-row"><span className="about-label">Songs</span><span className="about-value">{curatedTracks.length}</span></div>
          <div className="about-row"><span className="about-label">Community</span><span className="about-value">{communitySongs.length}</span></div>
          <div className="about-divider" />
          <div className="about-row"><span className="about-label">Version</span><span className="about-value">26.1</span></div>
          <div className="about-row"><span className="about-label">Serial</span><span className="about-value">ISA26X</span></div>
        </div>
      );
    }

    if (screen === 'confirmAdd' && pendingTrack) {
      return (
        <div className="confirm-add-screen">
          <div className="confirm-add-art">
            {pendingTrack.art_url ? <img src={pendingTrack.art_url} alt="" /> : <div className="confirm-add-art-placeholder">&#9835;</div>}
          </div>
          <div className="confirm-add-title">{pendingTrack.title}</div>
          <div className="confirm-add-artist">{pendingTrack.artist}</div>
          <div className="confirm-add-name-row">
            <span className="confirm-add-label">by</span>
            <input
              type="text"
              className="confirm-add-name"
              value={submitName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSubmitName(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); if (e.key === 'Enter') submitSong(); }}
              placeholder="anonymous"
              autoFocus
            />
          </div>
        </div>
      );
    }

    if (screen === 'search') {
      return (
        <div className="ipod-search-screen">
          <div className="ipod-search-prompt">{isSearching ? 'Searching...' : 'Search Spotify'}</div>
          {searchError && <div className="ipod-search-error">{searchError}</div>}
          <div className="ipod-search-hint">Start typing to search</div>
        </div>
      );
    }

    if (screen === 'searchResults') {
      const selectedIdx = getIndex('searchResults');
      if (searchResults.length === 0) return <div className="stub-screen">No results</div>;
      return (
        <ul className="ipod-menu-list">
          {searchResults.map((track, i) => (
            <li
              key={track.spotify_id}
              className={`ipod-menu-item${i === selectedIdx ? ' selected' : ''}`}
              onClick={() => { setIndex('searchResults', i); setPendingTrack(track); }}
            >
              <span className="search-result-label">
                {track.art_url && <img src={track.art_url} alt="" className="search-result-thumb" />}
                <span className="search-result-text">
                  <span className="search-result-title">{track.title}</span>
                  <span className="search-result-artist">{track.artist}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      );
    }

    if (screen === 'playlists') {
      const selectedIdx = getIndex('playlists');
      if (playlists.length === 0) return <div className="stub-screen">No playlists</div>;
      return (
        <ul className="ipod-menu-list">
          {playlists.map((pl, i) => (
            <li key={pl.id} className={`ipod-menu-item${i === selectedIdx ? ' selected' : ''}`} onClick={() => { setIndex('playlists', i); setCurrentPlaylist(pl); setIndex('playlistDetail', 0); pushScreen('playlistDetail'); }}>
              <span>{pl.name}</span>
              <span className="arrow">{pl.track_ids.length} &rsaquo;</span>
            </li>
          ))}
        </ul>
      );
    }

    if (screen === 'playlistDetail' && currentPlaylist) {
      const selectedIdx = getIndex('playlistDetail');
      const allSongs: Song[] = [...curatedTracks, ...communitySongs];
      const playlistTracks = currentPlaylist.track_ids.map(id => allSongs.find(s => s.id === id)).filter((s): s is Song => Boolean(s));
      if (playlistTracks.length === 0) return <div className="stub-screen">Empty playlist</div>;
      return (
        <ul className="ipod-menu-list">
          {playlistTracks.map((song, i) => (
            <li key={song.id} className={`ipod-menu-item${i === selectedIdx ? ' selected' : ''}`} onClick={() => { setIndex('playlistDetail', i); const idx = communitySongs.findIndex(s => s.id === song.id); if (idx !== -1) doPlayTrack(idx, communitySongs); }}>
              <span className="song-item-text">
                <span className="song-item-title">{song.title}</span>
                <span className="song-item-artist">{song.artist}</span>
              </span>
              <span className="arrow">&rsaquo;</span>
            </li>
          ))}
        </ul>
      );
    }

    if (screen === 'songs') {
      const selectedIdx = getIndex('songs');
      return (
        <ul className="ipod-menu-list">
          {curatedTracks.map((track, i) => (
            <li key={track.id} className={`ipod-menu-item${i === selectedIdx ? ' selected' : ''}`} onClick={() => { setIndex('songs', i); doPlayTrack(i, curatedTracks); }}>
              <span className="song-item-text">
                <span className="song-item-title">{track.title}</span>
                <span className="song-item-artist">{track.artist}</span>
              </span>
              <span className="arrow">&rsaquo;</span>
            </li>
          ))}
        </ul>
      );
    }

    if (screen === 'community') {
      const selectedIdx = getIndex('community');
      if (communityLoading && communitySongs.length === 0) return <div className="stub-screen">Loading...</div>;
      return (
        <ul className="ipod-menu-list">
          {communitySongs.map((song, i) => (
            <li key={song.id} className={`ipod-menu-item${i === selectedIdx ? ' selected' : ''}`} onClick={() => { setIndex('community', i); doPlayTrack(i, communitySongs); }}>
              <span className="song-item-text">
                <span className="song-item-title">{song.title}</span>
                <span className="song-item-artist">{song.artist} &middot; by {song.submitted_by || 'anonymous'}</span>
              </span>
              <span className="heart-count-small">&hearts; {song.hearts || 0}</span>
            </li>
          ))}
          <li className={`ipod-menu-item add-song-item${communitySongs.length === selectedIdx ? ' selected' : ''}`} onClick={() => { setIndex('community', communitySongs.length); setSearchQuery(''); setSearchResults([]); setSearchError(''); setPendingTrack(null); pushScreen('search'); }}>
            <span>+ Add Song</span>
          </li>
        </ul>
      );
    }

    // Menu screens
    const items = getMenuItems(screen);
    const selectedIdx = getIndex(screen);
    return (
      <ul className="ipod-menu-list">
        {items.map((item, i) => (
          <li key={item.label} className={`ipod-menu-item${i === selectedIdx ? ' selected' : ''}`} onClick={() => { setIndex(screen, i); pushScreen(item.screen); }}>
            <span>{item.label}</span><span className="arrow">&rsaquo;</span>
          </li>
        ))}
      </ul>
    );
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%' }),
    center: { x: 0 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%' }),
  };

  // Is the floating input visible?
  const showSearchInput = currentScreen === 'search' || currentScreen === 'searchResults';

  return (
    <div className="ipod-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      <audio ref={audioRef} preload="auto" />

      <div style={{ position: 'relative', width: 320 }}>
        {/* Floating search input */}
        <AnimatePresence>
          {showSearchInput && !pendingTrack && (
            <motion.div className="add-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }}>
              <input
                ref={searchInputRef}
                type="text"
                className="add-panel-input"
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleSearchInput(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); if (e.key === 'Escape') handleMenu(); }}
                placeholder="Search..."
                autoFocus
              />
              {searchError && <div className="add-panel-error">{searchError}</div>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* iPod body */}
        <div className="ipod-body" style={{ width: 320, height: 580, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 18px 16px', position: 'relative' }}>
          <div className="ipod-screen-bezel">
            <div className="ipod-screen">
              <div className="ipod-titlebar">
                  <span className="ipod-titlebar-text">{getScreenTitle(currentScreen)}</span>
                <div className="ipod-titlebar-battery">
                  <div className="battery-body">
                    <div className="battery-fill" />
                  </div>
                  <div className="battery-tip" />
                </div>
              </div>
              <div className="ipod-content" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <AnimatePresence custom={slideDir} mode="popLayout">
                  <motion.div
                    key={currentScreen}
                    custom={slideDir}
                    variants={slideVariants}
                    initial={isFirstRender.current ? 'center' : 'enter'}
                    animate="center"
                    exit="exit"
                    transition={{ type: 'tween', duration: 0.25 }}
                    style={{ position: 'absolute', inset: 0, overflow: 'auto' }}
                  >
                    {renderScreen(currentScreen)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <ClickWheel onMenu={handleMenu} onSelect={handleSelect} onPrev={handlePrev} onNext={handleNext} onPlayPause={handlePlayPause} onScrollUp={scrollUp} onScrollDown={scrollDown} />
        </div>
      </div>
    </div>
  );
}

// ─── Click Wheel ───
function ClickWheel({ onMenu, onSelect, onPrev, onNext, onPlayPause, onScrollUp, onScrollDown }: ClickWheelProps) {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef<boolean>(false);
  const lastAngle = useRef<number | null>(null);
  const accumulated = useRef<number>(0);

  const getAngleFromXY = (clientX: number, clientY: number): number => {
    const rect = wheelRef.current!.getBoundingClientRect();
    return Math.atan2(clientY - (rect.top + rect.height / 2), clientX - (rect.left + rect.width / 2));
  };

  const isInCenter = (clientX: number, clientY: number): boolean => {
    const rect = wheelRef.current!.getBoundingClientRect();
    return Math.hypot(clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2)) < 40;
  };

  const handleDragMove = (clientX: number, clientY: number): void => {
    if (!isDragging.current) return;
    const angle = getAngleFromXY(clientX, clientY);
    if (lastAngle.current !== null) {
      let delta = angle - lastAngle.current;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      accumulated.current += delta;
      if (Math.abs(accumulated.current) > 0.4) {
        if (accumulated.current > 0) { hapticClick(); onScrollDown(); } else { hapticClick(); onScrollUp(); }
        accumulated.current = 0;
      }
    }
    lastAngle.current = angle;
  };

  const handleDragEnd = (): void => {
    isDragging.current = false;
    lastAngle.current = null;
    accumulated.current = 0;
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => handleDragMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent): void => { if (e.touches[0]) { e.preventDefault(); handleDragMove(e.touches[0].clientX, e.touches[0].clientY); } };
    const onEnd = (): void => handleDragEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [onScrollUp, onScrollDown]);

  const handleStart = (clientX: number, clientY: number): void => {
    if (isInCenter(clientX, clientY)) return;
    isDragging.current = true;
    lastAngle.current = getAngleFromXY(clientX, clientY);
    accumulated.current = 0;
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>): void => handleStart(e.clientX, e.clientY);
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>): void => { if (e.touches[0]) handleStart(e.touches[0].clientX, e.touches[0].clientY); };

  return (
    <div className="ipod-wheel-container">
      <div ref={wheelRef} className="ipod-wheel" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onWheel={(e) => { e.preventDefault(); if (e.deltaY > 0) { hapticClick(); onScrollDown(); } else if (e.deltaY < 0) { hapticClick(); onScrollUp(); } }}>
        <span className="wheel-label wheel-label-menu">MENU</span>
        <span className="wheel-label wheel-label-prev">|&#9664;&#9664;</span>
        <span className="wheel-label wheel-label-next">&#9654;&#9654;|</span>
        <span className="wheel-label wheel-label-play">&#9654;||</span>
        <button className="wheel-btn wheel-btn-menu" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={() => { hapticClick(); onMenu(); }} aria-label="Menu" />
        <button className="wheel-btn wheel-btn-prev" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={() => { hapticClick(); onPrev(); }} aria-label="Previous" />
        <button className="wheel-btn wheel-btn-next" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={() => { hapticClick(); onNext(); }} aria-label="Next" />
        <button className="wheel-btn wheel-btn-play" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={() => { hapticClick(); onPlayPause(); }} aria-label="Play/Pause" />
        <div className="ipod-wheel-center" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={() => { hapticClick(); onSelect(); }} role="button" aria-label="Select" />
      </div>
    </div>
  );
}
