"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, TwitterIcon, Bookmark01Icon, YelpIcon, Linkedin01Icon } from "@hugeicons/core-free-icons";
import EarbudReveal from "@/components/EarbudReveal";
import { prepareWithSegments, layoutNextLine, type LayoutCursor } from "@chenglou/pretext";

export default function Home() {
  const [showPast, setShowPast] = useState(false);
  const [showMisc, setShowMisc] = useState(false);
  const [miffyPos, setMiffyPos] = useState({ x: 0, y: 0 });
  const [miffyActivated, setMiffyActivated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [miffyTongue, setMiffyTongue] = useState(false);
  const [runFrame, setRunFrame] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isBouncing, setIsBouncing] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const initialMiffyRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const miffyPosRef = useRef(miffyPos);
  miffyPosRef.current = miffyPos;

  useEffect(() => {
    if (!isDragging && !isMoving) return;
    const speed = isRunning ? 50 : 100;
    const interval = setInterval(() => {
      setRunFrame((prev) => (prev === 0 ? 1 : 0));
    }, speed);
    return () => clearInterval(interval);
  }, [isDragging, isMoving, isRunning]);

  useEffect(() => {
    const STEP = 3;
    const RUN_STEP = 7;
    const MIFFY_SIZE = 70;
    const keysHeld = new Set<string>();
    let animationId: number;
    let bounceTimeout: NodeJS.Timeout;
    let shiftHeld = false;
    let lastSpaceTime = 0;
    let currentBounceDir: string | null = null;

    const triggerBounce = (dir: 'left' | 'right' | 'top' | 'bottom') => {
      const bounceBack = shiftHeld ? 30 : 15;
      setMiffyPos((prev) => {
        let { x, y } = prev;
        if (dir === 'left') x += bounceBack;
        if (dir === 'right') x -= bounceBack;
        if (dir === 'top') y += bounceBack;
        if (dir === 'bottom') y -= bounceBack;
        return { x, y };
      });
      
      if (currentBounceDir !== dir) {
        currentBounceDir = dir;
        setIsBouncing(dir);
      }
      setMiffyTongue(true);
      
      clearTimeout(bounceTimeout);
      bounceTimeout = setTimeout(() => {
        setIsBouncing(null);
        setMiffyTongue(false);
        currentBounceDir = null;
      }, 200);
    };

    const tick = () => {
      if (keysHeld.size === 0) {
        setIsMoving(false);
        return;
      }
      setIsMoving(true);
      const step = shiftHeld ? RUN_STEP : STEP;
      setMiffyActivated(true);
      setMiffyPos((prev) => {
        let { x, y } = prev;
        if (!miffyActivated && initialMiffyRef.current) {
          const rect = initialMiffyRef.current.getBoundingClientRect();
          x = rect.left;
          y = rect.top;
        }
        if (keysHeld.has('ArrowUp') || keysHeld.has('w')) y -= step;
        if (keysHeld.has('ArrowDown') || keysHeld.has('s')) y += step;
        if (keysHeld.has('ArrowLeft') || keysHeld.has('a')) x -= step;
        if (keysHeld.has('ArrowRight') || keysHeld.has('d')) x += step;
        
        const maxX = window.innerWidth - MIFFY_SIZE;
        const maxY = window.innerHeight - MIFFY_SIZE;
        
        if (x <= 0) triggerBounce('left');
        if (x >= maxX) triggerBounce('right');
        if (y <= 0) triggerBounce('top');
        if (y >= maxY) triggerBounce('bottom');
        
        x = Math.max(0, Math.min(maxX, x));
        y = Math.max(0, Math.min(maxY, y));
        return { x, y };
      });
      animationId = requestAnimationFrame(tick);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Shift') {
        shiftHeld = true;
        setIsRunning(true);
      }
      if (e.key === ' ') {
        e.preventDefault();
        const now = Date.now();
        if (now - lastSpaceTime < 300) {
          setMiffyTongue(true);
          setTimeout(() => setMiffyTongue(false), 1000);
        }
        lastSpaceTime = now;
        return;
      }
      const moveKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
      if (!moveKeys.includes(e.key)) return;
      e.preventDefault();
      const key = e.key.startsWith('Arrow') ? e.key : e.key.toLowerCase();
      if (!keysHeld.has(key)) {
        keysHeld.add(key);
        if (keysHeld.size === 1) animationId = requestAnimationFrame(tick);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftHeld = false;
        setIsRunning(false);
      }
      const key = e.key.startsWith('Arrow') ? e.key : e.key.toLowerCase();
      keysHeld.delete(key);
      if (keysHeld.size === 0) setIsMoving(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
      clearTimeout(bounceTimeout);
    };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const MIFFY_SIZE = 70;
    const x = Math.max(0, Math.min(window.innerWidth - MIFFY_SIZE, e.clientX - dragOffsetRef.current.x));
    const y = Math.max(0, Math.min(window.innerHeight - MIFFY_SIZE, e.clientY - dragOffsetRef.current.y));
    setMiffyPos({ x, y });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    if (!miffyActivated) {
      setMiffyPos({ x: rect.left, y: rect.top });
      setMiffyActivated(true);
    }
    setIsDragging(true);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const MIFFY_SIZE = 70;
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(window.innerWidth - MIFFY_SIZE, touch.clientX - dragOffsetRef.current.x));
    const y = Math.max(0, Math.min(window.innerHeight - MIFFY_SIZE, touch.clientY - dragOffsetRef.current.y));
    setMiffyPos({ x, y });
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffsetRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
    if (!miffyActivated) {
      setMiffyPos({ x: rect.left, y: rect.top });
      setMiffyActivated(true);
    }
    setIsDragging(true);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove, handleTouchEnd]);

  const handleDoubleClick = useCallback(() => {
    setMiffyTongue(true);
    setTimeout(() => setMiffyTongue(false), 1000);
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // ── Word ripple with persistent expanding ripples + wake trail ──
  const wordCacheRef = useRef<{ el: HTMLElement; x: number; y: number; isStardust: boolean; active: boolean; origColor: string; origRGB: number[]; lastHitTime: number; skipColor: boolean; isStrike: boolean }[]>([]);
  const cacheReady = useRef(false);
  const ripplesRef = useRef<{ x: number; y: number; born: number; amp: number }[]>([]);
  const prevMiffyRef = useRef({ x: 0, y: 0 });
  const spawnAccum = useRef(0);

  // Split text into word-level inline-block spans (fix strikethrough)
  useEffect(() => {
    if (!mainContentRef.current) return;
    const container = mainContentRef.current;

    function isInsideStrike(node: Node): boolean {
      let el = node.parentElement;
      while (el && el !== container) {
        const tag = el.tagName;
        if (tag === 'S' || tag === 'DEL' || tag === 'STRIKE') return true;
        el = el.parentElement;
      }
      return false;
    }

    function splitWords(root: Node) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);

      for (const node of nodes) {
        const text = node.textContent || '';
        if (!text.trim()) continue;
        if (node.parentElement?.classList.contains('w-word')) continue;
        const strike = isInsideStrike(node);
        const frag = document.createDocumentFragment();
        const parts = text.split(/( +)/);
        for (const part of parts) {
          if (!part) continue;
          if (/^ +$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            continue;
          }
          const span = document.createElement('span');
          span.className = 'w-word';
          span.style.display = 'inline-block';
          if (strike) span.style.textDecoration = 'line-through';
          span.textContent = part;
          frag.appendChild(span);
        }
        node.parentNode?.replaceChild(frag, node);
      }
    }

    splitWords(container);

    const obs = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE) { splitWords(n); cacheReady.current = false; }
      });
    });
    obs.observe(container, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // Animate with persistent ripples
  useEffect(() => {
    if (!miffyActivated || !mainContentRef.current) return;
    const container = mainContentRef.current;
    let rafId: number;

    // ── Tuning ──
    const MIFFY_HALF = 35;
    const RIPPLE_LIFETIME = 2000;   // ms
    const RIPPLE_SPEED = 80;        // px/sec — gentle expansion
    const WAVELENGTH = 70;          // wide spacing between crests
    const MAX_AMP = 6;              // subtle displacement
    const INFLUENCE = 350;          // moderate reach
    const SPAWN_INTERVAL = 45;      // fewer ripples spawned
    const BASE_RGB = [30, 30, 30];
    const RIPPLE_RGB = [180, 180, 180]; // strong grey flash — high contrast

    // Warm pretext cache
    try {
      const text = container.textContent || '';
      const p = prepareWithSegments(text, '14px serif');
      layoutNextLine(p, { segmentIndex: 0, graphemeIndex: 0 }, container.getBoundingClientRect().width);
    } catch { /* non-critical */ }

    function buildCache() {
      const els = container.querySelectorAll('.w-word');
      const cache: typeof wordCacheRef.current = [];
      els.forEach((el) => {
        const h = el as HTMLElement;
        h.style.transform = '';
        h.style.color = '';
        h.style.textShadow = '';
        const computed = window.getComputedStyle(h).color;
        const r = h.getBoundingClientRect();
        const parentText = h.parentElement?.textContent || '';
        const rgb = computed.match(/\d+/g)?.map(Number) || [30, 30, 30];
        const isDefaultColor = Math.abs(rgb[0] - rgb[1]) < 15 && Math.abs(rgb[1] - rgb[2]) < 15 && rgb[0] < 80;
        // Check if word is inside a strikethrough element
        let isStrike = false;
        let check = h.parentElement;
        while (check && check !== container) {
          if (check.tagName === 'S' || check.tagName === 'DEL') { isStrike = true; break; }
          check = check.parentElement;
        }
        cache.push({
          el: h,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          isStardust: parentText.includes('stardust'),
          active: false,
          origColor: computed,
          origRGB: rgb,
          lastHitTime: 0,
          skipColor: !isDefaultColor && !isStrike,
          isStrike,
        });
      });
      wordCacheRef.current = cache;
      cacheReady.current = true;
    }

    buildCache();

    let timer: ReturnType<typeof setTimeout>;
    const scheduleRebuild = () => { clearTimeout(timer); timer = setTimeout(buildCache, 250); };
    window.addEventListener('scroll', scheduleRebuild, { passive: true });
    window.addEventListener('resize', scheduleRebuild);

    function animate() {
      if (!cacheReady.current) { rafId = requestAnimationFrame(animate); return; }
      const now = performance.now();
      const pos = miffyPosRef.current;
      const mx = pos.x + MIFFY_HALF;
      const my = pos.y + MIFFY_HALF;

      // ── Spawn wake ripples along Miffy's path ──
      const pdx = mx - prevMiffyRef.current.x;
      const pdy = my - prevMiffyRef.current.y;
      const moveDist = Math.sqrt(pdx * pdx + pdy * pdy);
      spawnAccum.current += moveDist;

      if (spawnAccum.current > SPAWN_INTERVAL) {
        // Spawn ripple(s) along the path — stronger when moving faster
        const amp = MAX_AMP;
        ripplesRef.current.push({ x: mx, y: my, born: now, amp });
        spawnAccum.current = 0;
      }
      prevMiffyRef.current = { x: mx, y: my };

      // ── Prune old ripples ──
      ripplesRef.current = ripplesRef.current.filter((r) => now - r.born < RIPPLE_LIFETIME);

      const ripples = ripplesRef.current;
      const cache = wordCacheRef.current;

      for (let i = 0; i < cache.length; i++) {
        const w = cache[i];

        // ── Sum displacement from all active ripples ──
        let totalTx = 0;
        let totalTy = 0;
        let maxBlend = 0;
        let hit = false;

        for (let j = 0; j < ripples.length; j++) {
          const rip = ripples[j];
          const rdx = w.x - rip.x;
          const rdy = w.y - rip.y;
          const dist = Math.sqrt(rdx * rdx + rdy * rdy);

          if (dist > INFLUENCE) continue;

          const age = (now - rip.born) / 1000; // seconds
          const radius = age * RIPPLE_SPEED;    // expanding ring position
          const decay = Math.max(0, 1 - (now - rip.born) / RIPPLE_LIFETIME); // amplitude decay

          // Distance from this word to the expanding ring
          const ringDist = dist - radius;
          // Smooth falloff — gentle everywhere
          const normDist = Math.min(dist / INFLUENCE, 1);
          const falloff = (1 - normDist) * (1 - normDist);

          // Sine wave centered on the expanding ring
          const wave = Math.sin(ringDist / WAVELENGTH * Math.PI * 2);
          const strength = wave * rip.amp * decay * falloff;

          // Radial push outward from ripple origin
          const angle = dist > 0 ? Math.atan2(rdy, rdx) : 0;
          totalTx += Math.cos(angle) * strength;
          totalTy += Math.sin(angle) * strength * 0.4;

          const blend = decay * falloff;
          if (blend > maxBlend) maxBlend = blend;
          hit = true;
        }

        if (hit) {
          w.lastHitTime = now;
          w.el.style.transform = `translate(${totalTx.toFixed(1)}px,${totalTy.toFixed(1)}px)`;
          if (!w.skipColor) {
            const blend = Math.min(maxBlend * 0.8, 0.85);
            if (w.isStrike) {
              // Subtle flash for strikethrough: brighten/darken from original
              const flash = Math.round(w.origRGB[0] + (220 - w.origRGB[0]) * blend * 0.4);
              w.el.style.color = `rgb(${flash},${flash},${flash})`;
            } else {
              const grey = Math.round(BASE_RGB[0] + (RIPPLE_RGB[0] - BASE_RGB[0]) * blend);
              w.el.style.color = `rgb(${grey},${grey},${grey})`;
            }
          }
          w.el.style.textShadow = '';
          w.active = true;
        } else if (w.active) {
          w.el.style.transform = '';
          w.el.style.color = '';
          w.el.style.textShadow = '';
          w.active = false;
        }
      }

      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      window.removeEventListener('scroll', scheduleRebuild);
      window.removeEventListener('resize', scheduleRebuild);
      ripplesRef.current = [];
      wordCacheRef.current.forEach((w) => {
        w.el.style.transform = '';
        w.el.style.color = '';
        w.el.style.textShadow = '';
      });
    };
  }, [miffyActivated]);

  return (
    <>
      {miffyActivated && (
        <div
          className="fixed z-50 cursor-grab active:cursor-grabbing select-none touch-none group"
          style={{ 
            transform: `translate3d(${miffyPos.x}px, ${miffyPos.y}px, 0)`,
            willChange: 'transform',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
        >
          {!isDragging && !isMoving && (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#AD606E] text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-[family-name:var(--font-geist-mono)]">
              isa's miffy
            </span>
          )}
          <img
            src={miffyTongue ? "/miffy-tongue.png" : (isDragging || isMoving) ? (runFrame === 0 ? "/miffy-left.png" : "/miffy-right.png") : "/miffy2.png"}
            alt="miffy"
            width={70}
            height={70}
            className={`drop-shadow-lg pointer-events-none shrink-0 ${isBouncing ? `miffy-wall-bounce-${isBouncing}` : 'miffy-wobble'}`}
            draggable={false}
          />
        </div>
      )}
      <main className="max-w-xl mx-auto px-6 py-16 font-[family-name:var(--font-geist-mono)] text-neutral-800">
      <div className="flex items-center gap-4 mb-6 relative">
        <Image
          src="/headshot.jpeg"
          alt="isabelle headshot"
          width={60}
          height={60}
          className="rounded-full shrink-0"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold font-[family-name:var(--font-geist-mono)]">
            <span className="shimmer">isabelle<br className="md:hidden" /> reksopuro</span>
          </h1>
          <div className="flex gap-4">
            <a href="mailto:reksopuro.isabelle@gmail.com" className="text-[#3a5b39] hover:text-[#2d472d] transition-colors" title="email">
              <HugeiconsIcon icon={Mail01Icon} size={18} />
            </a>
            <a href="https://twitter.com/isareksopuro" className="text-[#3a5b39] hover:text-[#2d472d] transition-colors" title="twitter">
              <HugeiconsIcon icon={TwitterIcon} size={18} />
            </a>
            <a href="https://isabellereksopuro.substack.com/" className="text-[#3a5b39] hover:text-[#2d472d] transition-colors" title="substack">
              <HugeiconsIcon icon={Bookmark01Icon} size={18} />
            </a>
            <a href="https://www.yelp.com/user_details?userid=qBYWRSBD84kFRkHu_qFTTg" className="text-[#3a5b39] hover:text-[#2d472d] transition-colors" title="yelp">
              <HugeiconsIcon icon={YelpIcon} size={18} />
            </a>
            <a href="https://www.linkedin.com/in/isabellereks/" className="text-[#3a5b39] hover:text-[#2d472d] transition-colors" title="linkedin">
              <HugeiconsIcon icon={Linkedin01Icon} size={18} />
            </a>
          </div>
        </div>
        {!miffyActivated && (
          <div
            ref={initialMiffyRef}
            className="absolute right-0 top-0 cursor-grab active:cursor-grabbing select-none touch-none group"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={handleDoubleClick}
          >
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#AD606E] text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-[family-name:var(--font-geist-mono)]">
              isa's miffy
            </span>
            <img
              src={miffyTongue ? "/miffy-tongue.png" : "/miffy2.png"}
              alt="miffy"
              width={70}
              height={70}
              className="miffy-bounce drop-shadow-lg pointer-events-none"
              draggable={false}
            />
          </div>
        )}
      </div>

      <div ref={mainContentRef} className="space-y-4 text-sm leading-relaxed font-serif">
        {/* <div className="bg-[#ad606e23] border-l-2 border-[#ad606ec7] rounded-r-lg px-4 py-3 max-w-[400px] font-[family-name:var(--font-inter)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[#AD606E] font-semibold text-sm">
              ⚡️🪽 need to write college essays?
            </span>
            <span className="ring-on-hover">
              <a
                href="https://cal.com/isabellereks"
                className="btn-shimmer shake-on-hover px-2 py-0.5 text-[9px] bg-gradient-to-r from-[#AD606E] to-[#d4838f] text-white rounded-full hover:shadow-md hover:scale-105 transition-all font-[family-name:var(--font-geist-mono)]"
              >
                book a call!
              </a>
            </span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-gray-500 text-[10px] font-[family-name:var(--font-geist-mono)]">
              helped students get into:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: "columbia", href: "https://columbia.edu", src: "/columbia.png" },
                { name: "berkeley", href: "https://berkeley.edu", src: "/berkeley.png" },
                { name: "uw", href: "https://uw.edu", src: "/uw.png" },
                { name: "cmu", href: "https://www.cmu.edu", src: "/cmu.png" },
                { name: "uiuc", href: "https://illinois.edu", src: "/uiuc.jpg" },
                { name: "waterloo", href: "https://uwaterloo.ca", src: "/waterloo.png" },
              ].map((school) => (
                <a
                  key={school.name}
                  href={school.href}
                  className="inline-flex gap-0.5 items-center opacity-90 grayscale hover:grayscale-0 transition-all hover:opacity-100 text-[10px] text-neutral-600 font-[family-name:var(--font-inter)]"
                >
                  <Image src={school.src} alt={school.name} width={12} height={12} />
                  {school.name}
                </a>
              ))}
            </div>
          </div>
        </div> */}

        <p>
          hi! i'm isabelle, an indonesian-american <span className="inline-block animate-pulse">🇮🇩🇺🇸</span> @{" "}
          <a href="https://www.washington.edu/" className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
            university of washington
          </a>{" "}
          exploring the intersection of tech & public policy.
        </p>

        <p>
          i think it's terrible our <span className="highlighter-hover">politicians don't know how wifi works</span>,
          and the ones that do are misusing taxpayer funds to develop weapons with
          artificial intelligence. i've made it my personal mission to work on
          projects dealing with tech and improving how it intersects in our lives.
        </p>

        <p>
          on the side, i plan on traveling the world + eating through all the
          cuisines it has to offer. if you're also curious about tech or want to
          get a matcha,{" "}
          <a href="https://cal.com/isabellereks" className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
            let's chat
          </a>
          !
        </p>

        <p className="pt-2 text-xl font-semibold text-[#AD606E] font-[family-name:var(--font-geist-mono)] tracking-tight">currently</p>

        <p>
          right now, i'm <s className="font-[family-name:var(--font-geist-mono)] font-semibold text-neutral-400 select-text">in class</s> building side projects on my twitter account and running
          the{" "}
          <a
            href="https://www.instagram.com/seattlejunkjournalclub/"
            className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
          >
            seattle junk journal club
          </a>
          ! i'm also getting back into writing (check out{" "}
          <a
            href="https://isabellereksopuro.substack.com/"
            className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
          >
            my substack
          </a>
          !).
        </p>

        <p>
          i'm also working on campaigning for reproductive justice and forming a
          sexual assault task force with{" "}
          <a
            href="https://www.advocatesforyouth.org/"
            className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
          >
            advocates for youth
          </a>{" "}
          in washington, d.c and seattle, wa.
        </p>

        <p>
          in my spare time, i help lead the student ambassador program at the{" "}
          <a href="https://aaylc.org" className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
            asian american youth leadership conference
          </a>{" "}
          for 600+ students! i also created their 2024 and 2025 booklet with my
          experience at <a href="https://www.fedex.com" className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">fedex</a>.
        </p>

        <p>
          <button
            onClick={() => setShowPast(!showPast)}
            className="bg-[#ad606e15] hover:bg-[#ad606e25] px-3 py-1 rounded-lg text-sm font-medium text-neutral-600 hover:text-neutral-800 cursor-pointer transition-colors font-[family-name:var(--font-geist-mono)]"
          >
            past {showPast ? "▾" : "▸"}
          </button>
        </p>

        {showPast && (
          <div className="text-neutral-600 space-y-3 pl-4 border-l-2 border-neutral-200">
            <p>
              in 2025, i interned at the{" "}
              <a href="https://www.napca.org/" className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
                national asian pacific center of aging
              </a>
              , and i worked on their public policy initiative and caregiver project,
              a database for aapi elderly to get the resources they need in one
              accessible place, + helped develop ai-friendly curriculum for elderly
              workforce trainings as well as advocating for them in the public policy
              sphere.
            </p>
            <p>
              i also worked with{" "}
              <a href="https://million.dev" className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
                million
              </a>{" "}
              helping with operations + working with content creators / growth. hosted 2{" "}
              <a href="https://lu.ma/vev6er27" className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
                matcha events
              </a>{" "}
              with over 200+ in attendance and 300+ on the waitlist, and yc's first{" "}
              <a href="https://lu.ma/hzwlapu0" className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
                agents hackathon
              </a>
              .
            </p>
            <p>
              in 2024, i worked at the{" "}
              <a
                href="https://www.seattle.gov/city-light"
                className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
              >
                city of seattle
              </a>{" "}
              as a race and social justice intern to address workplace barriers. i
              helped overhauled our file system into a clean digital archive, and
              launched a habit challenge to chip away at internal bias.
            </p>
            <p>
              during 2023, i worked with{" "}
              <a
                href="https://www.oregonhealthequity.org/"
                className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
              >
                oregon health equity alliance
              </a>{" "}
              as part of their community leadership cohort to help distribute
              resources to over 200+ houseless people and do research on data justice.
              i've also worked with{" "}
              <a
                href="https://www.coalitioncommunitiescolor.org/"
                className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
              >
                coalition of communities of color
              </a>{" "}
              in designing step up, clackamas!, an annual event for students to talk
              about what they want to see changed in their own communities!
            </p>
            <p>
              in the summer of 2022, i did a mentorship at{" "}
              <a
                href="https://www.swri.org/content/home"
                className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
              >
                southwest research institute
              </a>{" "}
              looking into their autonomous vehicles department! this is where i found
              out i wanted to work in artificial intelligence ethics!
            </p>
            <p>
              in high school, i was a leader in youth activism in portland! i was part
              of my school district's youth equity board as well as chair of my own
              equity committee, where we passed legislation for securing counselors
              for mental health and sexual violence awareness. i was also captain of
              my debate team!
            </p>
          </div>
        )}

        <p>
          <button
            onClick={() => setShowMisc(!showMisc)}
            className="bg-[#ad606e15] hover:bg-[#ad606e25] px-3 py-1 rounded-lg text-sm font-medium text-neutral-600 hover:text-neutral-800 cursor-pointer transition-colors font-[family-name:var(--font-geist-mono)]"
          >
            misc {showMisc ? "▾" : "▸"}
          </button>
        </p>

        {showMisc && (
          <div className="text-neutral-600 space-y-3 pl-4 border-l-2 border-neutral-200">
            <p>
              i like binging k-dramas (ask me what i'm watching!), downing gallons of
              matcha, baking blueberry scones, and reading at 1,200+ WPM
              (unofficially benchmarked).
            </p>
            {/* <p>
              thank you to{" "}
              <a href="https://annasgarden.dev" className="font-semibold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
                anna's garden
              </a>{" "}
              for the inspiration! (hint: enter the garden!)
            </p> */}
          </div>
        )}

        <p className="pt-8 text-center text-neutral-400 text-[10px] font-[family-name:var(--font-geist-mono)]">
          made with stardust ★ by isabelle
        </p>
      </div>
    </main>
    <EarbudReveal />
    </>
  );
}
