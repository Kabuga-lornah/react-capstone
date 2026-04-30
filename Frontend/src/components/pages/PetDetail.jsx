import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  addToWishlist,
  createAdoptionApplication,
  getAccessToken,
  getPetDetail,
  listMyApplications,
  listWishlist,
} from "../../services/api";
import { PetPouchContext } from "./PetPouchContext";

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
});

const PetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isInterested, setIsInterested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { updatePetPouchCount } = useContext(PetPouchContext);

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
            src={pet.imageUrl || "/default-pet.jpg"} 
            alt={pet.name}
            style={styles.petImage}
          />
        </div>
        
        <div style={styles.detailsContainer}>
          <h1 style={styles.petName}>{pet.name}</h1>
          <p style={styles.rehomer}>Listed by: {pet.rehomerName}</p>
          
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
          
          {pet.requirements && (
            <div style={styles.section}>
              <h2>Special Requirements</h2>
              <p>{pet.requirements}</p>
            </div>
          )}
          
          {!pet.adopted && (
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
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  petImage: {
    width: "100%",
    height: "auto",
    display: "block",
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
