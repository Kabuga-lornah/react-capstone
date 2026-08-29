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
    key: "adopt",
    title: "Adopt",
    subtitle: "Browse matches",
    icon: "🐾",
    to: "/adopt",
    show: () => true,
  },
  {
    key: "quiz",
    title: "Quiz",
    subtitle: "Find your fit",
    icon: "✨",
    to: "/quiz",
    show: () => true,
  },
  {
    key: "vets",
    title: "Vets",
    subtitle: "Nearby clinics",
    icon: "🩺",
    to: "/vets",
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
const QUIZ_RESULTS_STORAGE_KEY = "pet-adoption-last-quiz-results";

const readStoredQuizMatches = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(QUIZ_RESULTS_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

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
  const [matchShortlist, setMatchShortlist] = useState([]);
  const [aiPromptIndex, setAiPromptIndex] = useState(0);
  const [aiInput, setAiInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [aiConversation, setAiConversation] = useState([]);
  const recognitionRef = useRef(null);

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

        const storedMatches = readStoredQuizMatches();
        const matchMap = new Map(
          storedMatches.map((match) => [String(match.id), Number(match.matchPercentage) || 90]),
        );
        const matchedIds = new Set(matchMap.keys());

        if (matchedIds.size > 0) {
          const sortedMatches = normalizedPets
            .filter((pet) => matchedIds.has(String(pet.id)))
            .map((pet) => ({
              ...pet,
              matchPercentage: matchMap.get(String(pet.id)) || 90,
            }))
            .sort((left, right) => Number(right.matchPercentage) - Number(left.matchPercentage))
            .slice(0, 3);

          setMatchShortlist(sortedMatches);
        } else {
          setMatchShortlist([]);
        }
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load pets.");
        setPets([]);
        setMatchShortlist([]);
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
  const bestMatch = matchShortlist[0];
  const greetingText = user ? `Hi, ${firstName} 👋` : "Find your next furry friend";
  const feedTitle =
    searchQuery.trim() || activeCategory !== "All" ? "Matching Pets" : "Pets Near You";
  const aiPrompts = [
    "I want a calm, low-maintenance companion.",
    "I need a playful dog for active days.",
    "Something friendly and easy for my apartment.",
  ];
  const defaultAiResponse = user
    ? `I can help match you with a pet that suits your routine, energy, and home. Try the quiz to sharpen the match.`
    : "Tell me the kind of home you have, and I’ll narrow the best matches for you.";

  const getAiResponse = (prompt) => {
    const input = String(prompt || "").toLowerCase();

    if (!input.trim()) {
      return defaultAiResponse;
    }

    if (/(calm|quiet|low[- ]?maintenance|gentle|easy)/.test(input)) {
      return "A quieter companion with lower daily stimulation usually fits best for calm routines. Try gentle, patient pets and keep the home environment predictable.";
    }

    if (/(active|dog|walk|playful|outdoor|high energy)/.test(input)) {
      return "You probably want a high-energy match, so active dogs and playful companions are a strong fit. A daily routine with exercise and enrichment will suit them well.";
    }

    if (/(apartment|small home|compact|city|indoor)/.test(input)) {
      return "Apartment-friendly pets often lean toward calm, adaptable companions. Cats, rabbits, and gentle social pets can do especially well in smaller spaces.";
    }

    if (/(kids|family|children)/.test(input)) {
      return "For family life, a patient, friendly pet with a strong introduction routine usually works best. I would look for gentle temperament and a home that supports gradual adjustment.";
    }

    if (/(first[- ]?time|new adopter|beginner)/.test(input)) {
      return "A beginner-friendly match usually needs a manageable routine, clear expectations, and a pet with a forgiving temperament. The quiz can help narrow those options quickly.";
    }

    return "That gives me a useful direction. I’d focus on your home size, activity level, and how much daily time you can realistically spend with a new pet.";
  };

  useEffect(() => {
    if (aiConversation.length === 0) {
      setAiConversation([{ role: "assistant", text: defaultAiResponse }]);
    }
  }, [defaultAiResponse, aiConversation.length]);

  useEffect(() => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      return undefined;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) {
        return;
      }

      const response = getAiResponse(transcript);
      setAiInput(transcript);
      setAiConversation((current) => [
        ...current,
        { role: "user", text: transcript },
        { role: "assistant", text: response },
      ]);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const handleAiPrompt = (prompt) => {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt) {
      return;
    }

    setAiPromptIndex(aiPrompts.indexOf(prompt));
    setAiInput(cleanPrompt);
    const response = getAiResponse(cleanPrompt);
    setAiConversation((current) => [
      ...current,
      { role: "user", text: cleanPrompt },
      { role: "assistant", text: response },
    ]);
  };

  const handleAiSubmit = () => {
    const cleanPrompt = aiInput.trim();
    if (!cleanPrompt) {
      return;
    }

    const response = getAiResponse(cleanPrompt);
    setAiConversation((current) => [
      ...current,
      { role: "user", text: cleanPrompt },
      { role: "assistant", text: response },
    ]);
    setAiInput("");
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      setAiConversation((current) => [
        ...current,
        { role: "assistant", text: "Voice input is not available in this browser. You can still type your preference below." },
      ]);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    recognitionRef.current.start();
  };

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

        .hp-hero-row {
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          z-index: 1;
        }

        .hp-hero-copy {
          flex: 1;
          min-width: 0;
        }

        .hp-heartbeat-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 132px;
          height: 132px;
          flex-shrink: 0;
        }

        .hp-heartbeat-core {
          position: relative;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.03));
          box-shadow: 0 0 0 10px rgba(255,255,255,0.12), 0 16px 36px rgba(155,78,0,0.2);
          animation: hp-heartbeat 2.8s ease-in-out infinite;
        }

        .hp-heartbeat-ring {
          position: absolute;
          inset: -10px;
          border: 2px solid rgba(255,255,255,0.32);
          border-radius: 50%;
          animation: hp-ring-pulse 2.8s ease-out infinite;
        }

        .hp-heartbeat-ring--mid {
          inset: -24px;
          border-color: rgba(255,255,255,0.22);
          animation-delay: 0.4s;
        }

        .hp-heartbeat-pulse {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          font-size: 28px;
          background: rgba(255,255,255,0.2);
          box-shadow: inset 0 0 20px rgba(255,255,255,0.22);
        }

        @keyframes hp-heartbeat {
          0%, 100% { transform: scale(1); }
          20% { transform: scale(1.08); }
          35% { transform: scale(0.96); }
          50% { transform: scale(1.12); }
          70% { transform: scale(0.98); }
        }

        @keyframes hp-ring-pulse {
          0% { opacity: 0.8; transform: scale(0.94); }
          70% { opacity: 0.2; transform: scale(1.12); }
          100% { opacity: 0; transform: scale(1.18); }
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

        .hp-match-strip {
          padding: 18px 16px 0;
        }

        .hp-match-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,247,230,0.9));
          border: 1.5px solid rgba(245,154,35,0.2);
          border-radius: 28px;
          padding: 16px 14px 12px;
          box-shadow: 0 14px 30px rgba(180,83,9,0.05);
        }

        .hp-match-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }

        .hp-match-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--orange-dark);
        }

        .hp-match-link {
          border: none;
          background: none;
          color: var(--orange-deeper);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .hp-match-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .hp-match-item {
          border: 1px solid rgba(245,154,35,0.18);
          background: rgba(255,255,255,0.9);
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          text-align: left;
        }

        .hp-match-item img {
          width: 100%;
          height: 118px;
          object-fit: cover;
          display: block;
        }

        .hp-match-item-body {
          padding: 10px 8px 12px;
        }

        .hp-match-name {
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--text-primary);
        }

        .hp-match-meta {
          margin-top: 4px;
          font-size: 10px;
          color: var(--text-secondary);
          line-height: 1.3;
        }

        .hp-match-score {
          display: inline-flex;
          margin-top: 8px;
          background: var(--orange-pale);
          color: var(--orange-deeper);
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
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

        /* ── AI MATCH CARD ── */
        .hp-room-preview {
          margin: 18px 16px 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,247,230,0.95));
          border: 1.5px solid rgba(245,154,35,0.22);
          border-radius: 28px;
          padding: 16px;
          box-shadow: 0 12px 28px rgba(180,83,9,0.06);
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 12px;
          align-items: center;
        }

        .hp-room-preview h3 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 4px;
          margin-bottom: 8px;
          line-height: 1.2;
        }

        .hp-room-preview p {
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-secondary);
        }

        .hp-room-window {
          position: relative;
          height: 140px;
          border-radius: 24px;
          background: linear-gradient(180deg, #f3e6d2 0%, #f9f3ea 100%);
          border: 1.5px solid rgba(245,154,35,0.22);
          overflow: hidden;
        }

        .hp-room-wall {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.02));
        }

        .hp-room-sofa {
          position: absolute;
          left: 18px;
          right: 22px;
          bottom: 26px;
          height: 36px;
          background: linear-gradient(180deg, #c8894e, #9d6137);
          border-radius: 18px 18px 12px 12px;
          box-shadow: inset 0 -6px 0 rgba(0,0,0,0.08);
        }

        .hp-room-table {
          position: absolute;
          left: 42px;
          right: 42px;
          bottom: 18px;
          height: 14px;
          border-radius: 999px;
          background: #d7b07d;
        }

        .hp-room-pet {
          position: absolute;
          right: 28px;
          bottom: 32px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 26px;
          background: radial-gradient(circle at 30% 30%, #fff2d2, #ffd58c 52%, #f7af4d 100%);
          box-shadow: 0 12px 24px rgba(222,134,27,0.2);
        }

        .hp-ai-card {
          margin: 18px 16px 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,245,220,0.9));
          border: 1.5px solid rgba(245,154,35,0.26);
          border-radius: 28px;
          padding: 18px 16px;
          box-shadow: 0 14px 28px rgba(180,83,9,0.08);
        }

        .hp-ai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .hp-ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(245,154,35,0.12);
          border: 1px solid rgba(245,154,35,0.2);
          border-radius: 999px;
          padding: 6px 10px;
          color: var(--orange-dark);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hp-ai-wave {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--orange), #ffd36e);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          box-shadow: 0 10px 22px rgba(245,154,35,0.25);
        }

        .hp-ai-chat {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
        }

        .hp-ai-message {
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(245,154,35,0.18);
          border-radius: 18px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.55;
          color: var(--text-secondary);
        }

        .hp-ai-message--user {
          background: rgba(255,244,214,0.9);
          border-color: rgba(245,154,35,0.2);
          color: var(--text-primary);
          align-self: flex-end;
        }

        .hp-ai-prompt-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .hp-ai-prompt {
          border: 1px solid rgba(245,154,35,0.2);
          background: rgba(255,247,230,0.9);
          color: var(--orange-deeper);
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .hp-ai-form {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .hp-ai-input {
          flex: 1;
          border: 1.5px solid rgba(245,154,35,0.2);
          background: rgba(255,255,255,0.85);
          color: var(--text-primary);
          border-radius: 999px;
          padding: 11px 14px;
          font: inherit;
          outline: none;
        }

        .hp-ai-button,
        .hp-ai-voice {
          border: none;
          border-radius: 999px;
          padding: 11px 14px;
          font: inherit;
          cursor: pointer;
          font-weight: 700;
        }

        .hp-ai-button {
          background: var(--orange);
          color: white;
        }

        .hp-ai-voice {
          background: rgba(245,154,35,0.12);
          color: var(--orange-dark);
          min-width: 48px;
        }

        .hp-ai-voice--active {
          background: rgba(239,68,68,0.12);
          color: #b91c1c;
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

          <div className="hp-hero-row">
            <div className="hp-hero-copy">
              <h1 className="hp-greeting">{greetingText}</h1>
              <p className="hp-subtitle">Tell me about your home, routine, and dream pet, and I’ll guide you to the right match.</p>
            </div>

            <div className="hp-heartbeat-wrap" aria-hidden="true">
              <div className="hp-heartbeat-core">
                <div className="hp-heartbeat-ring" />
                <div className="hp-heartbeat-ring hp-heartbeat-ring--mid" />
                <div className="hp-heartbeat-pulse">🐾</div>
              </div>
            </div>
          </div>
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

        <section className="hp-room-preview" aria-label="Home preview for a new pet">
          <div>
            <p className="hp-section-label">Home fit check</p>
            <h3>Scan your space and picture your next pet in it.</h3>
            <p>Use the AI coach to describe your home, then preview a pet in your living room before you commit.</p>
          </div>

          <div className="hp-room-window" aria-hidden="true">
            <div className="hp-room-wall" />
            <div className="hp-room-sofa" />
            <div className="hp-room-table" />
            <div className="hp-room-pet">🐶</div>
          </div>
        </section>

        {/* ── AI MATCH ASSISTANT ── */}
        <section className="hp-ai-card" aria-label="Pet match assistant">
          <div className="hp-ai-header">
            <div className="hp-ai-badge">
              <span aria-hidden="true">✨</span>
              AI Match
            </div>
            <div className="hp-ai-wave" aria-hidden="true">🐾</div>
          </div>

          <div className="hp-ai-chat">
            {aiConversation.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`hp-ai-message ${message.role === "user" ? "hp-ai-message--user" : ""}`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="hp-ai-prompt-row">
            {aiPrompts.map((prompt, index) => (
              <button
                key={prompt}
                type="button"
                className="hp-ai-prompt"
                onClick={() => handleAiPrompt(prompt)}
                style={{
                  background: aiPromptIndex === index ? "rgba(245,154,35,0.14)" : "rgba(255,247,230,0.9)",
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="hp-ai-form">
            <input
              type="text"
              value={aiInput}
              onChange={(event) => setAiInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleAiSubmit();
                }
              }}
              placeholder="Tell me what kind of pet you want..."
              className="hp-ai-input"
              aria-label="Ask the pet match assistant"
            />
            <button
              type="button"
              className={`hp-ai-voice ${isListening ? "hp-ai-voice--active" : ""}`}
              onClick={handleVoiceInput}
              aria-label="Use voice input"
            >
              {isListening ? "●" : "🎙️"}
            </button>
            <button type="button" className="hp-ai-button" onClick={handleAiSubmit}>
              Ask
            </button>
          </div>
        </section>

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

        {matchShortlist.length > 0 ? (
          <section className="hp-match-strip" aria-label="Quiz matches">
            <div className="hp-match-card">
              <div className="hp-match-header">
                <span className="hp-match-label">Best for your home</span>
                <button type="button" className="hp-match-link" onClick={() => navigate("/quiz")}>Retake quiz</button>
              </div>

              {bestMatch ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  background: "linear-gradient(135deg, rgba(245,154,35,0.12), rgba(255,247,230,0.9))",
                  border: "1px solid rgba(245,154,35,0.2)",
                  borderRadius: "18px",
                  padding: "14px 16px",
                  marginBottom: "14px",
                  color: "#1C1207",
                }}>
                  <div>
                    <div style={{ fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#B45309", fontWeight: 700 }}>
                      Top match
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, marginTop: "4px" }}>
                      {bestMatch.name} · {bestMatch.matchPercentage}% match
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/pet/${bestMatch.id}`)}
                    style={{
                      background: "#F59A23",
                      color: "white",
                      border: "none",
                      borderRadius: "999px",
                      padding: "10px 16px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    View pet
                  </button>
                </div>
              ) : null}

              <div className="hp-match-list">
                {matchShortlist.map((pet) => (
                  <button
                    key={pet.id}
                    type="button"
                    className="hp-match-item"
                    onClick={() => navigate(`/pet/${pet.id}`)}
                  >
                    <img src={pet.imageUrl} alt={pet.name} />
                    <div className="hp-match-item-body">
                      <div className="hp-match-name">{pet.name}</div>
                      <div className="hp-match-meta">{pet.breed || "Mixed breed"}</div>
                      <span className="hp-match-score">{pet.matchPercentage}% match</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

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
