"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, TwitterIcon, Bookmark01Icon, YelpIcon, Linkedin01Icon } from "@hugeicons/core-free-icons";

export default function Home() {
  const [showPast, setShowPast] = useState(false);
  const [showMisc, setShowMisc] = useState(false);
  const [miffyPos, setMiffyPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [miffyTongue, setMiffyTongue] = useState(false);
  const [runFrame, setRunFrame] = useState(0);

  useEffect(() => {
    if (isDragging) {
      const interval = setInterval(() => {
        setRunFrame((prev) => (prev === 0 ? 1 : 0));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setMiffyPos({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setMiffyPos({
      x: touch.clientX - dragOffset.x,
      y: touch.clientY - dragOffset.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    setMiffyTongue(true);
    setTimeout(() => setMiffyTongue(false), 1000);
  };

  return (
    <>
      {(miffyPos.x !== 0 || miffyPos.y !== 0) && (
        <div
          className="fixed z-50 cursor-grab active:cursor-grabbing select-none"
          style={{ 
            left: miffyPos.x,
            top: miffyPos.y,
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={miffyTongue ? "/miffy-tongue.png" : isDragging ? (runFrame === 0 ? "/miffy-left.png" : "/miffy-right.png") : "/miffy2.png"}
            alt="miffy"
            className="drop-shadow-lg pointer-events-none miffy-wobble w-[70px] h-[87px] min-w-[70px]"
            draggable={false}
          />
        </div>
      )}
      <main className="max-w-xl mx-auto px-6 py-16 font-[family-name:var(--font-geist-mono)] text-neutral-800">
      <div className="flex items-center gap-4 mb-6">
        <Image
          src="/headshot.jpeg"
          alt="isabelle headshot"
          width={60}
          height={60}
          className="rounded-full"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-[family-name:var(--font-geist-mono)]">
            <span className="shimmer">Isabelle Reksopuro</span>
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
            className="cursor-grab active:cursor-grabbing select-none self-start"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
          >
            <img
              src={miffyTongue ? "/miffy-tongue.png" : "/miffy2.png"}
              alt="miffy"
              className="miffy-bounce miffy-wobble drop-shadow-lg pointer-events-none w-[70px] h-[87px] min-w-[70px]"
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
          <a href="https://www.washington.edu/" className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
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
          <a href="https://cal.com/isabellereks" className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
            let's chat
          </a>
          !
        </p>

        <p className="pt-2 text-xl font-bold text-[#AD606E] font-[family-name:var(--font-geist-mono)]">currently</p>

        <p>
          right now, i'm building side projects on my twitter account and running
          the{" "}
          <a
            href="https://www.instagram.com/seattlejunkjournalclub/"
            className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
          >
            seattle junk journal club
          </a>
          ! i'm also getting back into writing (check out{" "}
          <a
            href="https://isabellereksopuro.substack.com/"
            className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
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
            className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
          >
            advocates for youth
          </a>{" "}
          in washington, d.c and seattle, wa.
        </p>

        <p>
          in my spare time, i help lead the student ambassador program at the{" "}
          <a href="https://aaylc.org" className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
            asian american youth leadership conference
          </a>{" "}
          for 600+ students! i also created their 2024 and 2025 booklet with my
          experience at <a href="https://www.fedex.com" className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">fedex</a>.
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
              i just finished interning at the{" "}
              <a href="https://www.napca.org/" className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
                national asian pacific center of aging
              </a>
              , and i worked on their public policy initiative and caregiver project,
              a database for aapi elderly to get the resources they need in one
              accessible place, + helped develop ai-friendly curriculum for elderly
              workforce trainings as well as advocating for them in the public policy
              sphere.
            </p>
            <p>
              in 2024, i worked at the{" "}
              <a
                href="https://www.seattle.gov/city-light"
                className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
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
                className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
              >
                oregon health equity alliance
              </a>{" "}
              as part of their community leadership cohort to help distribute
              resources to over 200+ houseless people and do research on data justice.
              i've also worked with{" "}
              <a
                href="https://www.coalitioncommunitiescolor.org/"
                className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
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
                className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]"
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
              matcha, baking the latest tiktok trend, and reading at 1,200+ WPM
              (unofficially benchmarked).
            </p>
            {/* <p>
              thank you to{" "}
              <a href="https://annasgarden.dev" className="font-bold hover:text-neutral-500 font-[family-name:var(--font-geist-mono)]">
                anna's garden
              </a>{" "}
              for the inspiration! (hint: enter the garden!)
            </p> */}
          </div>
        )}

        <p className="pt-8 text-center text-neutral-400 text-xs font-[family-name:var(--font-geist-mono)]">
          made with stardust ★ by isabelle
        </p>
      </div>
    </main>
    </>
  );
}
