import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { PetPouchContext } from "./PetPouchContext";
import {
  addToWishlist,
  getAccessToken,
  listMyApplications,
  listPets,
  listWishlist,
} from "../../services/api";

const toTitleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const normalizePersonalityTraits = (traits) =>
  Array.isArray(traits) ? traits.map((trait) => toTitleCase(String(trait))) : [];

const getPetImageUrl = (pet) => {
  const mainImage = pet.images?.find((image) => image.is_main);
  const fallbackImage = pet.images?.[0];

  return (
    pet.imageUrl ||
    pet.image_url ||
    mainImage?.image_url ||
    fallbackImage?.image_url ||
    mainImage?.image ||
    fallbackImage?.image ||
    "/default-pet.jpg"
  );
};

const normalizePet = (pet) => ({
  ...pet,
  id: String(pet.id),
  type: pet.type || pet.species || "other",
  personality: pet.personality || normalizePersonalityTraits(pet.personality_traits),
  imageUrl: pet.imageUrl || getPetImageUrl(pet),
});

const getPetTypeValue = (pet) =>
  String(pet.type || pet.species || "other").trim().toLowerCase();

const getPetTypeLabel = (pet) => toTitleCase(pet.type || pet.species || "Other");
const PETS_PER_PAGE = 12;

const getPetStatusLabel = (pet, adoptedPets) => {
  if (adoptedPets.includes(pet.id)) {
    return "Pending";
  }

  const rawStatus = String(pet.status || "").trim().toLowerCase();

  if (rawStatus === "pending" || rawStatus === "unavailable" || rawStatus === "adopted") {
    return toTitleCase(rawStatus);
  }

  return "Available";
};

const PetsList = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [adoptedPets, setAdoptedPets] = useState([]);
  const [savedPets, setSavedPets] = useState([]);
  const [notification, setNotification] = useState({ show: false, text: "" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const notificationTimerRef = useRef(null);
  const { user } = useAuth();
  const { updatePetPouchCount } = useContext(PetPouchContext);
  const navigate = useNavigate();

  const showNotification = (text) => {
    setNotification({ show: true, text });
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => {
      setNotification({ show: false, text: "" });
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const response = await listPets();
        const petsData = Array.isArray(response) ? response : response?.results || [];
        setPets(petsData.map(normalizePet));
      } catch (fetchError) {
        setLoadError(fetchError.message || "Failed to load pets. Please try again.");
        setPets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  useEffect(() => {
    const hydrateUserPetState = async () => {
      if (!user || !getAccessToken()) {
        setSavedPets([]);
        setAdoptedPets([]);
        return;
      }

      try {
        const [wishlistResponse, applicationsResponse] = await Promise.all([
          listWishlist(),
          user.role === "adopter" ? listMyApplications() : Promise.resolve([]),
        ]);

        const wishlistItems = Array.isArray(wishlistResponse) ? wishlistResponse : wishlistResponse?.results || [];
        setSavedPets(
          wishlistItems
            .map((item) => item.pet?.id)
            .filter((id) => id != null)
            .map((id) => String(id)),
        );

        const applications = Array.isArray(applicationsResponse) ? applicationsResponse : applicationsResponse?.results || [];
        setAdoptedPets(
          applications
            .filter((application) => ["pending", "approved"].includes(application.status))
            .map((application) => String(application.pet?.id))
            .filter(Boolean),
        );
      } catch (error) {
        console.error("Error hydrating pet state:", error);
      }
    };

    hydrateUserPetState();
  }, [user]);

  const savePetToWishlist = async (pet) => {
    if (!getAccessToken()) {
      navigate("/login/user");
      return;
    }

    if (user?.role === "rehomer" || user?.role === "shelter_admin") {
      setActionMessage({ type: "error", text: "Only adopters can save pets to the Pet Pouch." });
      return;
    }

    try {
      setActionMessage({ type: "", text: "" });
      const response = await addToWishlist(pet.id);
      setSavedPets((prev) => (prev.includes(pet.id) ? prev : [...prev, pet.id]));
      updatePetPouchCount();

      const message = response?.created === false
        ? `${pet.name} is already in your Pet Pouch.`
        : `${pet.name} saved to your Pet Pouch!`;

      setActionMessage({ type: response?.created === false ? "info" : "success", text: message });
      showNotification(message);
    } catch (error) {
      setActionMessage({ type: "error", text: error.message || "Failed to save this pet to your pouch." });
    }
  };

  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) => (
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type]
    ));
  };

  const petTypeOptions = useMemo(() => {
    const entries = new Map();

    pets.forEach((pet) => {
      const value = getPetTypeValue(pet);
      if (!entries.has(value)) {
        entries.set(value, getPetTypeLabel(pet));
      }
    });

    return Array.from(entries.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [pets]);

  const filteredPets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return pets.filter((pet) => {
      const matchesType =
        selectedTypes.length === 0 || selectedTypes.includes(getPetTypeValue(pet));

      if (!matchesType) return false;
      if (!query) return true;

      const searchable = [
        pet.name,
        pet.breed,
        pet.type,
        pet.species,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [pets, searchTerm, selectedTypes]);

  const activeFilterCount = selectedTypes.length;
  const totalPages = Math.max(1, Math.ceil(filteredPets.length / PETS_PER_PAGE));
  const paginatedPets = useMemo(() => {
    const startIndex = (currentPage - 1) * PETS_PER_PAGE;
    return filteredPets.slice(startIndex, startIndex + PETS_PER_PAGE);
  }, [currentPage, filteredPets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTypes]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="pl-root">
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
          --border-strong: rgba(245,154,35,0.3);
          --green: #166534;
          --green-bg: #DCFCE7;
          --radius-md: 16px;
          --radius-lg: 22px;
          --radius-pill: 999px;
          --safe-bottom: env(safe-area-inset-bottom, 0px);
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }

        .pl-root {
          min-height: 100vh;
          background: var(--cream);
          font-family: 'DM Sans', system-ui, sans-serif;
          color: var(--text-primary);
          -webkit-font-smoothing: antialiased;
        }

        .pl-bar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--cream);
          border-bottom: 1px solid var(--border);
          padding: 12px 16px;
        }

        .pl-bar-inner {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .pl-search {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--white);
          border: 1.5px solid var(--border-strong);
          border-radius: var(--radius-pill);
          padding: 0 14px;
          min-width: 0;
        }

        .pl-search-icon,
        .pl-filter-icon,
        .pl-like-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .pl-search-icon svg,
        .pl-filter-icon svg {
          width: 16px;
          height: 16px;
          stroke: currentColor;
        }

        .pl-search input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          padding: 12px 0;
          min-width: 0;
        }

        .pl-search input::placeholder {
          color: var(--text-muted);
          font-weight: 400;
        }

        .pl-search-clear {
          border: none;
          background: none;
          font-size: 18px;
          color: var(--text-muted);
          cursor: pointer;
          line-height: 1;
          flex-shrink: 0;
        }

        .pl-filter-btn {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1.5px solid var(--border-strong);
          background: var(--white);
          border-radius: var(--radius-pill);
          padding: 10px 14px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .pl-filter-btn.has-filters {
          background: var(--orange);
          border-color: var(--orange);
          color: #fff;
        }

        .pl-filter-badge {
          background: #fff;
          color: var(--orange-dark);
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 10px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .pl-filter-drawer {
          background: var(--white);
          border-bottom: 1px solid var(--border);
          overflow: hidden;
          max-height: 0;
          transition: max-height 0.3s ease, padding 0.3s ease;
        }

        .pl-filter-drawer.open {
          max-height: 300px;
          padding: 12px 16px 16px;
        }

        .pl-filter-drawer-inner {
          max-width: 1120px;
          margin: 0 auto;
        }

        .pl-filter-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--orange-dark);
          margin-bottom: 10px;
        }

        .pl-tags-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pl-tag-btn {
          border: 1.5px solid var(--border-strong);
          background: var(--white);
          border-radius: var(--radius-pill);
          padding: 7px 13px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .pl-tag-btn.active {
          background: var(--orange);
          border-color: var(--orange);
          color: #fff;
        }

        .pl-clear-btn {
          margin-top: 10px;
          border: none;
          background: none;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          cursor: pointer;
          text-decoration: underline;
        }

        .pl-content {
          max-width: 1120px;
          margin: 0 auto;
          padding: 16px 16px calc(88px + var(--safe-bottom));
        }

        .pl-msg {
          border-radius: var(--radius-md);
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .pl-msg.error {
          background: #FFF5F5;
          color: #B91C1C;
          border: 1px solid rgba(185,28,28,0.2);
        }

        .pl-msg.info {
          background: var(--orange-pale);
          color: var(--orange-deeper);
          border: 1px solid var(--border-strong);
        }

        .pl-msg.success {
          background: var(--green-bg);
          color: var(--green);
          border: 1px solid rgba(22,101,52,0.2);
        }

        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }

        .pl-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .pl-skeleton-card {
          height: 250px;
          border-radius: var(--radius-lg);
          background: linear-gradient(90deg, #feecc3 0%, #fffdf8 48%, #feecc3 100%);
          background-size: 400px 100%;
          animation: shimmer 1.4s linear infinite;
        }

        .pl-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .pl-pet-card {
          position: relative;
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 12px 28px rgba(28, 18, 7, 0.06);
        }

        .pl-pet-card:active {
          transform: scale(0.99);
        }

        .pl-pet-img-wrap {
          position: relative;
          width: 100%;
          height: 170px;
          background: var(--orange-light);
          overflow: hidden;
          border: none;
          padding: 0;
          cursor: pointer;
          display: block;
        }

        .pl-pet-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.35s ease;
        }

        .pl-pet-card:hover .pl-pet-img {
          transform: scale(1.03);
        }

        .pl-img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 45%, rgba(28,18,7,0.28) 100%);
          pointer-events: none;
        }

        .pl-status-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(255,255,255,0.95);
          color: var(--green);
          border-radius: var(--radius-pill);
          padding: 5px 11px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .pl-like-btn {
          position: absolute;
          top: 10px;
          right: 12px;
          border: none;
          background: rgba(255,255,255,0.92);
          border-radius: 50%;
          width: 36px;
          min-width: 36px;
          height: 36px;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, background 0.2s ease;
          line-height: 1;
          z-index: 2;
        }

        .pl-like-btn:active {
          transform: scale(1.2);
        }

        .pl-like-btn.liked {
          background: #FFF0F0;
        }

        .pl-like-icon svg {
          width: 18px;
          height: 18px;
          stroke: #8B6B47;
          fill: none;
          stroke-width: 1.8;
          transition: stroke 0.2s ease, fill 0.2s ease;
        }

        .pl-like-btn.liked .pl-like-icon svg {
          stroke: #D97706;
          fill: #F59A23;
        }

        .pl-pet-body {
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .pl-pet-name {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .pl-pet-type {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--orange-pale);
          color: var(--orange-deeper);
          border-radius: var(--radius-pill);
          padding: 5px 9px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .pl-empty {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 32px 20px;
          text-align: center;
          color: var(--text-muted);
        }

        .pl-empty-icon {
          font-size: 36px;
          display: block;
          margin-bottom: 10px;
        }

        .pl-empty p {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.5;
        }

        .pl-empty-sub {
          font-size: 12px;
          font-weight: 500;
          margin-top: 4px;
          color: var(--text-muted);
        }

        .pl-pagination {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .pl-page-btn {
          min-width: 40px;
          height: 40px;
          border: 1.5px solid var(--border-strong);
          background: var(--white);
          color: var(--text-secondary);
          border-radius: 14px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 0 12px;
        }

        .pl-page-btn.is-active {
          background: var(--orange);
          border-color: var(--orange);
          color: #fff;
        }

        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .pl-toast {
          position: fixed;
          bottom: calc(80px + var(--safe-bottom));
          left: 50%;
          transform: translateX(-50%);
          background: var(--text-primary);
          color: #fff;
          border-radius: var(--radius-pill);
          padding: 12px 22px;
          font-size: 13px;
          font-weight: 600;
          z-index: 9999;
          animation: toastIn 0.3s ease forwards;
          box-shadow: 0 8px 28px rgba(28,18,7,0.22);
          max-width: calc(100vw - 32px);
          white-space: normal;
          text-align: center;
        }

        @media (min-width: 700px) {
          .pl-content {
            padding-inline: 20px;
          }

          .pl-cards-grid,
          .pl-skeleton-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .pl-pet-img-wrap {
            height: 190px;
          }
        }

        @media (min-width: 1024px) {
          .pl-content {
            padding-inline: 24px;
          }

          .pl-cards-grid,
          .pl-skeleton-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .pl-bar {
            padding: 10px 12px;
          }

          .pl-bar-inner {
            gap: 8px;
          }

          .pl-filter-btn {
            padding: 10px 12px;
          }

          .pl-content {
            padding: 14px 12px calc(88px + var(--safe-bottom));
          }

          .pl-cards-grid,
          .pl-skeleton-grid {
            gap: 12px;
          }

          .pl-pet-img-wrap {
            height: 160px;
          }

          .pl-pet-body {
            padding: 10px;
          }

          .pl-pet-name {
            font-size: 15px;
          }

          .pl-page-btn {
            min-width: 36px;
            height: 36px;
            border-radius: 12px;
            font-size: 12px;
          }
        }
      `}</style>

        <div className="pl-bar">
        <div className="pl-bar-inner">
          <label className="pl-search" aria-label="Search pets">
            <span className="pl-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search by name, breed, or type..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            {searchTerm ? (
              <button
                type="button"
                className="pl-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                x
              </button>
            ) : null}
          </label>

          <button
            type="button"
            className={`pl-filter-btn${activeFilterCount > 0 ? " has-filters" : ""}`}
            onClick={() => setFilterOpen((open) => !open)}
            aria-expanded={filterOpen}
          >
            <span className="pl-filter-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16" />
                <path d="M7 12h10" />
                <path d="M10 17h4" />
              </svg>
            </span>
            Filter
            {activeFilterCount > 0 ? (
              <span className="pl-filter-badge">{activeFilterCount}</span>
            ) : null}
          </button>
        </div>
      </div>

      <div className={`pl-filter-drawer${filterOpen ? " open" : ""}`} aria-hidden={!filterOpen}>
        <div className="pl-filter-drawer-inner">
          <p className="pl-filter-label">Filter by Pet Type</p>
          <div className="pl-tags-wrap">
            {petTypeOptions.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`pl-tag-btn${selectedTypes.includes(type.value) ? " active" : ""}`}
                onClick={() => handleTypeToggle(type.value)}
                aria-pressed={selectedTypes.includes(type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className="pl-clear-btn"
              onClick={() => setSelectedTypes([])}
            >
              Clear all filters
            </button>
          ) : null}
        </div>
      </div>

      <main className="pl-content">
        {actionMessage.text ? (
          <div className={`pl-msg ${actionMessage.type}`}>{actionMessage.text}</div>
        ) : null}

        {loading ? (
          <div className="pl-skeleton-grid" aria-hidden="true">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="pl-skeleton-card" />
            ))}
          </div>
        ) : loadError ? (
          <div className="pl-msg error">{loadError}</div>
        ) : filteredPets.length === 0 ? (
          <div className="pl-empty">
            <p>No pets matched your search or filters.</p>
            <p className="pl-empty-sub">Try another pet type like cat, dog, rabbit, duck, chick, bunny, or snake.</p>
          </div>
        ) : (
          <>
            <div className="pl-cards-grid">
              {paginatedPets.map((pet) => (
                <article key={pet.id} className="pl-pet-card">
                  <button
                    type="button"
                    className="pl-pet-img-wrap"
                    onClick={() => navigate(`/pet/${pet.id}`)}
                    aria-label={`View details for ${pet.name || "this pet"}`}
                  >
                    <img
                      src={pet.imageUrl}
                      alt={pet.name ? `${pet.name} available for adoption` : "Pet available for adoption"}
                      className="pl-pet-img"
                    />
                    <div className="pl-img-overlay" aria-hidden="true" />
                    <span className="pl-status-badge">
                      {getPetStatusLabel(pet, adoptedPets)}
                    </span>
                  </button>

                  {user?.role !== "rehomer" && user?.role !== "shelter_admin" ? (
                    <button
                      type="button"
                      className={`pl-like-btn${savedPets.includes(pet.id) ? " liked" : ""}`}
                      onClick={() => savePetToWishlist(pet)}
                      aria-label={savedPets.includes(pet.id) ? `${pet.name} is already saved to Pet Pouch` : `Save ${pet.name} to Pet Pouch`}
                      aria-pressed={savedPets.includes(pet.id)}
                    >
                      <span className="pl-like-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M12 20.5 4.8 13.9a4.8 4.8 0 0 1 6.7-6.9L12 7.5l.5-.5a4.8 4.8 0 0 1 6.7 6.9Z" />
                        </svg>
                      </span>
                    </button>
                  ) : null}

                  <div className="pl-pet-body">
                    <h3 className="pl-pet-name">{pet.name || "Meet this pet"}</h3>
                    <span className="pl-pet-type">{getPetTypeLabel(pet)}</span>
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="pl-pagination" aria-label="Pets pagination">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`pl-page-btn${pageNumber === currentPage ? " is-active" : ""}`}
                    onClick={() => setCurrentPage(pageNumber)}
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </main>

      {notification.show ? (
        <div className="pl-toast" role="status" aria-live="polite">
          {notification.text}
        </div>
      ) : null}
    </div>
  );
};

export default PetsList;
