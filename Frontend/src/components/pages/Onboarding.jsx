import React, { useMemo, useState } from "react";

const SLIDES = [
  {
    emoji: "🐾",
    title: "Welcome to My FurryFriends",
    text: "Discover pets looking for safe, loving homes.",
    reminder: "Pets settle faster when they have a quiet space and a gentle routine.",
    image: "/doggysleeping.jpeg",
  },
  {
    emoji: "🧡",
    title: "Browse, Save, and Match",
    text: "Explore pets, save favorites to your Pet Pouch, and use the quiz to find pets that fit your lifestyle.",
    reminder: "Clear photos and personality notes help adopters connect faster.",
    image: "/sandwitch bunny.jpeg",
  },
  {
    emoji: "🩺",
    title: "Adopt Responsibly",
    text: "Ask about health, temperament, vaccination, deworming, and the ideal home before applying.",
    reminder: "Always ask about vaccination, deworming, and feeding routine before applying.",
    image: "/bunny.jpg",
  },
  {
    emoji: "🏡",
    title: "A Safe Space for Pets",
    text: "By continuing, you agree to use the platform responsibly and treat every adoption as a serious commitment.",
    reminder: "Adoption is a long-term commitment, not a quick impulse decision.",
    image: "/default-pet.jpg",
  },
];

const GARLAND_PHOTOS = [
  { src: "/doggysleeping.jpeg",    alt: "", x: "3%",  y: "8px",  rotate: "-7deg", delay: "0s"   },
  { src: "/sandwitch bunny.jpeg",  alt: "", x: "24%", y: "20px", rotate: "8deg",  delay: "0.7s" },
  { src: "/pretty eyes cat.jpeg",  alt: "", x: "49%", y: "5px",  rotate: "-5deg", delay: "1.5s" },
  { src: "/LionBunny.jpg",         alt: "", x: "73%", y: "18px", rotate: "7deg",  delay: "2.2s" },
  { src: "/tabby cat.jpg",         alt: "", x: "9%",  y: "120px",rotate: "-6deg", delay: "0.4s" },
  { src: "/grey cat.jpg",          alt: "", x: "34%", y: "136px",rotate: "6deg",  delay: "1.2s" },
  { src: "/Abyssinian.jpeg",       alt: "", x: "59%", y: "115px",rotate: "-7deg", delay: "2s"   },
  { src: "/duck.jpeg",             alt: "", x: "80%", y: "132px",rotate: "5deg",  delay: "2.8s" },
];

const Onboarding = ({ onFinish, onSkip }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];

  const progressLabel = useMemo(
    () => `${activeIndex + 1} of ${SLIDES.length}`,
    [activeIndex]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff7eb 0%, #fffdf9 50%, #fff3d9 100%)",
        fontFamily: "'Nunito', system-ui, sans-serif",
        color: "#1a1008",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900&family=Nunito:wght@400;700;800;900&display=swap');

        /* Hide app chrome on this screen */
        .mff-navbar,
        .mff-footer {
          display: none !important;
        }

        body {
          padding-bottom: 0 !important;
        }

        /* ─── Shell ─────────────────────────────── */
        .ob-shell {
          min-height: 100dvh;
          max-width: 390px;
          margin: 0 auto;
          padding: 18px 18px calc(18px + env(safe-area-inset-bottom, 0px));
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: 16px;
          position: relative;
          overflow: hidden;
        }

        .ob-flow {
          min-height: 0;
          display: grid;
          grid-template-rows: auto auto auto auto;
          align-content: space-evenly;
          gap: clamp(12px, 2vh, 18px);
          padding-block: 2px;
        }

        /* ─── Floating paw decorations ──────────── */
        .ob-paw {
          position: absolute;
          font-size: 16px;
          opacity: 0.18;
          pointer-events: none;
          animation: ob-float 5s ease-in-out infinite;
        }

        /* ─── Top bar ───────────────────────────── */
        .ob-pill {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 165, 0, 0.2);
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 11px;
          font-weight: 800;
          color: #9c5f00;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .ob-skip {
          background: none;
          border: none;
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 800;
          color: #9c5f00;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 999px;
          transition: background 0.18s;
        }

        .ob-skip:hover {
          background: rgba(255, 165, 0, 0.1);
        }

        /* ─── Garland ───────────────────────────── */
        .ob-garland {
          position: relative;
          height: 168px;
          width: 100%;
          margin-top: 0;
        }

        .ob-garland-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .ob-photo-frame {
          position: absolute;
          width: 58px;
          padding: 5px 5px 12px;
          background: rgba(255, 255, 255, 0.97);
          border-radius: 12px;
          border: 1px solid rgba(255, 165, 0, 0.15);
          box-shadow: 0 8px 22px rgba(120, 60, 0, 0.13);
          transform-origin: top center;
          animation: ob-sway 5s ease-in-out infinite;
        }

        .ob-photo-frame::before {
          content: "";
          position: absolute;
          top: -16px;
          left: 50%;
          transform: translateX(-50%);
          width: 1.5px;
          height: 17px;
          background: rgba(156, 95, 0, 0.28);
          border-radius: 999px;
        }

        .ob-photo-frame::after {
          content: "";
          position: absolute;
          top: -5px;
          left: 50%;
          transform: translateX(-50%);
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #ffd46c;
          box-shadow: 0 2px 5px rgba(255, 165, 0, 0.25);
        }

        .ob-photo-img {
          width: 100%;
          height: 50px;
          object-fit: cover;
          border-radius: 8px;
          display: block;
        }

        /* ─── Slide card ────────────────────────── */
        .ob-card {
          background: rgba(255, 252, 242, 0.98);
          border: 1.5px solid rgba(255, 165, 0, 0.14);
          border-radius: 28px;
          padding: 24px 22px 22px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 18px 44px rgba(255, 165, 0, 0.1);
        }

        .ob-card-glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .ob-emoji-wrap {
          width: 88px;
          height: 88px;
          margin: 0 auto 18px;
          background: linear-gradient(145deg, #fff0c8, #ffd46c);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          line-height: 1;
          box-shadow: 0 12px 24px rgba(255, 165, 0, 0.18);
          animation: ob-pulse 3s ease-in-out infinite;
        }

        .ob-title {
          font-family: 'Fraunces', serif;
          font-size: clamp(1.8rem, 8vw, 2.4rem);
          font-weight: 900;
          color: #5a3200;
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin: 0 0 10px;
        }

        .ob-text {
          color: #6b5a42;
          font-size: 15px;
          line-height: 1.7;
          font-weight: 700;
          margin: 0;
        }

        /* ─── Progress dots ─────────────────────── */
        .ob-dots {
          display: flex;
          justify-content: center;
          gap: 7px;
          margin-top: 20px;
        }

        .ob-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 165, 0, 0.2);
          transition: all 0.22s ease;
          cursor: pointer;
          border: none;
          padding: 0;
        }

        .ob-dot.active {
          width: 24px;
          background: linear-gradient(135deg, #ffa500, #e8750a);
        }

        /* ─── Reminder strip ────────────────────── */
        .ob-reminder {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 165, 0, 0.14);
          border-radius: 20px;
          padding: 11px;
          display: grid;
          grid-template-columns: 72px 1fr;
          gap: 12px;
          align-items: center;
          box-shadow: 0 10px 28px rgba(255, 165, 0, 0.07);
        }

        .ob-reminder-img {
          width: 72px;
          height: 72px;
          border-radius: 16px;
          object-fit: cover;
          border: 1px solid rgba(255, 165, 0, 0.12);
          display: block;
        }

        .ob-reminder-label {
          font-size: 10px;
          font-weight: 900;
          color: #e8750a;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .ob-reminder-text {
          color: #6b5a42;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
          margin: 0;
        }

        /* ─── Slide animation ───────────────────── */
        .ob-slide-frame {
          animation: ob-fade-up 0.3s ease;
          margin-top: 0;
        }

        /* ─── Buttons ───────────────────────────── */
        .ob-btn-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .ob-btn-primary {
          background: linear-gradient(135deg, #ffa500, #e8750a);
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 13px 18px;
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(255, 140, 0, 0.25);
          transition: transform 0.18s, box-shadow 0.18s;
        }

        .ob-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(255, 140, 0, 0.32);
        }

        .ob-btn-primary:active {
          transform: scale(0.98);
        }

        .ob-btn-secondary {
          background: rgba(255, 255, 255, 0.9);
          border: 1.5px solid rgba(255, 165, 0, 0.24);
          border-radius: 999px;
          padding: 13px 18px;
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 900;
          color: #9c5f00;
          cursor: pointer;
          transition: transform 0.18s, background 0.18s;
        }

        .ob-btn-secondary:hover {
          transform: translateY(-2px);
          background: #fff;
        }

        .ob-btn-secondary:active {
          transform: scale(0.98);
        }

        .ob-btn-secondary:disabled {
          opacity: 0;
          pointer-events: none;
        }

        /* ─── Keyframes ─────────────────────────── */
        @keyframes ob-float {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50%       { transform: translateY(-8px) rotate(4deg); }
        }

        @keyframes ob-sway {
          0%, 100% { transform: translateY(0) rotate(var(--frame-rotate)); }
          50%       { transform: translateY(-5px) rotate(calc(var(--frame-rotate) + 3deg)); }
        }

        @keyframes ob-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.06); }
        }

        @keyframes ob-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ─── Responsive tweaks ─────────────────── */
        @media (max-width: 400px) {
          .ob-shell {
            padding: 14px 14px calc(14px + env(safe-area-inset-bottom, 0px));
            gap: 12px;
          }

          .ob-flow {
            gap: 12px;
          }

          .ob-photo-frame {
            width: 52px;
          }

          .ob-photo-img {
            height: 44px;
          }

          .ob-garland {
            height: 148px;
          }

          .ob-card {
            padding: 20px 18px 18px;
            border-radius: 24px;
          }

          .ob-emoji-wrap {
            width: 78px;
            height: 78px;
            font-size: 34px;
            margin-bottom: 14px;
          }

          .ob-title {
            font-size: clamp(1.65rem, 7.5vw, 2.1rem);
            margin-bottom: 8px;
          }

          .ob-text {
            font-size: 14px;
          }

          .ob-reminder {
            grid-template-columns: 64px 1fr;
            gap: 10px;
            padding: 10px;
          }

          .ob-reminder-img {
            width: 64px;
            height: 64px;
          }

          .ob-btn-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ob-shell">
        {/* Background paw decorations */}
        <span className="ob-paw" aria-hidden="true" style={{ top: "110px",   left: "8px",   fontSize: "20px", animationDelay: "0s"   }}>🐾</span>
        <span className="ob-paw" aria-hidden="true" style={{ top: "240px",   right: "12px", fontSize: "16px", animationDelay: "1.4s" }}>🐾</span>
        <span className="ob-paw" aria-hidden="true" style={{ bottom: "180px",left: "18px",  fontSize: "14px", animationDelay: "2.2s" }}>🐾</span>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="ob-pill">
            <span>Getting started</span>
            <span>{progressLabel}</span>
          </div>
          <button type="button" className="ob-skip" onClick={onSkip} aria-label="Skip onboarding">
            Skip
          </button>
        </div>

        <div className="ob-flow">
          {/* Hanging photo garland */}
          <div className="ob-garland" aria-hidden="true">
            <svg className="ob-garland-svg" viewBox="0 0 354 190" preserveAspectRatio="none">
              <path
                d="M8 28 C58 0,118 60,172 22 C228 -4,288 52,346 18"
                fill="none"
                stroke="rgba(156,95,0,.3)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M18 130 C72 94,132 164,182 116 C234 72,290 148,338 108"
                fill="none"
                stroke="rgba(156,95,0,.22)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            {GARLAND_PHOTOS.map((photo) => (
              <div
                key={`${photo.src}-${photo.x}`}
                className="ob-photo-frame"
                style={{
                  left: photo.x,
                  top: photo.y,
                  "--frame-rotate": photo.rotate,
                  animationDelay: photo.delay,
                  transform: `rotate(${photo.rotate})`,
                }}
              >
                <img src={photo.src} alt={photo.alt} className="ob-photo-img" />
              </div>
            ))}
          </div>

          {/* Slide card */}
          <div key={slide.title} className="ob-slide-frame">
            <div className="ob-card">
              <div
                className="ob-card-glow"
                style={{
                  top: "-32px", right: "-32px",
                  width: "120px", height: "120px",
                  background: "radial-gradient(circle, rgba(255,165,0,.22) 0%, transparent 70%)",
                }}
              />
              <div
                className="ob-card-glow"
                style={{
                  bottom: "-28px", left: "-28px",
                  width: "100px", height: "100px",
                  background: "radial-gradient(circle, rgba(255,193,87,.18) 0%, transparent 70%)",
                }}
              />

              <div className="ob-emoji-wrap" aria-hidden="true">
                {slide.emoji}
              </div>

              <h1 className="ob-title">{slide.title}</h1>
              <p className="ob-text">{slide.text}</p>

              <div className="ob-dots" role="tablist" aria-label="Slide progress">
                {SLIDES.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    role="tab"
                    aria-selected={index === activeIndex}
                    aria-label={`Go to slide ${index + 1}`}
                    className={`ob-dot${index === activeIndex ? " active" : ""}`}
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="ob-reminder">
            <img
              src={slide.image}
              alt=""
              aria-hidden="true"
              className="ob-reminder-img"
            />
            <div>
              <div className="ob-reminder-label">Today&apos;s reminder</div>
              <p className="ob-reminder-text">{slide.reminder}</p>
            </div>
          </div>

          <div className="ob-btn-row">
            <button
              type="button"
              className="ob-btn-secondary"
              onClick={() => setActiveIndex((i) => i - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous slide"
            >
              Previous
            </button>

            {isLastSlide ? (
              <button type="button" className="ob-btn-primary" onClick={onFinish}>
                Finish
              </button>
            ) : (
              <button
                type="button"
                className="ob-btn-primary"
                onClick={() => setActiveIndex((i) => i + 1)}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
