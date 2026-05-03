import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addToWishlist,
  createAdoptionApplication,
  getAccessToken,
  getPetDetail,
  listMyApplications,
  listWishlist,
  updatePet,
} from "../../services/api";
import { useAuth } from "./AuthContext";
import { PetPouchContext } from "./PetPouchContext";

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

const normalizePet = (pet) => ({
  ...pet,
  type: pet.type || pet.species || "other",
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

const getPresenceLabel = (owner) => {
  if (owner?.is_online) {
    return "Online now";
  }

  if (owner?.activity_status === "recently_active") {
    return "Recently active";
  }

  return "";
};

const pageStyles = `
  .pd-shell {
    min-height: 100vh;
    background:
      radial-gradient(circle at top right, rgba(255, 212, 138, 0.28), transparent 30%),
      linear-gradient(180deg, #fffaf4 0%, #fffdf9 100%);
  }

  .pd-loading,
  .pd-state {
    max-width: 640px;
    margin: 0 auto;
    padding: 28px 18px calc(110px + env(safe-area-inset-bottom, 0px));
    color: #5f4b34;
  }

  .pd-state-card {
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(245, 158, 11, 0.12);
    border-radius: 24px;
    box-shadow: 0 18px 44px rgba(28, 18, 7, 0.08);
    padding: 24px;
  }

  .pd-page {
    max-width: 1180px;
    margin: 0 auto;
    padding: 18px 16px calc(110px + env(safe-area-inset-bottom, 0px));
  }

  .pd-back-button {
    border: none;
    background: transparent;
    color: #d97706;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 18px;
  }

  .pd-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: 24px;
    align-items: start;
  }

  .pd-gallery-card,
  .pd-card,
  .pd-summary-top {
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(245, 158, 11, 0.12);
    border-radius: 26px;
    box-shadow: 0 18px 44px rgba(28, 18, 7, 0.08);
  }

  .pd-gallery-card {
    padding: 14px;
  }

  .pd-image-frame {
    position: relative;
    overflow: hidden;
    border-radius: 22px;
    min-height: 460px;
    background: #f6e6c9;
  }

  .pd-image {
    width: 100%;
    height: 100%;
    min-height: 460px;
    object-fit: cover;
    display: block;
  }

  .pd-image-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(28, 18, 7, 0.02) 0%, rgba(28, 18, 7, 0.2) 100%);
    pointer-events: none;
  }

  .pd-status-badge {
    position: absolute;
    top: 16px;
    left: 16px;
    background: rgba(255, 255, 255, 0.95);
    color: #166534;
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .pd-status-badge.is-adopted {
    color: #9a3412;
  }

  .pd-image-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 42px;
    height: 42px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    color: #d97706;
    font-size: 28px;
    cursor: pointer;
  }

  .pd-image-nav.left { left: 16px; }
  .pd-image-nav.right { right: 16px; }

  .pd-image-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 14px 4px 2px;
  }

  .pd-image-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    border: none;
    background: rgba(245, 158, 11, 0.2);
    cursor: pointer;
  }

  .pd-image-dot.is-active {
    background: #f59e0b;
  }

  .pd-summary {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .pd-summary-top {
    padding: 24px;
    display: grid;
    gap: 18px;
  }

  .pd-type {
    margin: 0 0 8px;
    color: #d97706;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .pd-name {
    margin: 0;
    font-size: clamp(2rem, 4vw, 3.2rem);
    line-height: 0.96;
    color: #24170b;
  }

  .pd-listed-by,
  .pd-presence {
    margin: 10px 0 0;
    color: #6b4e2a;
    font-size: 15px;
  }

  .pd-presence {
    color: #d97706;
    font-weight: 700;
  }

  .pd-mini-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .pd-mini-tag {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 9px 12px;
    background: #fff6df;
    color: #a16207;
    font-size: 13px;
    font-weight: 700;
  }

  .pd-facts-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .pd-fact-card,
  .pd-health-pill {
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(245, 158, 11, 0.12);
    border-radius: 20px;
    padding: 16px;
    box-shadow: 0 14px 32px rgba(28, 18, 7, 0.06);
  }

  .pd-fact-label,
  .pd-health-label {
    display: block;
    color: #8b6a45;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.03em;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .pd-fact-value,
  .pd-health-pill strong {
    color: #24170b;
    font-size: 16px;
    line-height: 1.4;
  }

  .pd-health-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .pd-content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
    gap: 24px;
    margin-top: 24px;
    align-items: start;
  }

  .pd-main-column,
  .pd-side-column {
    display: grid;
    gap: 18px;
  }

  .pd-card {
    padding: 22px;
  }

  .pd-card--warm {
    background: linear-gradient(180deg, #fff9ec 0%, #ffffff 100%);
  }

  .pd-card--owner {
    background: linear-gradient(180deg, #fff8e8 0%, #ffffff 100%);
  }

  .pd-card-head {
    margin-bottom: 14px;
  }

  .pd-card-head h2 {
    margin: 4px 0 0;
    font-size: 24px;
    color: #24170b;
  }

  .pd-card-kicker {
    color: #d97706;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .pd-body-copy {
    margin: 0;
    color: #5f4b34;
    line-height: 1.75;
    font-size: 15px;
  }

  .pd-traits {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .pd-trait-chip {
    border-radius: 999px;
    padding: 9px 14px;
    background: linear-gradient(135deg, #f59e0b 0%, #ffb739 100%);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }

  .pd-care-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .pd-care-item {
    border-radius: 18px;
    background: #fff9ee;
    border: 1px solid rgba(245, 158, 11, 0.12);
    padding: 14px 15px;
    display: grid;
    gap: 6px;
  }

  .pd-care-item span {
    color: #8b6a45;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pd-care-item strong {
    color: #24170b;
    font-size: 15px;
  }

  .pd-form-grid {
    display: grid;
    gap: 14px;
    margin-top: 18px;
  }

  .pd-field {
    display: grid;
    gap: 8px;
    color: #5f4b34;
    font-weight: 700;
  }

  .pd-input,
  .pd-textarea {
    width: 100%;
    border: 1px solid rgba(232, 196, 140, 1);
    border-radius: 14px;
    padding: 14px 15px;
    font-size: 15px;
    background: #fff;
    color: #24170b;
    outline: none;
    font-family: inherit;
  }

  .pd-textarea {
    resize: vertical;
    min-height: 140px;
  }

  .pd-owner-actions,
  .pd-side-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 16px;
  }

  .pd-primary-button,
  .pd-secondary-button {
    border: none;
    border-radius: 14px;
    padding: 13px 18px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.18s ease, opacity 0.18s ease;
    font-family: inherit;
  }

  .pd-primary-button {
    background: linear-gradient(135deg, #f59e0b 0%, #ffb739 100%);
    color: #fff;
    box-shadow: 0 16px 30px rgba(245, 158, 11, 0.22);
  }

  .pd-secondary-button {
    background: #fff;
    color: #c56b07;
    border: 1px solid rgba(245, 158, 11, 0.28);
  }

  .pd-primary-button:disabled,
  .pd-secondary-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .pd-hidden-input {
    display: none;
  }

  .pd-success {
    margin: 12px 0 0;
    color: #166534;
    font-weight: 600;
    line-height: 1.6;
  }

  .pd-error {
    margin: 0 0 12px;
    color: #c53030;
    font-weight: 600;
    line-height: 1.6;
  }

  .pd-login-card {
    display: grid;
    gap: 12px;
  }

  .pd-login-card p {
    margin: 0;
    color: #5f4b34;
    line-height: 1.7;
  }

  .pd-checklist {
    display: grid;
    gap: 10px;
  }

  .pd-checklist-item {
    border-radius: 16px;
    background: #fff9ee;
    border: 1px solid rgba(245, 158, 11, 0.12);
    padding: 13px 14px;
    color: #5f4b34;
    line-height: 1.6;
  }

  @media (max-width: 1024px) {
    .pd-hero,
    .pd-content-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .pd-page {
      padding: 14px 12px calc(110px + env(safe-area-inset-bottom, 0px));
    }

    .pd-image-frame,
    .pd-image {
      min-height: 340px;
    }

    .pd-summary-top,
    .pd-card,
    .pd-gallery-card {
      border-radius: 22px;
    }

    .pd-gallery-card {
      padding: 12px;
    }

    .pd-image-frame {
      border-radius: 18px;
    }

    .pd-name {
      font-size: 2.25rem;
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
  const [isInterested, setIsInterested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [ownerForm, setOwnerForm] = useState({
    location: "",
    description: "",
  });
  const [isUpdatingOwnerNotes, setIsUpdatingOwnerNotes] = useState(false);
  const [isUploadingExtraImage, setIsUploadingExtraImage] = useState(false);
  const { updatePetPouchCount } = useContext(PetPouchContext);
  const hasSeededInquiryRef = useRef(false);

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

  useEffect(() => {
    if (!pet) {
      return;
    }

    setOwnerForm({
      location: pet.location || "",
      description: pet.description || "",
    });
    setActiveImageIndex(0);

    if (!hasSeededInquiryRef.current) {
      setInquiryMessage(
        `Hi ${pet.rehomerName}, I am interested in ${pet.name}. Can you tell me more about the pet's feeding routine, vaccination history, and daily care needs?`,
      );
      hasSeededInquiryRef.current = true;
    }
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
        return;
      }

      try {
        const response = await listMyApplications();
        const applications = Array.isArray(response) ? response : response?.results || [];
        setIsInterested(
          applications.some(
            (application) =>
              String(application.pet?.id) === String(id) &&
              ["pending", "approved"].includes(application.status),
          ),
        );
      } catch (applicationError) {
        console.error("Error fetching application status:", applicationError);
      }
    };

    fetchApplicationStatus();
  }, [id]);

  const handleAdoptInterest = async () => {
    if (!getAccessToken()) {
      setActionError("Please log in to submit an adoption application.");
      navigate("/login/user");
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError("");
      await createAdoptionApplication({
        pet_id: Number(id),
        message: `I'm interested in adopting ${pet.name}.`,
      });

      setIsInterested(true);
      updatePetPouchCount();
    } catch (err) {
      setActionError(err.message || "Failed to submit adoption application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInquirySubmit = async () => {
    if (!getAccessToken()) {
      setActionError("Please log in to message the rehomer about this pet.");
      navigate("/login/user");
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError("");
      await createAdoptionApplication({
        pet_id: Number(id),
        message: inquiryMessage.trim() || `Hi ${pet.rehomerName}, I would like to know more about ${pet.name}.`,
      });

      setIsInterested(true);
      updatePetPouchCount();
    } catch (err) {
      setActionError(err.message || "Failed to send your message to the rehomer.");
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
            <article className="pd-card pd-card--warm">
              <div className="pd-card-head">
                <span className="pd-card-kicker">Rehomer</span>
                <h2>Ask about this pet</h2>
              </div>
              <p className="pd-body-copy">
                Ask about food, vaccination records, behavior, routines, or anything else that matters before adopting.
              </p>
              {canShowAdopterActions ? (
                <>
                  {actionError ? <p className="pd-error">{actionError}</p> : null}
                  {isLoggedIn ? (
                    <>
                      <textarea
                        value={inquiryMessage}
                        onChange={(event) => setInquiryMessage(event.target.value)}
                        className="pd-textarea"
                        rows={6}
                        placeholder="Write your question to the rehomer"
                      />
                      <div className="pd-side-actions">
                        <button
                          type="button"
                          onClick={handleInquirySubmit}
                          className="pd-primary-button"
                          disabled={isSubmitting || isInterested}
                        >
                          {isInterested ? "Message sent" : isSubmitting ? "Sending..." : "Send question to rehomer"}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveToPetPouch}
                          className="pd-secondary-button"
                          disabled={isSaving || isSaved}
                        >
                          {isSaved ? "Saved to Pet Pouch" : isSaving ? "Saving..." : "Save to Pet Pouch"}
                        </button>
                      </div>
                      {isInterested ? (
                        <p className="pd-success">Your question has been sent. The rehomer can now see your interest and message.</p>
                      ) : null}
                    </>
                  ) : (
                    <div className="pd-login-card">
                      <p>Log in to message the rehomer and keep track of your interest in {pet.name}.</p>
                      <button type="button" onClick={() => navigate("/login/user")} className="pd-primary-button">
                        Log in to ask a question
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="pd-body-copy">Adopter contact tools only appear for available pets that you do not own.</p>
              )}
            </article>

            {canShowAdopterActions && !isInterested ? (
              <article className="pd-card">
                <div className="pd-card-head">
                  <span className="pd-card-kicker">Adoption</span>
                  <h2>Ready to take the next step?</h2>
                </div>
                <p className="pd-body-copy">
                  If you already have enough information, you can send a direct adoption interest to the rehomer.
                </p>
                <div className="pd-side-actions">
                  <button
                    type="button"
                    onClick={handleAdoptInterest}
                    className="pd-primary-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "I'm interested in adopting"}
                  </button>
                </div>
              </article>
            ) : null}
          </aside>
        </section>
      </div>
    </div>
  );
};

export default PetDetail;
