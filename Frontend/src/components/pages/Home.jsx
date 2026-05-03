import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPets } from "../../services/api";
import { useAuth } from "./AuthContext";
import Onboarding from "./Onboarding";

const PET_CATEGORIES = [
  { label: "All", emoji: "🐾" },
  { label: "Dogs", emoji: "🐶" },
  { label: "Cats", emoji: "🐱" },
  { label: "Rabbits", emoji: "🐰" },
  { label: "Birds", emoji: "🐦" },
  { label: "Other", emoji: "✨" },
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
  type: pet.type || pet.species || "other",
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

const Home = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();

  const [pets, setPets] = useState([]);
  const [likedPetIds, setLikedPetIds] = useState({});
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
        const normalizedPets = petsData.map(normalizePet);

        setPets(normalizedPets);
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
    [role],
  );

  const filteredPets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return pets.filter((pet) => {
      const categoryMatch =
        activeCategory === "All" || getPetCategory(pet) === activeCategory;

      if (!categoryMatch) return false;
      if (!query) return true;

      const searchable = [
        pet.name,
        pet.breed,
        pet.type,
        pet.species,
        getPetLocation(pet),
        ...(pet.personality || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [pets, activeCategory, searchQuery]);

  const featuredPets = filteredPets.slice(0, 8);
  const currentTip = CARE_TIPS[tipIndex];

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

  const toggleLike = (petId) => {
    setLikedPetIds((current) => ({
      ...current,
      [petId]: !current[petId],
    }));
  };

  const handleAnotherTip = () => {
    setTipIndex((current) => (current + 1) % CARE_TIPS.length);
  };

  const greetingText = user
    ? `Hi, ${firstName} 👋`
    : "Find your next furry friend";

  const feedTitle =
    searchQuery.trim() || activeCategory !== "All" ? "Matching pets" : "Pets near you";

  if (!onboardingChecked) {
    return null;
  }

  if (showOnboarding) {
    return (
      <Onboarding
        onFinish={handleFinishOnboarding}
        onSkip={handleFinishOnboarding}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #fffaf1 0%, #fff7ea 55%, #fff3df 100%)",
        color: "#1a1008",
        fontFamily: "'Nunito', system-ui, sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;0,900&family=Nunito:wght@400;600;700;800;900&display=swap');

        * { box-sizing: border-box; }

        :root {
          --home-amber: #ffa500;
          --home-amber-deep: #e8750a;
          --home-amber-soft: #fff0cf;
          --home-cream: #fffaf1;
          --home-cream-strong: #fffdf8;
          --home-brown: #5a3200;
          --home-brown-soft: #7a572d;
          --home-muted: #947b5b;
          --home-border: rgba(255, 165, 0, 0.14);
          --home-shadow: 0 12px 30px rgba(120, 60, 0, 0.08);
          --home-shadow-soft: 0 6px 18px rgba(255, 165, 0, 0.10);
          --home-radius-xl: 28px;
          --home-radius-lg: 22px;
          --home-radius-md: 16px;
          --home-radius-pill: 999px;
        }

        .home-shell {
          width: min(100%, 1120px);
          margin: 0 auto;
          padding: 18px 16px 110px;
        }

        .home-stack {
          display: grid;
          gap: 18px;
        }

        .home-top-card,
        .home-section-card,
        .home-side-card,
        .home-pet-card {
          border: 1px solid var(--home-border);
          box-shadow: var(--home-shadow);
        }

        .home-top-card {
          background: linear-gradient(145deg, #fffdf7 0%, #fff5df 100%);
          border-radius: var(--home-radius-xl);
          padding: 20px 18px 18px;
          position: relative;
          overflow: hidden;
        }

        .home-top-card::before {
          content: "";
          position: absolute;
          top: -34px;
          right: -24px;
          width: 124px;
          height: 124px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 165, 0, 0.22) 0%, transparent 72%);
          pointer-events: none;
        }

        .home-top-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--home-radius-pill);
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 165, 0, 0.16);
          color: #9c5f00;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .home-title {
          margin: 0;
          font-family: 'Fraunces', serif;
          font-size: clamp(1.85rem, 7vw, 2.5rem);
          font-weight: 900;
          line-height: 1.04;
          letter-spacing: -0.03em;
          color: var(--home-brown);
        }

        .home-subtitle {
          margin: 8px 0 0;
          font-size: 14px;
          line-height: 1.55;
          font-weight: 700;
          color: var(--home-brown-soft);
          max-width: 32rem;
        }

        .home-search-wrap {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          border-radius: var(--home-radius-lg);
          background: #ffffff;
          border: 1.5px solid rgba(255, 165, 0, 0.16);
          box-shadow: var(--home-shadow-soft);
        }

        .home-search-icon {
          flex-shrink: 0;
          font-size: 16px;
          color: #9c5f00;
        }

        .home-search-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          padding: 15px 0;
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #2f1c06;
        }

        .home-search-input::placeholder {
          color: var(--home-muted);
        }

        .home-search-clear {
          border: none;
          background: transparent;
          color: var(--home-muted);
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
        }

        .home-categories {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 2px 2px;
          margin-top: 14px;
          scrollbar-width: none;
        }

        .home-categories::-webkit-scrollbar {
          display: none;
        }

        .home-chip {
          border: 1px solid rgba(255, 165, 0, 0.16);
          background: #ffffff;
          color: #7c5109;
          border-radius: var(--home-radius-pill);
          padding: 10px 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          font-family: 'Nunito', sans-serif;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(255, 165, 0, 0.08);
        }

        .home-chip.active {
          background: linear-gradient(135deg, #ffa500 0%, #e8750a 100%);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 8px 18px rgba(255, 140, 0, 0.25);
        }

        .home-dev-row {
          display: flex;
          justify-content: flex-end;
        }

        .home-dev-btn {
          border: 1px solid rgba(255, 165, 0, 0.16);
          background: #fff7e9;
          color: #9c5f00;
          border-radius: var(--home-radius-pill);
          padding: 8px 12px;
          font-family: 'Nunito', sans-serif;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .home-section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .home-section-kicker {
          margin: 0 0 4px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--home-amber-deep);
        }

        .home-section-title {
          margin: 0;
          font-family: 'Fraunces', serif;
          font-size: 1.45rem;
          font-weight: 900;
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: var(--home-brown);
        }

        .home-link-btn {
          border: 1px solid rgba(255, 165, 0, 0.18);
          background: #fff8ed;
          color: #9c5f00;
          border-radius: var(--home-radius-pill);
          padding: 10px 14px;
          font-family: 'Nunito', sans-serif;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .home-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .home-action-card {
          border: 1px solid rgba(255, 165, 0, 0.16);
          background: linear-gradient(145deg, #fffdf8 0%, #fff3da 100%);
          border-radius: 20px;
          padding: 14px 12px;
          text-align: left;
          box-shadow: var(--home-shadow-soft);
          cursor: pointer;
        }

        .home-action-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.82);
          margin-bottom: 10px;
          font-size: 21px;
        }

        .home-action-title {
          margin: 0;
          font-size: 13px;
          font-weight: 900;
          color: #3c2507;
        }

        .home-action-subtitle {
          margin: 4px 0 0;
          font-size: 11px;
          font-weight: 700;
          color: var(--home-muted);
        }

        .home-feed {
          display: grid;
          gap: 14px;
        }

        .home-skeleton-grid {
          display: grid;
          gap: 14px;
        }

        .home-skeleton-card {
          height: 308px;
          border-radius: var(--home-radius-xl);
          background: linear-gradient(90deg, #fff5de 0%, #fffcf4 45%, #fff5de 100%);
          background-size: 400px 100%;
          animation: shimmer 1.35s linear infinite;
        }

        .home-pet-card {
          background: #ffffff;
          border-radius: var(--home-radius-xl);
          overflow: hidden;
        }

        .home-pet-image-wrap {
          position: relative;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: #fff7e7;
        }

        .home-pet-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .home-status-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          border-radius: var(--home-radius-pill);
          background: rgba(255, 255, 255, 0.94);
          color: #2f7d43;
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .home-save-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.10);
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .home-pet-body {
          padding: 14px;
          display: grid;
          gap: 10px;
        }

        .home-pet-name-row {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 8px;
        }

        .home-pet-name {
          margin: 0;
          font-family: 'Fraunces', serif;
          font-size: 1.35rem;
          font-weight: 900;
          line-height: 1.02;
          letter-spacing: -0.02em;
          color: var(--home-brown);
        }

        .home-saved-pill {
          border-radius: var(--home-radius-pill);
          background: #fff0ef;
          color: #be4b4b;
          padding: 4px 8px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .home-pet-meta {
          display: grid;
          gap: 4px;
        }

        .home-pet-type {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--home-amber-deep);
        }

        .home-pet-location {
          font-size: 12px;
          font-weight: 700;
          color: var(--home-muted);
        }

        .home-traits {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .home-trait {
          border-radius: var(--home-radius-pill);
          background: var(--home-amber-soft);
          color: #8a5600;
          border: 1px solid rgba(255, 165, 0, 0.16);
          padding: 5px 9px;
          font-size: 10px;
          font-weight: 900;
        }

        .home-pet-cta {
          border: none;
          border-radius: var(--home-radius-pill);
          background: linear-gradient(135deg, #ffa500 0%, #e8750a 100%);
          color: #ffffff;
          padding: 12px 14px;
          font-family: 'Nunito', sans-serif;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 18px rgba(255, 140, 0, 0.20);
        }

        .home-message-card {
          background: #ffffff;
          border: 1px solid var(--home-border);
          border-radius: var(--home-radius-lg);
          padding: 22px 18px;
          text-align: center;
          color: var(--home-brown-soft);
          font-size: 14px;
          font-weight: 700;
          box-shadow: var(--home-shadow-soft);
        }

        .home-message-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .home-error-card {
          background: #fff5f5;
          border: 1px solid #fecaca;
          color: #c53030;
        }

        .home-bottom-grid {
          display: grid;
          gap: 14px;
        }

        .home-side-card {
          background: #ffffff;
          border-radius: var(--home-radius-xl);
          padding: 18px 16px;
          position: relative;
          overflow: hidden;
        }

        .home-side-card.quiz {
          background: linear-gradient(145deg, #fff3df 0%, #ffe1ad 100%);
        }

        .home-side-kicker {
          margin: 0 0 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--home-amber-deep);
        }

        .home-side-title {
          margin: 0;
          font-family: 'Fraunces', serif;
          font-size: 1.3rem;
          font-weight: 900;
          line-height: 1.15;
          color: var(--home-brown);
        }

        .home-side-text {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 700;
          color: var(--home-brown-soft);
        }

        .home-side-btn {
          margin-top: 14px;
          border: none;
          border-radius: var(--home-radius-pill);
          background: linear-gradient(135deg, #ffa500 0%, #e8750a 100%);
          color: #ffffff;
          padding: 12px 16px;
          font-family: 'Nunito', sans-serif;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .home-side-btn.secondary {
          background: #fff7ea;
          color: #8b5600;
          border: 1px solid rgba(255, 165, 0, 0.16);
        }

        .home-mobile-nav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 50;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px));
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(18px);
          border-top: 1px solid rgba(255, 165, 0, 0.16);
          box-shadow: 0 -8px 24px rgba(120, 60, 0, 0.08);
        }

        .home-mobile-nav-btn {
          border: none;
          background: transparent;
          border-radius: 16px;
          padding: 6px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--home-muted);
          font-family: 'Nunito', sans-serif;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          min-width: 58px;
        }

        .home-mobile-nav-btn.active {
          color: var(--home-amber-deep);
          background: #fff2d1;
        }

        .home-mobile-nav-icon {
          font-size: 19px;
          line-height: 1;
        }

        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }

        @media (min-width: 640px) {
          .home-shell {
            padding-inline: 22px;
          }

          .home-actions-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .home-feed,
          .home-skeleton-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 900px) {
          .home-shell {
            padding-top: 26px;
          }

          .home-stack {
            gap: 22px;
          }

          .home-top-card {
            padding: 24px;
          }

          .home-actions-grid {
            grid-template-columns: repeat(6, minmax(0, 1fr));
          }

          .home-feed,
          .home-skeleton-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .home-bottom-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (min-width: 1024px) {
          .home-feed,
          .home-skeleton-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (min-width: 768px) {
          .home-mobile-nav {
            display: none;
          }

          .home-shell {
            padding-bottom: 40px;
          }
        }
      `}</style>

      <div className="home-shell">
        <div className="home-stack">
          <section className="home-top-card">
            <div className="home-top-badge">
              <span>🐾</span>
              My FurryFriends
            </div>
            <h1 className="home-title">{greetingText}</h1>
            <p className="home-subtitle">
              Browse, save, and apply for pets looking for safe homes.
            </p>

            <label className="home-search-wrap" aria-label="Search pets">
              <span className="home-search-icon">🔍</span>
              <input
                type="search"
                className="home-search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search pets by name, breed, or location"
                aria-label="Search pets by name, breed, or location"
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="home-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear pet search"
                >
                  ✕
                </button>
              ) : null}
            </label>

            <div className="home-categories">
              {PET_CATEGORIES.map((category) => (
                <button
                  key={category.label}
                  type="button"
                  className={`home-chip ${activeCategory === category.label ? "active" : ""}`}
                  onClick={() => setActiveCategory(category.label)}
                >
                  <span>{category.emoji}</span>
                  {category.label}
                </button>
              ))}
            </div>
          </section>

          {import.meta.env.DEV ? (
            <div className="home-dev-row">
              <button
                type="button"
                className="home-dev-btn"
                onClick={handleResetOnboarding}
              >
                View onboarding again
              </button>
            </div>
          ) : null}

          <section>
            <div className="home-section-head">
              <div>
                <p className="home-section-kicker">Quick Actions</p>
                <h2 className="home-section-title">Jump straight in</h2>
              </div>
            </div>

            <div className="home-actions-grid">
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className="home-action-card"
                  onClick={() => navigate(action.to)}
                >
                  <span className="home-action-icon">{action.icon}</span>
                  <p className="home-action-title">{action.title}</p>
                  <p className="home-action-subtitle">{action.subtitle}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="home-section-head">
              <div>
                <p className="home-section-kicker">Featured Pets</p>
                <h2 className="home-section-title">{feedTitle}</h2>
              </div>
              <button
                type="button"
                className="home-link-btn"
                onClick={() => navigate("/pets")}
              >
                View all
              </button>
            </div>

            {loading ? (
              <div className="home-skeleton-grid" aria-hidden="true">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="home-skeleton-card" />
                ))}
              </div>
            ) : error ? (
              <div className="home-message-card home-error-card">{error}</div>
            ) : featuredPets.length === 0 ? (
              <div className="home-message-card">
                <div className="home-message-icon">🐾</div>
                No pets match your current search or category.
              </div>
            ) : (
              <div className="home-feed">
                {featuredPets.map((pet) => {
                  const petCategory = getPetCategory(pet);
                  const likedState = Boolean(likedPetIds[pet.id]);
                  const traits = pet.personality.slice(0, 3).length
                    ? pet.personality.slice(0, 3)
                    : ["Friendly", "Gentle"];

                  return (
                    <article key={pet.id} className="home-pet-card">
                      <div className="home-pet-image-wrap">
                        <img
                          src={pet.imageUrl}
                          alt={pet.name ? `${pet.name} the pet` : "Pet available for adoption"}
                          className="home-pet-image"
                        />
                        <div className="home-status-badge">{getPetStatus(pet)}</div>
                        <button
                          type="button"
                          className="home-save-btn"
                          onClick={() => toggleLike(pet.id)}
                          aria-label={likedState ? "Remove pet from saved" : "Save pet"}
                        >
                          {likedState ? "❤️" : "🤍"}
                        </button>
                      </div>

                      <div className="home-pet-body">
                        <div className="home-pet-name-row">
                          <h3 className="home-pet-name">{pet.name}</h3>
                          {likedState ? <span className="home-saved-pill">Saved</span> : null}
                        </div>

                        <div className="home-pet-meta">
                          <div className="home-pet-type">{pet.breed || petCategory}</div>
                          <div className="home-pet-location">📍 {getPetLocation(pet)}</div>
                        </div>

                        <div className="home-traits">
                          {traits.map((trait) => (
                            <span key={`${pet.id}-${trait}`} className="home-trait">
                              {trait}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="home-pet-cta"
                          onClick={() => navigate(`/pet/${pet.id}`)}
                        >
                          View Details
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="home-bottom-grid">
            <div className="home-side-card">
              <p className="home-side-kicker">Pet Care Tip</p>
              <h2 className="home-side-title">A small reminder for adopters</h2>
              <p className="home-side-text">{currentTip}</p>
              <button
                type="button"
                className="home-side-btn secondary"
                onClick={handleAnotherTip}
              >
                Another tip
              </button>
            </div>

            <div className="home-side-card quiz">
              <p className="home-side-kicker">Quiz Match</p>
              <h2 className="home-side-title">Not sure who fits your lifestyle?</h2>
              <p className="home-side-text">
                Take the quiz and get matched faster.
              </p>
              <button
                type="button"
                className="home-side-btn"
                onClick={() => navigate("/quiz")}
              >
                Start Quiz
              </button>
            </div>
          </section>
        </div>
      </div>

      <nav className="home-mobile-nav" aria-label="Main navigation">
        {[
          { icon: "🏠", label: "Home", to: "/", active: true },
          { icon: "🐾", label: "Browse", to: "/pets", active: false },
          { icon: "✨", label: "Quiz", to: "/quiz", active: false },
          { icon: "🧡", label: "Saved", to: "/pet-pouch", active: false },
          { icon: "👤", label: user ? "Profile" : "Sign in", to: user ? "/profile" : "/login/user", active: false },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className={`home-mobile-nav-btn ${item.active ? "active" : ""}`}
            onClick={() => navigate(item.to)}
            aria-label={item.label}
          >
            <span className="home-mobile-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Home;
