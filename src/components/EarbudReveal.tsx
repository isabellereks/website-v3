'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import IPod from '@/app/ipod/IPod';
import './EarbudReveal.css';

type Phase = 'idle' | 'drawing' | 'unplugging' | 'open' | 'plugging' | 'closing';

export default function EarbudReveal() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 });
  const unitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleClick = useCallback((): void => {
    if (phase !== 'idle') return;
    setPhase('drawing');
  }, [phase]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (phase === 'drawing') {
      timer = setTimeout(() => setPhase('unplugging'), 900);
    } else if (phase === 'unplugging') {
      timer = setTimeout(() => setPhase('open'), 1000);
    } else if (phase === 'closing') {
      // Unit slides to corner, then earbuds bounce back
      timer = setTimeout(() => setPhase('plugging'), 1400);
    } else if (phase === 'plugging') {
      // Earbuds bounce in, then settle to idle
      timer = setTimeout(() => setPhase('idle'), 1200);
    }
    return () => clearTimeout(timer);
  }, [phase]);

  const handleClose = useCallback((): void => {
    setPhase('closing');
  }, []);

  if (!windowSize.w) return null;

  const isMobile = windowSize.w < 768;


  const scale = isMobile ? 0.7 : 1;
  const ipodW = 320;
  const ipodH = 580;
  const earbudsAbove = isMobile ? 150 : 220;

  // Simple pixel positions — no scale division
  const centerX = (windowSize.w - ipodW * scale) / 2;
  const centerY = (windowSize.h - ipodH * scale) / 2 - earbudsAbove * scale;

  // Idle: earbuds visible in bottom-right corner.
  // Push Y down enough that the iPod (below earbuds) is off-screen,
  // but the earbuds (~360px tall) are fully visible.
  const idleX = windowSize.w - (isMobile ? 100 : 160);
  const idleY = windowSize.h - 80;

  const isDrawnUp = phase === 'drawing' || phase === 'unplugging' || phase === 'open';
  const earbudsOff = phase === 'unplugging' || phase === 'open' || phase === 'closing';
  const isInteractive = phase === 'open';
  const showBackdrop = phase === 'unplugging' || phase === 'open' || phase === 'closing';

  return (
    <>
      <AnimatePresence>
        {showBackdrop && (
          <motion.div
            className="ipod-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={isInteractive ? handleClose : undefined}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={unitRef}
        className="reveal-unit"
        style={{
          pointerEvents: isDrawnUp ? 'auto' : 'none',
          zIndex: isDrawnUp ? 96 : undefined,
        }}
        initial={{ x: idleX, y: windowSize.h + 100, scale: scale * 0.9 }}
        animate={{
          x: isDrawnUp ? centerX : idleX,
          y: isDrawnUp ? centerY : idleY,
          scale: isDrawnUp ? scale : scale * 0.9,
        }}
        transition={{
          ...(phase === 'idle'
            ? { type: 'spring' as const, stiffness: 150, damping: 15, mass: 0.8 }
            : {
                duration: phase === 'drawing' ? 0.9 : phase === 'closing' ? 1.4 : 0.4,
                ease: phase === 'closing' ? [0.4, 0, 0.2, 1] : [0.22, 1, 0.36, 1],
              }),
        }}
      >
        {/* PNG Earbuds - behind iPod, slides up to unplug */}
        <motion.div
          className="earbuds-part"
          animate={{
            y: earbudsOff ? -500 : 0,
            opacity: earbudsOff ? 0 : 1,
          }}
          transition={earbudsOff
            ? { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
            : { type: 'spring', stiffness: 120, damping: 14, mass: 1 }
          }
          onClick={phase === 'idle' ? handleClick : undefined}
          style={{ cursor: phase === 'idle' ? 'pointer' : 'default', pointerEvents: 'auto' }}
        >
          <div className="earbud-image-wrapper">
            <Image
              src="/earbuds.png"
              alt="earbuds"
              width={500}
              height={400}
              className="earbud-image"
              priority
            />
          </div>
          <div className="music-notes">
            <span className="music-note note-1">&#9835;</span>
            <span className="music-note note-2">&#9834;</span>
            <span className="music-note note-3">&#9833;</span>
          </div>
        </motion.div>

        {/* Real iPod — mounted when drawn up + during closing slide, unmounts when idle */}
        <div className={`ipod-part ${isInteractive ? 'interactive' : ''}`}>
          {(isDrawnUp || phase === 'closing') && <IPod />}
        </div>
      </motion.div>
    </>
  );
}
