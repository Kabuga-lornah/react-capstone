import React, { useState } from "react";

const ContactUs = () => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(null);
  const [hovering, setHovering] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <>
      <style>{`
        .cfu-root * { box-sizing: border-box; margin: 0; padding: 0; }

        .cfu-root {
          font-family: inherit;
          min-height: 100vh;
          background: #0e0c0a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .cfu-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1080px;
          width: 100%;
          min-height: 620px;
          border: 1px solid rgba(255, 165, 0, 0.15);
          position: relative;
          overflow: hidden;
          background: #141210;
        }

        @media (max-width: 768px) {
          .cfu-card { grid-template-columns: 1fr; }
          .cfu-left { min-height: 280px; }
        }

        /* ── LEFT PANEL ── */
        .cfu-left {
          position: relative;
          overflow: hidden;
          background: #0a0908;
        }

        .cfu-left-bg {
          position: absolute; inset: 0;
          background: linear-gradient(160deg, #1a1108 0%, #0a0603 60%, #0e0a06 100%);
        }

        .cfu-left-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          opacity: 0.45;
          mix-blend-mode: luminosity;
          transition: opacity 0.6s ease;
        }

        .cfu-left-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg,
            rgba(10,8,5,0.1) 0%,
            rgba(10,8,5,0.0) 30%,
            rgba(255,140,0,0.06) 70%,
            rgba(10,8,5,0.85) 100%
          );
        }

        .cfu-left-content {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 40px 36px;
        }

        .cfu-eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #FFA500;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cfu-eyebrow::before {
          content: '';
          display: block;
          width: 28px; height: 1px;
          background: #FFA500;
        }

        .cfu-left-title {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 800;
          color: #fdf8f0;
          line-height: 1.15;
          margin-bottom: 20px;
        }

        .cfu-left-title em {
          font-style: italic;
          color: #FFA500;
        }

        .cfu-divider {
          width: 48px; height: 2px;
          background: linear-gradient(90deg, #FFA500, transparent);
          margin-bottom: 22px;
        }

        .cfu-contact-items { display: flex; flex-direction: column; gap: 12px; }

        .cfu-contact-item {
          display: flex; align-items: flex-start; gap: 12px;
          color: rgba(253,248,240,0.65);
          font-size: 13px; line-height: 1.5;
        }

        .cfu-contact-icon {
          width: 30px; height: 30px; flex-shrink: 0;
          border: 1px solid rgba(255,165,0,0.3);
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,165,0,0.07);
        }

        .cfu-contact-icon svg { width: 13px; height: 13px; fill: #FFA500; }

        .cfu-contact-label {
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(255,165,0,0.6); margin-bottom: 1px;
        }

        /* ── RIGHT PANEL ── */
        .cfu-right {
          padding: 52px 48px;
          background: #141210;
          display: flex; flex-direction: column; justify-content: center;
          position: relative;
        }

        .cfu-right::before {
          content: '';
          position: absolute; top: 0; left: 0;
          width: 100%; height: 2px;
          background: linear-gradient(90deg, #FFA500, transparent);
        }

        .cfu-form-eyebrow {
          font-size: 11px; font-weight: 500; letter-spacing: 0.2em;
          text-transform: uppercase; color: rgba(255,165,0,0.6);
          margin-bottom: 10px;
        }

        .cfu-form-title {
          font-size: 32px; font-weight: 800;
          color: #fdf8f0; margin-bottom: 32px;
          line-height: 1.2;
        }

        .cfu-form-title span { color: #FFA500; }

        .cfu-form { display: flex; flex-direction: column; gap: 18px; }

        .cfu-field { display: flex; flex-direction: column; gap: 6px; }

        .cfu-label {
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(253,248,240,0.4); font-weight: 500;
        }

        .cfu-input, .cfu-textarea {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fdf8f0;
          padding: 13px 16px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition: border-color 0.25s, background 0.25s;
          border-radius: 0;
          width: 100%;
        }

        .cfu-input::placeholder, .cfu-textarea::placeholder {
          color: rgba(253,248,240,0.2);
        }

        .cfu-input:focus, .cfu-textarea:focus {
          border-color: rgba(255,165,0,0.6);
          background: rgba(255,165,0,0.04);
        }

        .cfu-textarea { min-height: 110px; resize: none; }

        .cfu-btn {
          margin-top: 8px;
          background: #FFA500;
          color: #0a0603;
          border: none;
          padding: 15px 28px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.25s, transform 0.15s;
          display: flex; align-items: center; gap: 10px; justify-content: center;
          border-radius: 0;
        }

        .cfu-btn:hover { background: #ffb733; transform: translateY(-1px); }
        .cfu-btn:active { transform: translateY(0); }

        .cfu-btn-arrow {
          width: 18px; height: 18px;
          border: 2px solid rgba(10,6,3,0.5);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }

        .cfu-btn-arrow svg { width: 8px; height: 8px; fill: #0a0603; }

        .cfu-success {
          background: rgba(255,165,0,0.08);
          border: 1px solid rgba(255,165,0,0.25);
          padding: 14px 18px;
          margin-bottom: 24px;
          display: flex; align-items: center; gap: 12px;
        }

        .cfu-success-icon {
          width: 22px; height: 22px; flex-shrink: 0;
          background: #FFA500;
          display: flex; align-items: center; justify-content: center;
        }

        .cfu-success-icon svg { width: 11px; height: 11px; fill: #0a0603; }

        .cfu-success-text {
          font-size: 13px; color: rgba(255,165,0,0.9);
          line-height: 1.4;
        }

        /* Decorative corner marks */
        .cfu-corner {
          position: absolute;
          width: 20px; height: 20px;
        }
        .cfu-corner-tl { top: 16px; left: 16px; border-top: 1.5px solid rgba(255,165,0,0.35); border-left: 1.5px solid rgba(255,165,0,0.35); }
        .cfu-corner-br { bottom: 16px; right: 16px; border-bottom: 1.5px solid rgba(255,165,0,0.35); border-right: 1.5px solid rgba(255,165,0,0.35); }

        /* Subtle grain overlay */
        .cfu-grain {
          position: absolute; inset: 0; pointer-events: none;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 180px;
        }
      `}</style>

      <div className="cfu-root">
        <div className="cfu-card">
          <div className="cfu-corner cfu-corner-tl" />
          <div className="cfu-corner cfu-corner-br" />
          <div className="cfu-grain" />

          {/* LEFT */}
          <div className="cfu-left">
            <div className="cfu-left-bg" />
            <img
              className="cfu-left-img"
              src="/contactus.jpg"
              alt="Contact"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800'%3E%3Crect width='600' height='800' fill='%23201a10'/%3E%3C/svg%3E";
              }}
            />
            <div className="cfu-left-overlay" />
            <div className="cfu-left-content">
              <div className="cfu-eyebrow">My Furry Friends</div>
              <h1 className="cfu-left-title">
                We'd love to<br /><em>hear from you.</em>
              </h1>
              <div className="cfu-divider" />
              <div className="cfu-contact-items">
                <div className="cfu-contact-item">
                  <div className="cfu-contact-icon">
                    <svg viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                  </div>
                  <div>
                    <div className="cfu-contact-label">Email</div>
                    support@myfurryfriends.com
                  </div>
                </div>
                <div className="cfu-contact-item">
                  <div className="cfu-contact-icon">
                    <svg viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                  </div>
                  <div>
                    <div className="cfu-contact-label">Phone</div>
                    +254 712 345 678
                  </div>
                </div>
                <div className="cfu-contact-item">
                  <div className="cfu-contact-icon">
                    <svg viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                  </div>
                  <div>
                    <div className="cfu-contact-label">Location</div>
                    Ngong Road, Nairobi, Kenya
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="cfu-right">
            <div className="cfu-form-eyebrow">Get in Touch</div>
            <h2 className="cfu-form-title">
              Send us a<br /><span>message.</span>
            </h2>

            {submitted && (
              <div className="cfu-success">
                <div className="cfu-success-icon">
                  <svg viewBox="0 0 12 12"><path d="M1 6l3.5 3.5L11 2"/></svg>
                </div>
                <p className="cfu-success-text">
                  Thanks for reaching out! We'll get back to you soon.
                </p>
              </div>
            )}

            <form className="cfu-form" onSubmit={handleSubmit}>
              <div className="cfu-field">
                <label className="cfu-label">Your Name</label>
                <input
                  className="cfu-input"
                  type="text"
                  name="name"
                  placeholder="e.g. Amara Ochieng"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="cfu-field">
                <label className="cfu-label">Email Address</label>
                <input
                  className="cfu-input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="cfu-field">
                <label className="cfu-label">Message</label>
                <textarea
                  className="cfu-textarea"
                  name="message"
                  placeholder="Tell us how we can help..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>
              <button type="submit" className="cfu-btn">
                Send Message
                <span className="cfu-btn-arrow">
                  <svg viewBox="0 0 8 8"><path d="M1 4h6M4 1l3 3-3 3" stroke="#0a0603" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactUs;
