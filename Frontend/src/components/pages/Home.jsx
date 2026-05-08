import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPets } from "../../services/api";
import { useAuth } from "./AuthContext";
import Onboarding from "./Onboarding";

const PET_CATEGORIES = [
  { label: "All", icon: "🐾" },
  { label: "Dogs", icon: "🐶" },
  { label: "Cats", icon: "🐱" },
  { label: "Rabbits", icon: "🐰" },
  { label: "Birds", icon: "🐦" },
  { label: "Other", icon: "✨" },
];

const CARE_TIPS = [
  "New pets settle faster with a quiet corner.",
  "Clear health records make adoption safer.",
  "Ask about vaccination and deworming before adopting.",
  "Give pets time to adjust before expecting perfect behavior.",
];

const QUICK_ACTIONS = [
  {
    key: "browse",
    title: "Browse Pets",
    subtitle: "See listings",
    icon: "🐾",
    to: "/pets",
    show: () => true,
  },
  {
    key: "quiz",
    title: "Take Quiz",
    subtitle: "Find your fit",
    icon: "✨",
    to: "/quiz",
    show: () => true,
  },
  {
    key: "pouch",
    title: "Pet Pouch",
    subtitle: "Saved pets",
    icon: "🧡",
    to: "/pet-pouch",
    show: (role) => role === "adopter" || role === "user",
  },
  {
    key: "applications",
    title: "My Applications",
    subtitle: "Track requests",
    icon: "📋",
    to: "/my-listing",
    show: (role) => role === "adopter" || role === "user",
  },
  {
    key: "add-pet",
    title: "Add Pet",
    subtitle: "Create listing",
    icon: "➕",
    to: "/add-pet",
    show: (role) => role === "rehomer" || role === "shelter_admin",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    subtitle: "Manage activity",
    icon: "📊",
    to: "/rehomer-dashboard",
    show: (role) => role === "rehomer" || role === "shelter_admin",
  },
];

const ONBOARDING_STORAGE_KEY = "hasSeenOnboarding";

const toTitleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const getPetImageUrl = (pet) => {
  const main = pet.images?.find((item) => item.is_main);
  const fallback = pet.images?.[0];
  return (
    pet.imageUrl ||
    pet.image_url ||
    main?.image_url ||
    fallback?.image_url ||
    main?.image ||
    fallback?.image ||
    "/default-pet.jpg"
  );
};

const normalizePet = (pet) => ({
  ...pet,
  id: String(pet.id),
  type: (() => {
    const baseType = String(pet.type || pet.species || "other").trim().toLowerCase();
    const customType = String(pet.custom_species || pet.species_label || "").trim();
    const breedFallback = String(pet.breed || "").trim();

    if (customType) {
      return customType;
    }

    if (baseType === "other" && breedFallback) {
      return breedFallback;
    }

    return baseType || "other";
  })(),
  personality: Array.isArray(pet.personality)
    ? pet.personality
    : Array.isArray(pet.personality_traits)
      ? pet.personality_traits.map((trait) => toTitleCase(String(trait)))
      : [],
  imageUrl: getPetImageUrl(pet),
});

const getPetLocation = (pet) =>
  pet.location ||
  [pet.city, pet.state, pet.country].filter(Boolean).join(", ") ||
  "Location coming soon";

const getPetStatus = (pet) => toTitleCase(pet.status || "available");

const getPetCategory = (pet) => {
  const type = String(pet.type || pet.species || "").toLowerCase();
  if (type.includes("dog")) return "Dogs";
  if (type.includes("cat")) return "Cats";
  if (type.includes("rabbit") || type.includes("bunny")) return "Rabbits";
  if (type.includes("bird") || type.includes("parrot")) return "Birds";
  return "Other";
};

const getPetBreedLabel = (pet) => pet.breed || pet.type || pet.species_label || pet.species || "Pet";

const getPetTraits = (pet) => {
  const traits = (pet.personality || []).slice(0, 3);
  return traits.length ? traits : ["Friendly", "Gentle"];
};

const Home = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [tipIndex, setTipIndex] = useState(0);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const role = userData?.role || user?.role || null;
  const firstName =
    userData?.first_name ||
    userData?.displayName?.split(" ")?.[0] ||
    user?.displayName?.split(" ")?.[0] ||
    user?.email?.split("@")?.[0] ||
    "friend";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasSeenOnboarding =
      window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    setShowOnboarding(!hasSeenOnboarding);
    setOnboardingChecked(true);
  }, []);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await listPets();
        const petsData = Array.isArray(response) ? response : response?.results || [];
        setPets(petsData.map(normalizePet));
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load pets.");
        setPets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPets();
  }, []);

  const quickActions = useMemo(
    () => QUICK_ACTIONS.filter((item) => item.show(role)),
    [role]
  );

  const filteredPets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return pets.filter((pet) => {
      const categoryMatch =
        activeCategory === "All" || getPetCategory(pet) === activeCategory;
      if (!categoryMatch) return false;
      if (!query) return true;
      const searchableText = [
        pet.name, pet.breed, pet.type, pet.species,
        getPetLocation(pet), ...(pet.personality || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchableText.includes(query);
    });
  }, [pets, activeCategory, searchQuery]);

  const featuredPets = filteredPets.slice(0, 6);
  const greetingText = user ? `Hi, ${firstName} 👋` : "Find your next furry friend";
  const feedTitle =
    searchQuery.trim() || activeCategory !== "All" ? "Matching Pets" : "Pets Near You";

  const handleFinishOnboarding = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    }
    setShowOnboarding(false);
    setOnboardingChecked(true);
  };

  const handleResetOnboarding = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
    setShowOnboarding(true);
  };

  const handleAnotherTip = () => {
    setTipIndex((current) => (current + 1) % CARE_TIPS.length);
  };

  if (!onboardingChecked) return null;

  if (showOnboarding) {
    return <Onboarding onFinish={handleFinishOnboarding} onSkip={handleFinishOnboarding} />;
  }

  return (
    <div className="hp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

        :root {
          --orange: #F59A23;
          --orange-dark: #D97706;
          --orange-deeper: #B45309;
          --orange-pale: #FFF7E6;
          --orange-light: #FEF3C7;
          --cream: #FFFBF5;
          --white: #FFFFFF;
          --text-primary: #1C1207;
          --text-secondary: #6B4E2A;
          --text-muted: #9D7A52;
          --border: rgba(245,154,35,0.15);
          --border-strong: rgba(245,154,35,0.28);
          --radius-sm: 12px;
          --radius-md: 18px;
          --radius-lg: 24px;
          --radius-xl: 32px;
          --radius-pill: 999px;
          --safe-bottom: env(safe-area-inset-bottom, 0px);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

        .hp-root {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--cream);
          font-family: 'DM Sans', system-ui, sans-serif;
          color: var(--text-primary);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ── SCROLL AREA ── */
        .hp-scroll {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 0 0 calc(88px + var(--safe-bottom));
          overflow-x: hidden;
        }

        /* ── HERO HEADER ── */
        .hp-hero {
          background: linear-gradient(160deg, #F59A23 0%, #E07B0A 100%);
          padding: 52px 20px 28px;
          position: relative;
          overflow: hidden;
        }

        .hp-hero::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          background: rgba(255,255,255,0.08);
          border-radius: 50%;
        }

        .hp-hero::after {
          content: '';
          position: absolute;
          bottom: -60px; left: -30px;
          width: 160px; height: 160px;
          background: rgba(255,255,255,0.06);
          border-radius: 50%;
        }

        .hp-brand-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.22);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: var(--radius-pill);
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #fff;
          margin-bottom: 14px;
        }

        .hp-greeting {
          font-family: 'Playfair Display', serif;
          font-size: 30px;
          font-weight: 800;
          line-height: 1.08;
          color: #fff;
          margin-bottom: 6px;
          position: relative;
          z-index: 1;
        }

        .hp-subtitle {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.82);
          line-height: 1.5;
          position: relative;
          z-index: 1;
        }

        /* ── SEARCH ── */
        .hp-search-wrap {
          padding: 0 16px;
          margin-top: -20px;
          position: relative;
          z-index: 10;
        }

        .hp-search {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--white);
          border: 1.5px solid var(--border-strong);
          border-radius: var(--radius-pill);
          padding: 0 16px;
          box-shadow: 0 4px 24px rgba(180,83,9,0.12);
        }

        .hp-search-icon {
          font-size: 15px;
          flex-shrink: 0;
          line-height: 1;
        }

        .hp-search input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          padding: 14px 0;
          min-width: 0;
        }

        .hp-search input::placeholder {
          color: var(--text-muted);
          font-weight: 400;
        }

        .hp-search-clear {
          border: none;
          background: none;
          font-size: 18px;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0;
          line-height: 1;
          flex-shrink: 0;
        }

        /* ── CATEGORIES ── */
        .hp-cats-wrap {
          padding: 16px 16px 0;
        }

        .hp-cats {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
        }

        .hp-cats::-webkit-scrollbar { display: none; }

        .hp-cat-btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1.5px solid var(--border-strong);
          background: var(--white);
          border-radius: var(--radius-pill);
          padding: 8px 14px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
        }

        .hp-cat-btn.active {
          background: var(--orange);
          border-color: var(--orange);
          color: #fff;
        }

        /* ── SECTIONS ── */
        .hp-section {
          padding: 22px 16px 0;
        }

        .hp-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .hp-section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--orange-dark);
          margin-bottom: 2px;
        }

        .hp-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--text-primary);
        }

        .hp-view-all {
          border: 1.5px solid var(--border-strong);
          background: transparent;
          border-radius: var(--radius-pill);
          padding: 7px 14px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          color: var(--orange-dark);
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* ── QUICK ACTIONS ── */
        .hp-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .hp-action-btn {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px 10px 12px;
          text-align: center;
          cursor: pointer;
          font-family: inherit;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .hp-action-btn:active {
          transform: scale(0.96);
        }

        .hp-action-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: var(--orange-pale);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          line-height: 1;
        }

        .hp-action-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .hp-action-sub {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-muted);
          line-height: 1.2;
        }

        /* ── PET CARDS ── */
        .hp-pets-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .hp-pet-card {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .hp-pet-img-wrap {
          position: relative;
          width: 100%;
          height: 200px;
          background: var(--orange-light);
          overflow: hidden;
          flex-shrink: 0;
        }

        .hp-pet-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .hp-status-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(255,255,255,0.95);
          color: #166534;
          border-radius: var(--radius-pill);
          padding: 5px 11px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .hp-pet-body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .hp-pet-name {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .hp-pet-breed {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--orange-dark);
          margin-top: 2px;
        }

        .hp-pet-location {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
        }

        .hp-traits {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .hp-trait {
          background: var(--orange-pale);
          color: var(--orange-deeper);
          border-radius: var(--radius-pill);
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 700;
        }

        .hp-pet-cta {
          border: none;
          background: var(--orange);
          color: #fff;
          border-radius: var(--radius-pill);
          padding: 13px 16px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s ease;
        }

        .hp-pet-cta:active {
          background: var(--orange-dark);
        }

        /* ── SKELETON ── */
        .hp-skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }

        .hp-skeleton-card {
          height: 320px;
          border-radius: var(--radius-lg);
          background: linear-gradient(90deg, #feecc3 0%, #fffdf8 48%, #feecc3 100%);
          background-size: 400px 100%;
          animation: shimmer 1.4s linear infinite;
        }

        /* ── ERROR / EMPTY ── */
        .hp-empty {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 28px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
        }

        .hp-empty-icon {
          display: block;
          font-size: 28px;
          margin-bottom: 8px;
        }

        .hp-empty.is-error {
          background: #FFF5F5;
          border-color: rgba(220,38,38,0.2);
          color: #B91C1C;
        }

        /* ── BOTTOM CARDS ── */
        .hp-bottom-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hp-quiz-card {
          background: linear-gradient(135deg, #FFF0C2 0%, #FFE08A 100%);
          border: 1.5px solid rgba(245,154,35,0.25);
          border-radius: var(--radius-lg);
          padding: 20px;
        }

        .hp-tip-card {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
        }

        .hp-card-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--orange-dark);
          margin-bottom: 6px;
        }

        .hp-card-title {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 700;
          line-height: 1.2;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .hp-card-text {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 14px;
        }

        .hp-card-btn-primary {
          border: none;
          background: var(--orange);
          color: #fff;
          border-radius: var(--radius-pill);
          padding: 12px 20px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-block;
          transition: background 0.15s;
        }

        .hp-card-btn-primary:active { background: var(--orange-dark); }

        .hp-card-btn-secondary {
          border: 1.5px solid var(--border-strong);
          background: transparent;
          color: var(--orange-dark);
          border-radius: var(--radius-pill);
          padding: 11px 20px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-block;
        }

        /* ── DEV ROW ── */
        .hp-dev-row {
          padding: 8px 16px 0;
          display: flex;
          justify-content: flex-end;
        }

        .hp-dev-btn {
          border: 1px solid var(--border);
          background: var(--orange-pale);
          color: var(--orange-dark);
          border-radius: var(--radius-pill);
          padding: 6px 12px;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* ── SPACER ── */
        .hp-bottom-spacer {
          height: 24px;
        }
      `}</style>

      <div className="hp-scroll">
        {/* ── HERO ── */}
        <header className="hp-hero">
          <div className="hp-brand-pill">
            <span aria-hidden="true">🐾</span>
            My FurryFriends
          </div>
          <h1 className="hp-greeting">{greetingText}</h1>
          <p className="hp-subtitle">Browse, save, and apply for pets looking for safe homes.</p>
        </header>

        {/* ── SEARCH ── */}
        <div className="hp-search-wrap">
          <label className="hp-search" aria-label="Search pets">
            <span className="hp-search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, breed, or location"
              aria-label="Search pets"
            />
            {searchQuery && (
              <button
                type="button"
                className="hp-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >×</button>
            )}
          </label>
        </div>

        {/* ── CATEGORIES ── */}
        <div className="hp-cats-wrap">
          <div className="hp-cats" aria-label="Pet categories">
            {PET_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                type="button"
                className={`hp-cat-btn${activeCategory === cat.label ? " active" : ""}`}
                onClick={() => setActiveCategory(cat.label)}
                aria-pressed={activeCategory === cat.label}
              >
                <span aria-hidden="true">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── DEV ONLY ── */}
        {import.meta.env.DEV && (
          <div className="hp-dev-row">
            <button type="button" className="hp-dev-btn" onClick={handleResetOnboarding}>
              View onboarding again
            </button>
          </div>
        )}

        {/* ── QUICK ACTIONS ── */}
        <section className="hp-section">
          <div className="hp-section-header">
            <div>
              <p className="hp-section-label">Quick Actions</p>
              <h2 className="hp-section-title">Jump straight in</h2>
            </div>
          </div>
          <div className="hp-actions-grid">
            {quickActions.map((action) => (
              <button
                key={action.key}
                type="button"
                className="hp-action-btn"
                onClick={() => navigate(action.to)}
              >
                <span className="hp-action-icon-wrap" aria-hidden="true">{action.icon}</span>
                <span className="hp-action-title">{action.title}</span>
                <span className="hp-action-sub">{action.subtitle}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── FEATURED PETS ── */}
        <section className="hp-section">
          <div className="hp-section-header">
            <div>
              <p className="hp-section-label">Featured Pets</p>
              <h2 className="hp-section-title">{feedTitle}</h2>
            </div>
            <button type="button" className="hp-view-all" onClick={() => navigate("/pets")}>
              View all
            </button>
          </div>

          {loading ? (
            <div className="hp-skeleton-list" aria-hidden="true">
              {[0, 1, 2].map((i) => <div key={i} className="hp-skeleton-card" />)}
            </div>
          ) : error ? (
            <div className="hp-empty is-error">{error}</div>
          ) : featuredPets.length === 0 ? (
            <div className="hp-empty">
              <span className="hp-empty-icon" aria-hidden="true">🐾</span>
              No pets match your search or category.
            </div>
          ) : (
            <div className="hp-pets-list">
              {featuredPets.map((pet) => (
                <article key={pet.id} className="hp-pet-card">
                  <div className="hp-pet-img-wrap">
                    <img
                      src={pet.imageUrl}
                      alt={pet.name ? `${pet.name} available for adoption` : "Pet available for adoption"}
                      className="hp-pet-img"
                    />
                    <span className="hp-status-badge">{getPetStatus(pet)}</span>
                  </div>
                  <div className="hp-pet-body">
                    <div>
                      <h3 className="hp-pet-name">{pet.name || "Meet this pet"}</h3>
                      <p className="hp-pet-breed">{getPetBreedLabel(pet)}</p>
                    </div>
                    <p className="hp-pet-location">📍 {getPetLocation(pet)}</p>
                    <div className="hp-traits">
                      {getPetTraits(pet).map((trait) => (
                        <span key={`${pet.id}-${trait}`} className="hp-trait">{trait}</span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="hp-pet-cta"
                      onClick={() => navigate(`/pet/${pet.id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── BOTTOM CARDS ── */}
        <section className="hp-section">
          <div className="hp-bottom-grid">
            <article className="hp-quiz-card">
              <p className="hp-card-label">Quiz Match</p>
              <h2 className="hp-card-title">Not sure who fits your lifestyle?</h2>
              <p className="hp-card-text">Take the quiz and get matched faster.</p>
              <button type="button" className="hp-card-btn-primary" onClick={() => navigate("/quiz")}>
                Start Quiz
              </button>
            </article>

            <article className="hp-tip-card">
              <p className="hp-card-label">Pet Care Tip</p>
              <h2 className="hp-card-title">A small reminder for adopters</h2>
              <p className="hp-card-text">{CARE_TIPS[tipIndex]}</p>
              <button type="button" className="hp-card-btn-secondary" onClick={handleAnotherTip}>
                Another tip
              </button>
            </article>
          </div>
        </section>

        <div className="hp-bottom-spacer" />
      </div>
    </div>
  );
};

export default Home;
