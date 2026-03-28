'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import IPod from '@/app/ipod/IPod';
import './EarbudReveal.css';

type Phase = 'idle' | 'drawing' | 'open';

export default function EarbudReveal() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [toggling, setToggling] = useState(false);

  const handleClick = useCallback((): void => {
    if (phase !== 'idle') return;
    setPhase('drawing');
    setTimeout(() => setPhase('open'), 1200);
  }, [phase]);

  const handleClose = useCallback((): void => {
    setToggling(true);
    setTimeout(() => {
      setToggling(false);
      setPhase('idle');
    }, 400);
  }, []);

  return (
    <>
      {/* Earbuds - fixed bottom-right */}
      <AnimatePresence>
        {phase !== 'open' && (
          <motion.div
            className={`earbud-container ${phase === 'drawing' ? 'revealing' : ''}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1], exit: { duration: 0.15 } }}
            onMouseEnter={handleClick}
            onClick={handleClick}
          >
            {/* Earbud image - clipped to show up to the loop initially */}
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

            {/* Mini iPod at the end of the wire */}
            <div className="ipod-attached">
              <div className="ipod-attached-body">
                <div className="ipod-attached-bezel">
                  <div className="ipod-attached-screen">
                    <div className="ipod-attached-titlebar">isa&apos;s iPod</div>
                    <div className="ipod-attached-content" />
                  </div>
                </div>
                <div className="ipod-attached-wheel">
                  <div className="ipod-attached-wheel-center" />
                </div>
              </div>
            </div>

            {/* Music notes */}
            <div className="music-notes">
              <span className="music-note note-1">&#9835;</span>
              <span className="music-note note-2">&#9834;</span>
              <span className="music-note note-3">&#9833;</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iPod Modal */}
      <AnimatePresence>
        {phase === 'open' && (
          <>
            <motion.div
              className="ipod-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onClick={handleClose}
            />

            <motion.div
              className="ipod-modal-container"
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.92 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <IPod />
            </motion.div>

            <motion.button
              className="ipod-toggle-bar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              onClick={handleClose}
              aria-label="Close iPod"
            >
              <div className={`toggle-track ${toggling ? 'off' : 'on'}`}>
                <div className="toggle-knob" />
              </div>
            </motion.button>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
