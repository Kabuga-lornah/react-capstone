import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  const [ownerForm, setOwnerForm] = useState({
    location: "",
    description: "",
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
        setIsSaved(
          wishlistItems.some((item) => String(item.pet?.id) === String(id)),
        );
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

  if (loading) return <p>Loading...</p>;
  if (loadError) return <p>{loadError}</p>;
  if (!pet) return <p>Pet not found</p>;

  return (
    <div style={styles.container}>
      <button 
        onClick={() => navigate(-1)} 
        style={styles.backButton}
      >
        &larr; Back to Pets
      </button>
      
      <div style={styles.petContainer}>
        <div style={styles.imageContainer}>
          <img 
            src={pet.imageUrls?.[activeImageIndex] || pet.imageUrl || "/default-pet.jpg"} 
            alt={pet.name}
            style={styles.petImage}
          />
          {pet.imageUrls?.length > 1 && (
            <>
              <button type="button" onClick={showPreviousImage} style={styles.imageNavButtonLeft}>
                ‹
              </button>
              <button type="button" onClick={showNextImage} style={styles.imageNavButtonRight}>
                ›
              </button>
              <div style={styles.imageDots}>
                {pet.imageUrls.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    style={{
                      ...styles.imageDot,
                      ...(index === activeImageIndex ? styles.imageDotActive : {}),
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        
        <div style={styles.detailsContainer}>
          <h1 style={styles.petName}>{pet.name}</h1>
          <p style={styles.rehomer}>Listed by: {pet.rehomerName}</p>
          {rehomerPresence ? (
            <p style={styles.rehomerStatus}>{rehomerPresence}</p>
          ) : null}
          
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <h3>Breed</h3>
              <p>{pet.breed}</p>
            </div>
            <div style={styles.detailItem}>
              <h3>Age</h3>
              <p>{pet.age}</p>
            </div>
            <div style={styles.detailItem}>
              <h3>Gender</h3>
              <p>{pet.gender}</p>
            </div>
            <div style={styles.detailItem}>
              <h3>Status</h3>
              <p>{pet.adopted ? "Adopted" : "Available"}</p>
            </div>
          </div>
          
          <div style={styles.section}>
            <h2>About {pet.name}</h2>
            <p>{pet.description}</p>
          </div>
          
          <div style={styles.section}>
            <h2>Personality</h2>
            <div style={styles.traitsContainer}>
              {pet.personality.map((trait, index) => (
                <span key={index} style={styles.trait}>
                  {trait}
                </span>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <h2>Care & Compatibility</h2>
            <div style={styles.compatibilityGrid}>
              <div style={styles.compatibilityItem}>
                <strong>Energy Level:</strong> {formatCompatibilityValue(pet.energy_level)}
              </div>
              <div style={styles.compatibilityItem}>
                <strong>Care Level:</strong> {formatCompatibilityValue(pet.care_level)}
              </div>
              <div style={styles.compatibilityItem}>
                <strong>Space Needed:</strong> {formatCompatibilityValue(pet.space_needed)}
              </div>
              <div style={styles.compatibilityItem}>
                <strong>Grooming Needs:</strong> {formatCompatibilityValue(pet.grooming_needs)}
              </div>
              <div style={styles.compatibilityItem}>
                <strong>Noise Level:</strong> {formatCompatibilityValue(pet.noise_level)}
              </div>
              <div style={styles.compatibilityItem}>
                <strong>Apartment Friendly:</strong> {formatCompatibilityValue(pet.apartment_friendly)}
              </div>
              <div style={styles.compatibilityItem}>
                <strong>Good With Children:</strong> {formatCompatibilityValue(pet.good_with_children)}
              </div>
              <div style={styles.compatibilityItem}>
                <strong>Good With Other Pets:</strong> {formatCompatibilityValue(pet.good_with_other_pets)}
              </div>
            </div>
          </div>
          
          {pet.requirements && (
            <div style={styles.section}>
              <h2>Special Requirements</h2>
              <p>{pet.requirements}</p>
            </div>
          )}

          {canManageListing && (
            <div style={styles.manageSection}>
              <h2 style={styles.manageHeading}>Manage listing notes</h2>
              <p style={styles.manageCopy}>
                You can fix notes, location details, and add more pet photos here. Core details like name, age,
                breed, and species stay locked.
              </p>
              {actionError && <p style={styles.errorMessage}>{actionError}</p>}
              <div style={styles.manageForm}>
                <label style={styles.manageField}>
                  <span style={styles.manageLabel}>Location</span>
                  <input
                    name="location"
                    value={ownerForm.location}
                    onChange={handleOwnerFormChange}
                    style={styles.manageInput}
                    placeholder="Update location"
                  />
                </label>
                <label style={styles.manageField}>
                  <span style={styles.manageLabel}>About this pet</span>
                  <textarea
                    name="description"
                    value={ownerForm.description}
                    onChange={handleOwnerFormChange}
                    style={styles.manageTextarea}
                    rows={4}
                    placeholder="Correct any wording or spelling here"
                  />
                </label>
              </div>
              <div style={styles.manageActions}>
                <button
                  type="button"
                  onClick={handleOwnerNotesSave}
                  style={styles.saveChangesButton}
                  disabled={isUpdatingOwnerNotes}
                >
                  {isUpdatingOwnerNotes ? "Saving..." : "Save note changes"}
                </button>
                <label style={styles.addImageButton}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAddExtraImage}
                    style={styles.hiddenFileInput}
                  />
                  {isUploadingExtraImage ? "Uploading image..." : "Add another photo"}
                </label>
              </div>
            </div>
          )}
          
          {canShowAdopterActions && (
            <div style={styles.actionSection}>
              {actionError && (
                <p style={styles.errorMessage}>{actionError}</p>
              )}
              <button
                onClick={handleSaveToPetPouch}
                style={styles.saveButton}
                disabled={isSaving || isSaved}
              >
                {isSaved ? "Saved to Pet Pouch" : isSaving ? "Saving..." : "Save to Pet Pouch"}
              </button>
              {isInterested ? (
                <p style={styles.successMessage}>
                  Thank you for your interest! The rehomer will contact you soon.
                </p>
              ) : (
                <button 
                  onClick={handleAdoptInterest}
                  style={styles.adoptButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "I'm Interested in Adopting"}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
  },
  backButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#FFA500",
    fontSize: "16px",
    cursor: "pointer",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  petContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "40px",
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
    },
  },
  imageContainer: {
    position: "relative",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  petImage: {
    width: "100%",
    height: "100%",
    minHeight: "520px",
    objectFit: "cover",
    display: "block",
  },
  imageNavButtonLeft: {
    position: "absolute",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    borderRadius: "999px",
    width: "42px",
    height: "42px",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    color: "#d97706",
    fontSize: "28px",
    cursor: "pointer",
  },
  imageNavButtonRight: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    borderRadius: "999px",
    width: "42px",
    height: "42px",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    color: "#d97706",
    fontSize: "28px",
    cursor: "pointer",
  },
  imageDots: {
    position: "absolute",
    left: "50%",
    bottom: "16px",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "8px",
  },
  imageDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "rgba(255,255,255,0.6)",
    cursor: "pointer",
  },
  imageDotActive: {
    backgroundColor: "#FFA500",
  },
  detailsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },
  petName: {
    fontSize: "32px",
    color: "#333",
    margin: "0",
  },
  rehomer: {
    color: "#666",
    fontSize: "16px",
    margin: "5px 0 0",
  },
  rehomerStatus: {
    color: "#d97706",
    fontSize: "14px",
    fontWeight: "600",
    margin: "-10px 0 0",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "15px",
    backgroundColor: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
  },
  detailItem: {
    h3: {
      margin: "0 0 5px",
      fontSize: "14px",
      color: "#666",
    },
    p: {
      margin: "0",
      fontSize: "18px",
      fontWeight: "500",
    },
  },
  section: {
    h2: {
      fontSize: "20px",
      margin: "0 0 15px",
      color: "#444",
    },
    p: {
      margin: "0",
      lineHeight: "1.6",
    },
  },
  traitsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  compatibilityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    backgroundColor: "#f9f9f9",
    padding: "16px",
    borderRadius: "8px",
  },
  compatibilityItem: {
    fontSize: "14px",
    color: "#444",
    lineHeight: "1.6",
  },
  trait: {
    backgroundColor: "#FFA500",
    color: "white",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "14px",
  },
  actionSection: {
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "1px solid #eee",
  },
  manageSection: {
    marginTop: "8px",
    padding: "22px",
    borderRadius: "14px",
    backgroundColor: "#fffaf0",
    border: "1px solid #f5d7a5",
  },
  manageHeading: {
    fontSize: "22px",
    margin: "0 0 8px",
    color: "#7c4a03",
  },
  manageCopy: {
    margin: "0 0 18px",
    color: "#6b5d45",
    lineHeight: "1.7",
  },
  manageForm: {
    display: "grid",
    gap: "14px",
  },
  manageField: {
    display: "grid",
    gap: "8px",
  },
  manageLabel: {
    fontWeight: "600",
    color: "#5c430d",
  },
  manageInput: {
    width: "100%",
    border: "1px solid #e8c48c",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "15px",
    outline: "none",
  },
  manageTextarea: {
    width: "100%",
    border: "1px solid #e8c48c",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "15px",
    outline: "none",
    resize: "vertical",
  },
  manageActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "18px",
  },
  saveChangesButton: {
    backgroundColor: "#FFA500",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "600",
    cursor: "pointer",
  },
  addImageButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #f0bf77",
    backgroundColor: "#fff",
    color: "#d97706",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "600",
    cursor: "pointer",
  },
  hiddenFileInput: {
    display: "none",
  },
  adoptButton: {
    backgroundColor: "#FFA500",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "5px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.3s",
    "&:hover": {
      backgroundColor: "#e69500",
    },
  },
  saveButton: {
    backgroundColor: "white",
    color: "#FFA500",
    border: "1px solid #FFA500",
    padding: "12px 25px",
    borderRadius: "5px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginRight: "12px",
    marginBottom: "12px",
  },
  successMessage: {
    color: "#4CAF50",
    fontSize: "16px",
  },
  errorMessage: {
    color: "#c53030",
    fontSize: "15px",
    marginBottom: "12px",
  },
};

export default PetDetail;
