import React, { useContext, useEffect, useRef, useState } from "react";
import Calendar from "react-calendar";
import { useNavigate, useParams } from "react-router-dom";
import {
  addToWishlist,
  createAdoptionApplication,
  getAccessToken,
  getPetDetail,
  listMyApplications,
  listWishlist,
  proposeVisitPlan,
  startConversation,
  updatePet,
  withdrawApplication,
} from "../../services/api";
import { useAuth } from "./AuthContext";
import { PetPouchContext } from "./PetPouchContext";
import RehomerWorkspaceNav from "./RehomerWorkspaceNav";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const toTitleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

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

const getPetImageUrls = (pet) => {
  const imageUrls = Array.isArray(pet.images)
    ? pet.images
        .map((image) => image.image_url || image.image)
        .filter(Boolean)
    : [];

  if (pet.imageUrl && !imageUrls.includes(pet.imageUrl)) {
    imageUrls.unshift(pet.imageUrl);
  }

  if (pet.image_url && !imageUrls.includes(pet.image_url)) {
    imageUrls.unshift(pet.image_url);
  }

  return imageUrls.length > 0 ? imageUrls : ["/default-pet.jpg"];
};

const getListedBy = (pet) => {
  if (pet.shelter?.name) {
    return pet.shelter.name;
  }

  if (pet.owner?.first_name || pet.owner?.last_name) {
    return `${pet.owner.first_name || ""} ${pet.owner.last_name || ""}`.trim();
  }

  return pet.owner?.username || pet.rehomerName || "Unknown";
};

const resolvePetType = (pet) => {
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
};

const normalizePet = (pet) => ({
  ...pet,
  type: resolvePetType(pet),
  personality: Array.isArray(pet.personality)
    ? pet.personality
    : Array.isArray(pet.personality_traits)
      ? pet.personality_traits.map((trait) => toTitleCase(String(trait)))
      : [],
  imageUrl: getPetImageUrl(pet),
  rehomerName: getListedBy(pet),
  adopted:
    pet.adopted !== undefined
      ? pet.adopted
      : pet.status
        ? pet.status !== "available"
        : false,
  requirements: pet.requirements || "",
  imageUrls: getPetImageUrls(pet),
});

const formatCompatibilityValue = (value) => {
  if (!value || value === "unknown") {
    return "Unknown";
  }

  if (value === "yes") {
    return "Yes";
  }

  if (value === "no") {
    return "No";
  }

  return toTitleCase(String(value).replaceAll("_", " "));
};

const meetingPreferenceOptions = [
  { value: "rehomer_home", label: "Visit the rehomer or pet location" },
  { value: "adopter_home", label: "Ask the rehomer to visit my place" },
  { value: "neutral_place", label: "Meet at a neutral place" },
];

const getPresenceLabel = (owner) => {
  if (owner?.is_online) {
    return "Online now";
  }

  if (owner?.last_seen) {
    return `Last active ${new Date(owner.last_seen).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  if (owner?.activity_status === "recently_active") {
    return "Recently active";
  }

  return "";
};

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const toIsoDate = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return "";
  }

  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value) => {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) {
    return "Choose a date";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ThemedSelect = ({ value, onChange, options, ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const shellRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!shellRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className={`pd-select-shell${isOpen ? " is-open" : ""}`} ref={shellRef}>
      <button
        type="button"
        className="pd-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span>{selectedOption?.label}</span>
        <span className="pd-select-caret" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {isOpen ? (
        <div className="pd-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`pd-select-option${option.value === value ? " is-selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ThemedDatePicker = ({ value, onChange, ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const shellRef = useRef(null);
  const selectedDate = parseDateValue(value);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!shellRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className={`pd-date-shell${isOpen ? " is-open" : ""}`} ref={shellRef}>
      <button
        type="button"
        className="pd-date-trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span>{formatDateLabel(value)}</span>
        <span className="pd-date-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <rect x="3.5" y="4.5" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 2.8v3.4M13.5 2.8v3.4M3.5 8h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {isOpen ? (
        <div className="pd-date-popover" role="dialog" aria-label={ariaLabel}>
          <Calendar
            value={selectedDate}
            minDate={new Date()}
            next2Label={null}
            prev2Label={null}
            onChange={(nextValue) => {
              const pickedDate = Array.isArray(nextValue) ? nextValue[0] : nextValue;
              onChange(toIsoDate(pickedDate));
              setIsOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

  .pd-shell {
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    background:
      radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255, 212, 138, 0.32), transparent 55%),
      radial-gradient(ellipse 50% 40% at 0% 100%, rgba(245, 158, 11, 0.08), transparent 50%),
      linear-gradient(160deg, #fffaf4 0%, #fffcf7 50%, #fffdf9 100%);
  }

  .pd-loading,
  .pd-state {
    max-width: 640px;
    margin: 0 auto;
    padding: 48px 24px calc(110px + env(safe-area-inset-bottom, 0px));
    color: #5f4b34;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-state-card {
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(95, 75, 52, 0.18);
    border-radius: 0;
    box-shadow: none;
    padding: 20px 0;
    color: #5f4b34;
    font-size: 15px;
  }

  .pd-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 20px 0;
  }

  .pd-back-button {
    border: none;
    background: rgba(255, 246, 223, 0.6);
    color: #d97706;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 24px;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid rgba(245, 158, 11, 0.2);
    transition: background 0.15s ease, transform 0.15s ease;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.01em;
  }

  .pd-back-button:hover {
    background: rgba(255, 240, 200, 0.9);
    transform: translateX(-2px);
  }

  .pd-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
    gap: 32px;
    align-items: start;
  }

  .pd-gallery-card {
    background: transparent;
    border: none;
    border-radius: 0;
    box-shadow: none;
    padding: 0 0 18px;
    border-bottom: 1px solid rgba(95, 75, 52, 0.18);
  }

  .pd-card,
  .pd-summary-top {
    background: transparent;
    border: none;
    border-radius: 0;
    box-shadow: none;
    padding: 0 0 18px;
    border-bottom: 1px solid rgba(95, 75, 52, 0.18);
  }

  .pd-summary-top {
    padding: 0 0 18px;
  }

  .pd-image-frame {
    position: relative;
    overflow: hidden;
    border-radius: 28px;
    min-height: 480px;
    background: #f6e6c9;
    box-shadow: 0 20px 60px rgba(95, 75, 52, 0.15), 0 4px 20px rgba(95, 75, 52, 0.1);
  }

  .pd-image {
    width: 100%;
    height: 100%;
    min-height: 480px;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }

  .pd-image-frame:hover .pd-image {
    transform: scale(1.02);
  }

  .pd-image-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(28, 18, 7, 0.0) 0%,
      rgba(28, 18, 7, 0.0) 50%,
      rgba(28, 18, 7, 0.28) 100%
    );
    pointer-events: none;
  }

  .pd-status-badge {
    position: absolute;
    top: 18px;
    left: 18px;
    background: rgba(255, 255, 255, 0.97);
    color: #166534;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    font-family: 'DM Sans', sans-serif;
  }

  .pd-status-badge.is-adopted {
    color: #9a3412;
  }

  .pd-image-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    color: #d97706;
    font-size: 22px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    line-height: 1;
  }

  .pd-image-nav:hover {
    background: #fff;
    box-shadow: 0 6px 20px rgba(0,0,0,0.16);
    transform: translateY(-50%) scale(1.08);
  }

  .pd-image-nav.left { left: 16px; }
  .pd-image-nav.right { right: 16px; }

  .pd-image-dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 16px 4px 2px;
  }

  .pd-image-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    border: none;
    background: rgba(245, 158, 11, 0.22);
    cursor: pointer;
    transition: background 0.2s ease, width 0.2s ease;
  }

  .pd-image-dot.is-active {
    background: #f59e0b;
    width: 22px;
  }

  .pd-summary {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .pd-summary-top {
    display: grid;
    gap: 18px;
  }

  .pd-type {
    margin: 0 0 6px;
    color: #d97706;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-name {
    margin: 0;
    font-size: clamp(2.2rem, 4vw, 3.4rem);
    line-height: 0.96;
    color: #24170b;
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .pd-listed-by,
  .pd-presence {
    margin: 10px 0 0;
    color: #6b4e2a;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-presence {
    color: #d97706;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .pd-presence::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #d97706;
    display: inline-block;
    box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2);
    animation: pd-pulse 2s infinite;
  }

  @keyframes pd-pulse {
    0%, 100% { box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2); }
    50% { box-shadow: 0 0 0 5px rgba(217, 119, 6, 0.08); }
  }

  .pd-mini-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .pd-mini-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 7px 14px;
    background: rgba(255, 246, 223, 0.9);
    color: #a16207;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid rgba(245, 158, 11, 0.2);
    font-family: 'DM Sans', sans-serif;
  }

  .pd-facts-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .pd-fact-card {
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(95, 75, 52, 0.16);
    border-radius: 0;
    padding: 0 0 12px;
    box-shadow: none;
  }

  .pd-health-pill {
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(95, 75, 52, 0.16);
    border-radius: 0;
    padding: 0 0 12px;
  }

  .pd-fact-label,
  .pd-health-label {
    display: block;
    color: #9a7444;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
    text-transform: uppercase;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-fact-value,
  .pd-health-pill strong {
    color: #24170b;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-health-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .pd-content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
    gap: 28px;
    margin-top: 28px;
    align-items: start;
  }

  .pd-main-column,
  .pd-side-column {
    display: grid;
    gap: 16px;
  }

  .pd-main-column > :last-child,
  .pd-side-column > :last-child,
  .pd-summary > :last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .pd-card {
    transition: none;
  }

  .pd-card--warm {
    background: transparent;
  }

  .pd-card--owner {
    background: transparent;
    border-color: transparent;
  }

  .pd-card-head {
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(95, 75, 52, 0.1);
  }

  .pd-card-head--split {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .pd-card-head h2 {
    margin: 5px 0 0;
    font-size: 20px;
    color: #24170b;
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.01em;
  }

  .pd-card-kicker {
    color: #d97706;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-body-copy {
    margin: 0;
    color: #5f4b34;
    line-height: 1.8;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-helper-copy {
    margin: 10px 0 0;
    color: #7b5b31;
    line-height: 1.65;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-inline-link,
  .pd-text-link {
    border: none;
    background: transparent;
    padding: 0;
    color: #d97706;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-close-link {
    border: none;
    background: transparent;
    padding: 0;
    color: #b45309;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-traits {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .pd-trait-chip {
    border-radius: 999px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #f59e0b 0%, #ffb739 100%);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.01em;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .pd-trait-chip:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
  }

  .pd-care-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .pd-care-item {
    border-radius: 0;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(95, 75, 52, 0.14);
    padding: 0 0 12px;
    display: grid;
    gap: 5px;
  }

  .pd-care-item span {
    color: #9a7444;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-care-item strong {
    color: #24170b;
    font-size: 14px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-form-grid {
    display: grid;
    gap: 14px;
    margin-top: 18px;
  }

  .pd-form-panel {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid rgba(95, 75, 52, 0.12);
  }

  .pd-field {
    display: grid;
    gap: 7px;
    color: #5f4b34;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-field > span {
    color: #9a7444;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-input,
  .pd-textarea {
    width: 100%;
    border: 1.5px solid rgba(232, 196, 140, 0.8);
    border-radius: 16px;
    padding: 13px 16px;
    font-size: 15px;
    background: rgba(255, 254, 252, 0.9);
    color: #24170b;
    outline: none;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .pd-input:focus,
  .pd-textarea:focus,
  .pd-select-trigger:focus,
  .pd-date-trigger:focus {
    border-color: #f59e0b;
    box-shadow: 0 0 0 3.5px rgba(245, 158, 11, 0.14);
  }

  .pd-input:hover,
  .pd-textarea:hover {
    border-color: rgba(217, 119, 6, 0.5);
  }

  .pd-textarea {
    resize: vertical;
    min-height: 120px;
    line-height: 1.65;
  }

  .pd-date-shell {
    position: relative;
  }

  .pd-date-trigger {
    width: 100%;
    border: 1.5px solid rgba(232, 196, 140, 0.8);
    border-radius: 16px;
    padding: 13px 16px;
    font-size: 15px;
    background: rgba(255, 254, 252, 0.9);
    color: #24170b;
    outline: none;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .pd-date-trigger:hover {
    border-color: rgba(217, 119, 6, 0.5);
  }

  .pd-date-icon {
    color: #d97706;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .pd-date-icon svg {
    width: 18px;
    height: 18px;
  }

  .pd-date-popover {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    z-index: 32;
    width: min(100%, 320px);
    padding: 16px;
    border: 1.5px solid rgba(232, 196, 140, 0.7);
    border-radius: 24px;
    background: #fffaf3;
    box-shadow: 0 24px 48px rgba(59, 34, 3, 0.15), 0 4px 12px rgba(59, 34, 3, 0.07);
  }

  .pd-date-popover .react-calendar {
    width: 100%;
    border: none;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
    color: #2f1c08;
  }

  .pd-date-popover .react-calendar,
  .pd-date-popover .react-calendar *,
  .pd-date-popover .react-calendar *::before,
  .pd-date-popover .react-calendar *::after {
    box-sizing: border-box;
  }

  .pd-date-popover .react-calendar__viewContainer {
    width: 100%;
  }

  .pd-date-popover .react-calendar__month-view__weekdays,
  .pd-date-popover .react-calendar__month-view__days {
    display: grid !important;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
  }

  .pd-date-popover .react-calendar__navigation {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    gap: 6px;
  }

  .pd-date-popover .react-calendar__navigation button {
    min-width: 36px;
    height: 36px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: #c56b07;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .pd-date-popover .react-calendar__navigation button:enabled:hover,
  .pd-date-popover .react-calendar__navigation button:enabled:focus {
    background: #fff0d2;
  }

  .pd-date-popover .react-calendar__month-view__weekdays {
    text-transform: uppercase;
    font-size: 10px;
    color: #9a7444;
    margin-bottom: 6px;
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  .pd-date-popover .react-calendar__month-view__weekdays__weekday {
    padding: 8px 0;
    text-align: center;
    min-width: 0;
  }

  .pd-date-popover .react-calendar__month-view__weekdays__weekday abbr {
    text-decoration: none;
  }

  .pd-date-popover .react-calendar__tile {
    width: 100%;
    padding: 0;
    border: none;
    background: transparent;
    color: #2f1c08;
    border-radius: 10px;
    height: 36px;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .pd-date-popover .react-calendar__tile:enabled:hover,
  .pd-date-popover .react-calendar__tile:enabled:focus {
    background: #fff0d2;
    color: #a85f00;
  }

  .pd-date-popover .react-calendar__tile--now {
    background: #fff6df;
    color: #b56a00;
    font-weight: 700;
  }

  .pd-date-popover .react-calendar__tile--active,
  .pd-date-popover .react-calendar__tile--active:enabled:hover,
  .pd-date-popover .react-calendar__tile--active:enabled:focus {
    background: linear-gradient(135deg, #f59e0b 0%, #ffb739 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  }

  .pd-date-popover .react-calendar__month-view__days__day--neighboringMonth {
    color: #c9ab88;
    opacity: 0.6;
  }

  .pd-select-shell {
    position: relative;
  }

  .pd-select-trigger {
    width: 100%;
    border: 1.5px solid rgba(232, 196, 140, 0.8);
    border-radius: 16px;
    padding: 13px 16px;
    font-size: 15px;
    background: rgba(255, 254, 252, 0.9);
    color: #24170b;
    outline: none;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .pd-select-trigger:hover {
    border-color: rgba(217, 119, 6, 0.5);
  }

  .pd-select-caret {
    color: #d97706;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
  }

  .pd-select-shell.is-open .pd-select-caret {
    transform: rotate(180deg);
  }

  .pd-select-caret svg {
    width: 18px;
    height: 18px;
  }

  .pd-select-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 30;
    border: 1.5px solid rgba(232, 196, 140, 0.7);
    border-radius: 20px;
    background: #fffaf3;
    box-shadow: 0 20px 40px rgba(59, 34, 3, 0.14), 0 4px 12px rgba(59, 34, 3, 0.06);
    overflow: hidden;
  }

  .pd-select-option {
    width: 100%;
    border: none;
    background: transparent;
    color: #3b2408;
    text-align: left;
    padding: 14px 16px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 1px solid rgba(232, 196, 140, 0.4);
    transition: background 0.12s ease, color 0.12s ease;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-select-option:last-child {
    border-bottom: none;
  }

  .pd-select-option:hover,
  .pd-select-option.is-selected {
    background: linear-gradient(135deg, #fff0d2 0%, #ffe4ae 100%);
    color: #a85f00;
    font-weight: 600;
  }

  .pd-owner-actions,
  .pd-side-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
  }

  .pd-primary-button,
  .pd-secondary-button {
    border: none;
    border-radius: 16px;
    padding: 13px 22px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: transform 0.17s ease, box-shadow 0.17s ease, opacity 0.17s ease;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.01em;
  }

  .pd-primary-button {
    background: linear-gradient(135deg, #f59e0b 0%, #ffb739 100%);
    color: #fff;
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.28), 0 2px 6px rgba(245, 158, 11, 0.16);
  }

  .pd-primary-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(245, 158, 11, 0.36), 0 4px 10px rgba(245, 158, 11, 0.2);
  }

  .pd-primary-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .pd-secondary-button {
    background: rgba(255, 252, 244, 0.9);
    color: #c56b07;
    border: 1.5px solid rgba(245, 158, 11, 0.3);
  }

  .pd-secondary-button:hover:not(:disabled) {
    background: rgba(255, 246, 220, 0.95);
    border-color: rgba(245, 158, 11, 0.5);
    transform: translateY(-1px);
  }

  .pd-primary-button:disabled,
  .pd-secondary-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .pd-hidden-input {
    display: none;
  }

  .pd-success {
    margin: 14px 0 0;
    color: #166534;
    font-weight: 600;
    line-height: 1.6;
    font-size: 14px;
    padding: 10px 14px;
    background: rgba(220, 252, 231, 0.5);
    border-radius: 12px;
    border: 1px solid rgba(134, 239, 172, 0.4);
    font-family: 'DM Sans', sans-serif;
  }

  .pd-error {
    margin: 0 0 14px;
    color: #c53030;
    font-weight: 600;
    line-height: 1.6;
    font-size: 14px;
    padding: 10px 14px;
    background: rgba(254, 226, 226, 0.5);
    border-radius: 12px;
    border: 1px solid rgba(252, 165, 165, 0.4);
    font-family: 'DM Sans', sans-serif;
  }

  .pd-login-card {
    display: grid;
    gap: 14px;
    background: transparent;
    border-radius: 0;
    padding: 14px 0 0;
    border: none;
    border-top: 1px solid rgba(95, 75, 52, 0.14);
    margin-top: 4px;
  }

  .pd-login-card p {
    margin: 0;
    color: #5f4b34;
    line-height: 1.7;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-checklist {
    display: grid;
    gap: 0;
    margin-top: 16px;
    border-top: 1px solid rgba(95, 75, 52, 0.1);
  }

  .pd-checklist-item {
    border-radius: 0;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(95, 75, 52, 0.1);
    padding: 14px 0;
    color: #5f4b34;
    line-height: 1.65;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-summary-list {
    display: grid;
    gap: 0;
    margin-top: 10px;
    border-radius: 0;
    overflow: visible;
    border: none;
    border-top: 1px solid rgba(95, 75, 52, 0.14);
  }

  .pd-summary-row {
    display: grid;
    gap: 4px;
    padding: 13px 0;
    background: transparent;
    border-bottom: 1px solid rgba(95, 75, 52, 0.14);
  }

  .pd-summary-row:last-child {
    border-bottom: none;
  }

  .pd-summary-label {
    color: #9a7444;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-summary-value {
    color: #24170b;
    font-size: 15px;
    line-height: 1.5;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
  }

  .pd-summary-value.is-muted {
    color: #5f4b34;
    font-weight: 500;
  }

  .pd-floating-chat {
    position: fixed;
    right: 20px;
    bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    z-index: 150;
    border: none;
    border-radius: 999px;
    background: linear-gradient(135deg, #f59e0b 0%, #ffb739 100%);
    color: #fff;
    padding: 14px 22px;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 10px 32px rgba(245, 158, 11, 0.38), 0 4px 12px rgba(245, 158, 11, 0.2);
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.01em;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .pd-floating-chat:hover {
    transform: translateY(-3px) scale(1.03);
    box-shadow: 0 14px 38px rgba(245, 158, 11, 0.44), 0 6px 16px rgba(245, 158, 11, 0.24);
  }

  .pd-divider-card {
    padding-top: 0;
  }

  @media (max-width: 1024px) {
    .pd-hero,
    .pd-content-grid {
      grid-template-columns: 1fr;
    }

    .pd-content-grid {
      gap: 20px;
    }
  }

  @media (max-width: 640px) {
    .pd-page {
      padding: 16px 14px 0;
    }

    .pd-image-frame,
    .pd-image {
      min-height: 340px;
    }

    .pd-image-frame {
      border-radius: 22px;
    }

    .pd-name {
      font-size: 2.2rem;
    }

    .pd-facts-grid,
    .pd-care-grid,
    .pd-health-strip {
      grid-template-columns: 1fr 1fr;
    }

    .pd-side-actions,
    .pd-owner-actions {
      flex-direction: column;
    }

    .pd-primary-button,
    .pd-secondary-button {
      width: 100%;
    }

    .pd-floating-chat {
      right: 14px;
      bottom: calc(90px + env(safe-area-inset-bottom, 0px));
      padding: 13px 18px;
      font-size: 13px;
    }

    .pd-hero {
      gap: 20px;
    }
  }
`;

const PetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isInterested, setIsInterested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeApplication, setActiveApplication] = useState(null);
  const [isInterestFormOpen, setIsInterestFormOpen] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    location: "",
    description: "",
  });
  const [visitPlanForm, setVisitPlanForm] = useState({
    preferredVisitDate: "",
    meetingPreference: "rehomer_home",
    meetingLocationNotes: "",
  });
  const [isUpdatingOwnerNotes, setIsUpdatingOwnerNotes] = useState(false);
  const [isUploadingExtraImage, setIsUploadingExtraImage] = useState(false);
  const { updatePetPouchCount } = useContext(PetPouchContext);

  const currentUserId = user?.id ?? userData?.id ?? null;
  const isOwner =
    pet && currentUserId !== null
      ? String(pet.owner?.id ?? "") === String(currentUserId)
      : false;
  const isRehomerView =
    userData?.role === "rehomer" || userData?.role === "shelter_admin";
  const canShowAdopterActions = Boolean(!pet?.adopted && !isOwner && !isRehomerView);
  const canManageListing = isOwner;
  const rehomerPresence = getPresenceLabel(pet?.owner);
  const isLoggedIn = Boolean(getAccessToken());
  const hasVisitPlan = ["proposed", "agreed"].includes(activeApplication?.visit_status || "");

  useEffect(() => {
    if (!pet) {
      return;
    }

    setOwnerForm({
      location: pet.location || "",
      description: pet.description || "",
    });
    setActiveImageIndex(0);

  }, [pet]);

  useEffect(() => {
    const fetchPet = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const response = await getPetDetail(id);
        setPet(normalizePet(response));
      } catch (err) {
        setLoadError(err.message || "Failed to fetch pet details");
        setPet(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPet();
  }, [id]);

  useEffect(() => {
    const fetchWishlistStatus = async () => {
      if (!getAccessToken()) {
        setIsSaved(false);
        return;
      }

      try {
        const response = await listWishlist();
        const wishlistItems = Array.isArray(response) ? response : response?.results || [];
        setIsSaved(wishlistItems.some((item) => String(item.pet?.id) === String(id)));
      } catch (wishlistError) {
        console.error("Error fetching wishlist status:", wishlistError);
      }
    };

    fetchWishlistStatus();
  }, [id]);

  useEffect(() => {
    const fetchApplicationStatus = async () => {
      if (!getAccessToken()) {
        setIsInterested(false);
        setActiveApplication(null);
        return;
      }

      try {
        const response = await listMyApplications();
        const applications = Array.isArray(response) ? response : response?.results || [];
        const matchingApplication = applications.find(
          (application) =>
            String(application.pet?.id) === String(id) &&
            ["pending", "approved"].includes(application.status),
        );
        setActiveApplication(matchingApplication || null);
        setIsInterested(Boolean(matchingApplication));
        setIsInterestFormOpen(Boolean(matchingApplication));
        setVisitPlanForm({
          preferredVisitDate: matchingApplication?.preferred_visit_date || "",
          meetingPreference: matchingApplication?.meeting_preference || "rehomer_home",
          meetingLocationNotes: matchingApplication?.meeting_location_notes || "",
        });
      } catch (applicationError) {
        console.error("Error fetching application status:", applicationError);
      }
    };

    fetchApplicationStatus();
  }, [id]);

  const handleAdoptInterest = async () => {
    if (!getAccessToken()) {
      setActionError("Please log in to show interest in this pet.");
      navigate("/login/user");
      return;
    }

    if (!visitPlanForm.preferredVisitDate) {
      setActionError("Choose a date for meeting the rehomer.");
      return;
    }

    if (!visitPlanForm.meetingLocationNotes.trim()) {
      setActionError("Share the meetup location or a few meeting details first.");
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError("");
      setActionSuccess("");
      const createdApplication = await createAdoptionApplication({
        pet_id: Number(id),
        message: `I'm interested in ${pet.name} and would love to learn more.`,
        preferred_visit_date: visitPlanForm.preferredVisitDate,
        meeting_preference: visitPlanForm.meetingPreference,
        meeting_location_notes: visitPlanForm.meetingLocationNotes.trim(),
      });

      setActiveApplication(createdApplication);
      setIsInterested(true);
      setIsInterestFormOpen(false);
      setActionSuccess(
        `Your interest in ${pet.name} has been sent to the rehomer together with your meetup details.`,
      );
      updatePetPouchCount();
    } catch (err) {
      setActionError(err.message || "Failed to send your interest.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVisitPlanSubmit = async () => {
    if (!activeApplication?.id) {
      setActionError("Start by marking your interest first.");
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError("");
      setActionSuccess("");
      const updatedApplication = await proposeVisitPlan(activeApplication.id, {
        preferred_visit_date: visitPlanForm.preferredVisitDate,
        meeting_preference: visitPlanForm.meetingPreference,
        meeting_location_notes: visitPlanForm.meetingLocationNotes,
      });
      setActiveApplication(updatedApplication);
      setIsInterestFormOpen(false);
      setActionSuccess(
        "Your visit plan has been shared. The rehomer can accept it or suggest another time.",
      );
    } catch (visitError) {
      setActionError(visitError.message || "Failed to share your visit plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawInterest = async () => {
    if (!activeApplication?.id) {
      setActionError("There is no active interest to cancel.");
      return;
    }

    const confirmed = window.confirm(`Cancel your interest in ${pet.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError("");
      setActionSuccess("");
      await withdrawApplication(activeApplication.id);
      setActiveApplication(null);
      setIsInterested(false);
      setIsInterestFormOpen(false);
      setVisitPlanForm({
        preferredVisitDate: "",
        meetingPreference: "rehomer_home",
        meetingLocationNotes: "",
      });
      setActionSuccess(`Your interest in ${pet.name} has been canceled.`);
    } catch (withdrawError) {
      setActionError(withdrawError.message || "Failed to cancel your interest.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChat = async () => {
    if (!getAccessToken()) {
      setActionError("Please log in to message the rehomer about this pet.");
      navigate("/login/user");
      return;
    }

    try {
      setActionError("");
      setIsSubmitting(true);
      const conversation = await startConversation(id);
      navigate(`/chats/${conversation.id}`);
    } catch (err) {
      setActionError(err.message || "Failed to open your chat with the rehomer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToPetPouch = async () => {
    if (!getAccessToken()) {
      setActionError("Please log in to save pets to your Pet Pouch.");
      navigate("/login/user");
      return;
    }

    try {
      setIsSaving(true);
      setActionError("");
      const response = await addToWishlist(id);
      setIsSaved(true);
      updatePetPouchCount();

      if (response?.created === false) {
        setActionError(`${pet.name} is already saved in your Pet Pouch.`);
      }
    } catch (saveError) {
      setActionError(saveError.message || "Failed to save this pet to your Pet Pouch.");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImageToCloudinary = async (file) => {
    const imageFormData = new FormData();
    imageFormData.append("file", file);
    imageFormData.append("upload_preset", "pets_presets");
    imageFormData.append("cloud_name", "dgdf0svqx");

    const response = await fetch("https://api.cloudinary.com/v1_1/dgdf0svqx/image/upload", {
      method: "POST",
      body: imageFormData,
    });

    if (!response.ok) {
      throw new Error("Image upload failed. Please try again.");
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleOwnerFormChange = (event) => {
    const { name, value } = event.target;
    setOwnerForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleOpenInterestForm = () => {
    if (!getAccessToken()) {
      setActionError("Please log in to show interest in this pet.");
      navigate("/login/user");
      return;
    }

    setActionError("");
    setActionSuccess("");
    setIsInterestFormOpen(true);
  };

  const handleCloseInterestForm = () => {
    setActionError("");
    setActionSuccess("");
    setIsInterestFormOpen(false);
    setVisitPlanForm({
      preferredVisitDate: "",
      meetingPreference: "rehomer_home",
      meetingLocationNotes: "",
    });
  };

  const handleVisitPlanFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setVisitPlanForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMeetingPreferenceChange = (nextValue) => {
    setVisitPlanForm((currentForm) => ({
      ...currentForm,
      meetingPreference: nextValue,
    }));
  };

  const handleOwnerNotesSave = async () => {
    try {
      setIsUpdatingOwnerNotes(true);
      setActionError("");
      const response = await updatePet(id, ownerForm);
      setPet(normalizePet(response));
    } catch (updateError) {
      setActionError(updateError.message || "Failed to update listing notes.");
    } finally {
      setIsUpdatingOwnerNotes(false);
    }
  };

  const handleAddExtraImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.match("image.*")) {
      setActionError("Please select an image file (JPEG or PNG).");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setActionError("Image must be smaller than 5MB.");
      return;
    }

    try {
      setIsUploadingExtraImage(true);
      setActionError("");
      const uploadedImageUrl = await uploadImageToCloudinary(file);
      const response = await updatePet(id, { additional_image_url: uploadedImageUrl });
      setPet(normalizePet(response));
      setActiveImageIndex(Math.max((response.images || []).length - 1, 0));
    } catch (uploadError) {
      setActionError(uploadError.message || "Failed to add another pet image.");
    } finally {
      setIsUploadingExtraImage(false);
    }
  };

  const showPreviousImage = () => {
    if (!pet?.imageUrls?.length) {
      return;
    }

    setActiveImageIndex((currentIndex) =>
      currentIndex === 0 ? pet.imageUrls.length - 1 : currentIndex - 1,
    );
  };

  const showNextImage = () => {
    if (!pet?.imageUrls?.length) {
      return;
    }

    setActiveImageIndex((currentIndex) =>
      currentIndex === pet.imageUrls.length - 1 ? 0 : currentIndex + 1,
    );
  };

  if (loading) {
    return (
      <div className="pd-shell">
        <style>{pageStyles}</style>
        <div className="pd-loading">
          <div className="pd-state-card">Loading pet details...</div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pd-shell">
        <style>{pageStyles}</style>
        <div className="pd-state">
          <div className="pd-state-card">{loadError}</div>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="pd-shell">
        <style>{pageStyles}</style>
        <div className="pd-state">
          <div className="pd-state-card">Pet not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-shell">
      <style>{pageStyles}</style>
      <div className="pd-page">
        <section className="pd-hero">
          <div className="pd-gallery-card">
            <div className="pd-image-frame">
              <img
                src={pet.imageUrls?.[activeImageIndex] || pet.imageUrl || "/default-pet.jpg"}
                alt={pet.name}
                className="pd-image"
              />
              <div className="pd-image-overlay" aria-hidden="true" />
              <span className={`pd-status-badge ${pet.adopted ? "is-adopted" : ""}`}>
                {pet.adopted ? "Adopted" : "Available"}
              </span>
              {pet.imageUrls?.length > 1 ? (
                <>
                  <button type="button" onClick={showPreviousImage} className="pd-image-nav left" aria-label="Show previous pet photo">
                    ‹
                  </button>
                  <button type="button" onClick={showNextImage} className="pd-image-nav right" aria-label="Show next pet photo">
                    ›
                  </button>
                </>
              ) : null}
            </div>
            {pet.imageUrls?.length > 1 ? (
              <div className="pd-image-dots">
                {pet.imageUrls.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`pd-image-dot${index === activeImageIndex ? " is-active" : ""}`}
                    aria-label={`Show photo ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="pd-summary">
            <div className="pd-summary-top">
              <div>
                <p className="pd-type">{toTitleCase(pet.type)}</p>
                <h1 className="pd-name">{pet.name}</h1>
                <p className="pd-listed-by">Listed by {pet.rehomerName}</p>
                {rehomerPresence ? (
                  <p className="pd-presence">{rehomerPresence}</p>
                ) : null}
              </div>
              <div className="pd-mini-tags">
                {pet.location ? <span className="pd-mini-tag">{pet.location}</span> : null}
                <span className="pd-mini-tag">{pet.breed || "Breed not shared yet"}</span>
              </div>
            </div>

            <div className="pd-facts-grid">
              <article className="pd-fact-card">
                <span className="pd-fact-label">Breed</span>
                <strong className="pd-fact-value">{pet.breed || "Unknown"}</strong>
              </article>
              <article className="pd-fact-card">
                <span className="pd-fact-label">Age</span>
                <strong className="pd-fact-value">{pet.age || "Unknown"}</strong>
              </article>
              <article className="pd-fact-card">
                <span className="pd-fact-label">Gender</span>
                <strong className="pd-fact-value">{toTitleCase(pet.gender || "Unknown")}</strong>
              </article>
              <article className="pd-fact-card">
                <span className="pd-fact-label">Status</span>
                <strong className="pd-fact-value">{pet.adopted ? "Adopted" : "Available"}</strong>
              </article>
            </div>

            <div className="pd-health-strip">
              <div className="pd-health-pill">
                <span className="pd-health-label">Vaccination</span>
                <strong>{pet.is_vaccinated ? "Confirmed" : "Ask rehomer"}</strong>
              </div>
              <div className="pd-health-pill">
                <span className="pd-health-label">Deworming</span>
                <strong>{pet.is_dewormed ? "Confirmed" : "Ask rehomer"}</strong>
              </div>
              <div className="pd-health-pill">
                <span className="pd-health-label">Neutered</span>
                <strong>{pet.is_neutered ? "Yes" : "Not shared"}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="pd-content-grid">
          <div className="pd-main-column">
            {pet.description ? (
              <article className="pd-card">
                <div className="pd-card-head">
                  <span className="pd-card-kicker">About</span>
                  <h2>Meet {pet.name}</h2>
                </div>
                <p className="pd-body-copy">{pet.description}</p>
              </article>
            ) : null}

            <article className="pd-card">
              <div className="pd-card-head">
                <span className="pd-card-kicker">Personality</span>
                <h2>What {pet.name} is like</h2>
              </div>
              <div className="pd-traits">
                {(pet.personality?.length ? pet.personality : ["Still getting to know this pet"]).map((trait, index) => (
                  <span key={`${trait}-${index}`} className="pd-trait-chip">
                    {trait}
                  </span>
                ))}
              </div>
            </article>

            <article className="pd-card">
              <div className="pd-card-head">
                <span className="pd-card-kicker">Care</span>
                <h2>Care and compatibility</h2>
              </div>
              <div className="pd-care-grid">
                <div className="pd-care-item"><span>Energy level</span><strong>{formatCompatibilityValue(pet.energy_level)}</strong></div>
                <div className="pd-care-item"><span>Care level</span><strong>{formatCompatibilityValue(pet.care_level)}</strong></div>
                <div className="pd-care-item"><span>Space needed</span><strong>{formatCompatibilityValue(pet.space_needed)}</strong></div>
                <div className="pd-care-item"><span>Grooming needs</span><strong>{formatCompatibilityValue(pet.grooming_needs)}</strong></div>
                <div className="pd-care-item"><span>Noise level</span><strong>{formatCompatibilityValue(pet.noise_level)}</strong></div>
                <div className="pd-care-item"><span>Apartment friendly</span><strong>{formatCompatibilityValue(pet.apartment_friendly)}</strong></div>
                <div className="pd-care-item"><span>Good with children</span><strong>{formatCompatibilityValue(pet.good_with_children)}</strong></div>
                <div className="pd-care-item"><span>Good with other pets</span><strong>{formatCompatibilityValue(pet.good_with_other_pets)}</strong></div>
              </div>
            </article>

            {pet.requirements ? (
              <article className="pd-card">
                <div className="pd-card-head">
                  <span className="pd-card-kicker">Needs</span>
                  <h2>Special requirements</h2>
                </div>
                <p className="pd-body-copy">{pet.requirements}</p>
              </article>
            ) : null}

            {canManageListing ? (
              <article className="pd-card pd-card--owner">
                <div className="pd-card-head">
                  <span className="pd-card-kicker">Manage Listing</span>
                  <h2>Update your listing notes</h2>
                </div>
                <p className="pd-body-copy">You can update the location, improve the description, and add more photos here. Core pet details stay locked.</p>
                {actionError ? <p className="pd-error">{actionError}</p> : null}
                <div className="pd-form-grid">
                  <label className="pd-field">
                    <span>Location</span>
                    <input
                      name="location"
                      value={ownerForm.location}
                      onChange={handleOwnerFormChange}
                      className="pd-input"
                      placeholder="Update location"
                    />
                  </label>
                  <label className="pd-field">
                    <span>About this pet</span>
                    <textarea
                      name="description"
                      value={ownerForm.description}
                      onChange={handleOwnerFormChange}
                      className="pd-textarea"
                      rows={5}
                      placeholder="Refresh the description for adopters"
                    />
                  </label>
                </div>
                <div className="pd-owner-actions">
                  <button
                    type="button"
                    onClick={handleOwnerNotesSave}
                    className="pd-primary-button"
                    disabled={isUpdatingOwnerNotes}
                  >
                    {isUpdatingOwnerNotes ? "Saving..." : "Save changes"}
                  </button>
                  <label className="pd-secondary-button">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAddExtraImage}
                      className="pd-hidden-input"
                    />
                    {isUploadingExtraImage ? "Uploading image..." : "Add another photo"}
                  </label>
                </div>
              </article>
            ) : null}
          </div>

          <aside className="pd-side-column">
            {canShowAdopterActions && !isInterested ? (
              <article className="pd-card">
                <div className="pd-card-head">
                  <span className="pd-card-kicker">Next Step</span>
                  <h2>Take your time with {pet.name}</h2>
                </div>
                <p className="pd-body-copy">
                  Save this pet, chat with the rehomer, or open the interest form when you are ready. Once you say you are interested, you can immediately add your proposed date and meetup details.
                </p>
                {actionError ? <p className="pd-error">{actionError}</p> : null}
                {actionSuccess ? <p className="pd-success">{actionSuccess}</p> : null}
                <div className="pd-side-actions">
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={handleOpenChat}
                      className="pd-primary-button"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Opening chat..." : "Chat with rehomer"}
                    </button>
                  ) : null}
                  {isLoggedIn && !isSaved ? (
                    <button
                      type="button"
                      onClick={handleSaveToPetPouch}
                      className="pd-secondary-button"
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save to Pet Pouch"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleOpenInterestForm}
                    className="pd-secondary-button"
                    disabled={isSubmitting}
                  >
                    I'm interested
                  </button>
                </div>
                {isInterestFormOpen ? (
                  <>
                    <div className="pd-form-grid">
                      <label className="pd-field">
                        <span>Preferred visit date</span>
                        <ThemedDatePicker
                          value={visitPlanForm.preferredVisitDate}
                          onChange={(nextValue) =>
                            handleVisitPlanFormChange({
                              target: { name: "preferredVisitDate", value: nextValue, type: "text" },
                            })
                          }
                          ariaLabel="Preferred visit date"
                        />
                      </label>
                      <label className="pd-field">
                        <span>How would you like to meet?</span>
                        <ThemedSelect
                          value={visitPlanForm.meetingPreference}
                          onChange={handleMeetingPreferenceChange}
                          options={meetingPreferenceOptions}
                          ariaLabel="How would you like to meet?"
                        />
                      </label>
                      <label className="pd-field">
                        <span>Meetup location or notes</span>
                        <textarea
                          name="meetingLocationNotes"
                          value={visitPlanForm.meetingLocationNotes}
                          onChange={handleVisitPlanFormChange}
                          className="pd-textarea"
                          rows={3}
                          placeholder="Share where you would like to meet, what time works, or any safety details."
                        />
                      </label>
                    </div>
                    <div className="pd-side-actions">
                      <button
                        type="button"
                        onClick={handleAdoptInterest}
                        className="pd-primary-button"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Sending..." : "Send interest"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseInterestForm}
                        className="pd-secondary-button"
                        disabled={isSubmitting}
                      >
                        Not now
                      </button>
                    </div>
                  </>
                ) : null}
                {!isLoggedIn ? (
                  <div className="pd-login-card">
                    <p>Log in to save {pet.name}, chat with the rehomer, or mark your interest.</p>
                    <button type="button" onClick={() => navigate("/login/user")} className="pd-primary-button">
                      Log in
                    </button>
                  </div>
                ) : null}
                {isSaved ? (
                  <p className="pd-success">{pet.name} is already in your Pet Pouch.</p>
                ) : null}
              </article>
            ) : null}

            {canShowAdopterActions && isInterested ? (
              <article className="pd-card">
                <div className="pd-card-head pd-card-head--split">
                  <div>
                    <span className="pd-card-kicker">Interest Sent</span>
                    <h2>Your interest in {pet.name} is active</h2>
                  </div>
                  <button
                    type="button"
                    className="pd-close-link"
                    onClick={handleWithdrawInterest}
                    disabled={isSubmitting}
                    aria-label={`Cancel interest in ${pet.name}`}
                  >
                    ×
                  </button>
                </div>
                <p className="pd-body-copy">
                  The rehomer can now review your interest and either continue with you or reject it from their side.
                </p>
                <p className="pd-helper-copy">
                  Update here if you want to change your meetup details:{" "}
                  <button
                    type="button"
                    className="pd-inline-link"
                    onClick={handleOpenInterestForm}
                    disabled={isSubmitting}
                  >
                    Update here
                  </button>
                </p>
                {actionError ? <p className="pd-error">{actionError}</p> : null}
                {actionSuccess ? <p className="pd-success">{actionSuccess}</p> : null}
                {hasVisitPlan ? (
                  <div className="pd-summary-list">
                    <div className="pd-summary-row">
                      <span className="pd-summary-label">Proposed date</span>
                      <span className="pd-summary-value">
                        {activeApplication?.preferred_visit_date
                          ? new Date(activeApplication.preferred_visit_date).toLocaleDateString()
                          : "Not set"}
                      </span>
                    </div>
                    <div className="pd-summary-row">
                      <span className="pd-summary-label">Meeting style</span>
                      <span className="pd-summary-value is-muted">
                        {meetingPreferenceOptions.find(
                          (option) => option.value === activeApplication?.meeting_preference,
                        )?.label || "Not shared yet"}
                      </span>
                    </div>
                    {activeApplication?.meeting_location_notes ? (
                      <div className="pd-summary-row">
                        <span className="pd-summary-label">Notes</span>
                        <span className="pd-summary-value is-muted">
                          {activeApplication.meeting_location_notes}
                        </span>
                      </div>
                    ) : null}
                    <div className="pd-summary-row">
                      <span className="pd-summary-label">Status</span>
                      <span className="pd-summary-value is-muted">
                        {activeApplication?.visit_status === "agreed"
                          ? "Visit agreed"
                          : "Waiting for the rehomer to reply or suggest another time"}
                      </span>
                    </div>
                  </div>
                ) : null}
                {isInterestFormOpen ? (
                  <div className="pd-form-panel">
                    <div className="pd-form-grid">
                      <label className="pd-field">
                        <span>Preferred visit date</span>
                        <ThemedDatePicker
                          value={visitPlanForm.preferredVisitDate}
                          onChange={(nextValue) =>
                            handleVisitPlanFormChange({
                              target: { name: "preferredVisitDate", value: nextValue, type: "text" },
                            })
                          }
                          ariaLabel="Preferred visit date"
                        />
                      </label>
                      <label className="pd-field">
                        <span>How would you like to meet?</span>
                        <ThemedSelect
                          value={visitPlanForm.meetingPreference}
                          onChange={handleMeetingPreferenceChange}
                          options={meetingPreferenceOptions}
                          ariaLabel="How would you like to meet?"
                        />
                      </label>
                      <label className="pd-field">
                        <span>Meeting or location notes</span>
                        <textarea
                          name="meetingLocationNotes"
                          value={visitPlanForm.meetingLocationNotes}
                          onChange={handleVisitPlanFormChange}
                          className="pd-textarea"
                          rows={3}
                          placeholder="For example, I am available in Kilimani after 4pm, or we can meet at a safe public place."
                        />
                      </label>
                    </div>
                    <div className="pd-side-actions">
                      <button
                        type="button"
                        onClick={handleVisitPlanSubmit}
                        className="pd-primary-button"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save updates"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInterestFormOpen(false)}
                        className="pd-secondary-button"
                        disabled={isSubmitting}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            ) : null}
          </aside>
        </section>
      </div>
      {canShowAdopterActions ? (
        <button type="button" className="pd-floating-chat" onClick={handleOpenChat}>
          Chat with rehomer
        </button>
      ) : null}
      {isRehomerView ? <RehomerWorkspaceNav /> : null}
    </div>
  );
};

export default PetDetail;
