"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, TwitterIcon, Bookmark01Icon, YelpIcon, Linkedin01Icon } from "@hugeicons/core-free-icons";

export default function Home() {
  const [showPast, setShowPast] = useState(false);
  const [showMisc, setShowMisc] = useState(false);
  const [miffyPos, setMiffyPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [miffyTongue, setMiffyTongue] = useState(false);
  const [runFrame, setRunFrame] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const initialMiffyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging && !isMoving) return;
    const interval = setInterval(() => {
      setRunFrame((prev) => (prev === 0 ? 1 : 0));
    }, 100);
    return () => clearInterval(interval);
  }, [isDragging, isMoving]);

  useEffect(() => {
    const STEP = 15;
    let moveTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      
      setIsMoving(true);
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => setIsMoving(false), 150);

      setMiffyPos((prev) => {
        let { x, y } = prev;
        if (x === 0 && y === 0 && initialMiffyRef.current) {
          const rect = initialMiffyRef.current.getBoundingClientRect();
          x = rect.left;
          y = rect.top;
        }
        switch (e.key) {
          case 'ArrowUp': return { x, y: y - STEP };
          case 'ArrowDown': return { x, y: y + STEP };
          case 'ArrowLeft': return { x: x - STEP, y };
          case 'ArrowRight': return { x: x + STEP, y };
          default: return { x, y };
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(moveTimeout);
    };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setMiffyPos({
      x: e.clientX - dragOffsetRef.current.x,
      y: e.clientY - dragOffsetRef.current.y,
    });
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
    setIsDragging(true);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setMiffyPos({
      x: touch.clientX - dragOffsetRef.current.x,
      y: touch.clientY - dragOffsetRef.current.y,
    });
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

  return (
    <>
      {(miffyPos.x !== 0 || miffyPos.y !== 0) && (
        <div
          className="fixed z-50 cursor-grab active:cursor-grabbing select-none touch-none"
          style={{ 
            transform: `translate3d(${miffyPos.x}px, ${miffyPos.y}px, 0)`,
            willChange: 'transform',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={miffyTongue ? "/miffy-tongue.png" : (isDragging || isMoving) ? (runFrame === 0 ? "/miffy-left.png" : "/miffy-right.png") : "/miffy2.png"}
            alt="miffy"
            width={70}
            height={70}
            className="drop-shadow-lg pointer-events-none miffy-wobble shrink-0"
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
        {miffyPos.x === 0 && miffyPos.y === 0 && (
          <div
            ref={initialMiffyRef}
            className="absolute right-0 top-0 cursor-grab active:cursor-grabbing select-none touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={handleDoubleClick}
          >
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

      <div className="space-y-4 text-sm leading-relaxed font-serif">
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
          right now, i'm building side projects on my twitter account and running
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
    </>
  );
}
