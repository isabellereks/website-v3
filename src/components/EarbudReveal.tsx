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
    } else if (phase === 'plugging') {
      timer = setTimeout(() => setPhase('closing'), 800);
    } else if (phase === 'closing') {
      timer = setTimeout(() => setPhase('idle'), 500);
    }
    return () => clearTimeout(timer);
  }, [phase]);

  const handleClose = useCallback((): void => {
    setPhase('plugging');
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

  const idleX = windowSize.w - (isMobile ? 250 : 400);
  const idleY = windowSize.h - 150;

  const isDrawnUp = phase === 'drawing' || phase === 'unplugging' || phase === 'open' || phase === 'plugging';
  const earbudsOff = phase === 'unplugging' || phase === 'open';
  const isInteractive = phase === 'open';
  const showBackdrop = phase === 'unplugging' || phase === 'open' || phase === 'plugging';

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
        style={{ overflow: isDrawnUp ? 'visible' : 'hidden', maxHeight: isDrawnUp ? 'none' : '350px' }}
        initial={{ x: idleX, y: idleY, scale: scale * 0.9 }}
        animate={{
          x: isDrawnUp ? centerX : idleX,
          y: isDrawnUp ? centerY : idleY,
          scale: isDrawnUp ? scale : scale * 0.9,
        }}
        transition={{
          duration: phase === 'idle' ? 0 : phase === 'drawing' ? 0.9 : phase === 'closing' ? 0.45 : 0.4,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {/* PNG Earbuds - behind iPod, slides up to unplug */}
        <motion.div
          className="earbuds-part"
          animate={{
            y: earbudsOff ? -(windowSize.h + 400) : 0,
            opacity: earbudsOff ? 0 : 1,
          }}
          transition={{
            duration: earbudsOff ? 1.0 : 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          onClick={phase === 'idle' ? handleClick : undefined}
          style={{ cursor: phase === 'idle' ? 'pointer' : 'default' }}
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

        {/* Real iPod */}
        <div className={`ipod-part ${isInteractive ? 'interactive' : ''}`}>
          <IPod />
        </div>
      </motion.div>
    </>
  );
}
