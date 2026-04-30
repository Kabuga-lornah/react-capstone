import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { PetPouchContext } from "./PetPouchContext";
import {
  addToWishlist,
  createAdoptionApplication,
  getAccessToken,
  listMyApplications,
  listPets,
  listWishlist,
  updatePet,
} from "../../services/api";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const personalityTags = [
  "Friendly",
  "Shy",
  "Energetic",
  "Calm",
  "Playful",
  "Independent",
  "Affectionate",
  "Intelligent",
  "Loyal",
];

const styles = {
  petCardsContainer: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
  },
  petCard: {
    backgroundColor: "#f1f1f1",
    padding: "15px",
    borderRadius: "8px",
    width: "200px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "430px",
  },
  petImage: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "10px",
  },
  petName: {
    fontSize: "20px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  heart: {
    cursor: "pointer",
    fontSize: "18px",
    transition: "color 0.3s ease",
    userSelect: "none",
  },
  petDescription: {
    fontSize: "14px",
    marginBottom: "5px",
  },
  petPersonality: {
    fontSize: "13px",
    fontStyle: "italic",
    marginBottom: "10px",
  },
  petButton: {
    backgroundColor: "#FFA500",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.3s",
  },
  secondaryButton: {
    backgroundColor: "white",
    color: "#FFA500",
    border: "1px solid #FFA500",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.3s",
    marginTop: "8px",
  },
  categoryHeading: {
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "15px",
    color: "#2d3748",
  },
  adoptedButton: {
    backgroundColor: "#FFA500",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "default",
    fontSize: "16px",
  },
  notification: {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "white",
    color: "black",
    padding: "15px 25px",
    borderRadius: "50px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    animation: "slideUp 0.5s ease-out",
  },
  statusMessage: {
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "15px",
  },
  errorMessage: {
    backgroundColor: "#fff5f5",
    color: "#c53030",
    border: "1px solid #feb2b2",
  },
  infoMessage: {
    backgroundColor: "#fffaf0",
    color: "#9c6b00",
    border: "1px solid #f6d18a",
  },
  emptyState: {
    padding: "24px",
    backgroundColor: "#f8f9fa",
    borderRadius: "12px",
    color: "#4a5568",
  },
};

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

const PetsList = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [likedPets, setLikedPets] = useState([]);
  const [adoptedPets, setAdoptedPets] = useState([]);
  const [savedPets, setSavedPets] = useState([]);
  const [notification, setNotification] = useState({ show: false, text: "" });

  const notificationTimerRef = useRef(null);
  const { user } = useAuth();
  const { updatePetPouchCount } = useContext(PetPouchContext);
  const navigate = useNavigate();

  const showNotification = (text) => {
    setNotification({ show: true, text });

    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = setTimeout(() => {
      setNotification({ show: false, text: "" });
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
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
        console.error("Error fetching pets:", fetchError);
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

        const wishlistItems = Array.isArray(wishlistResponse)
          ? wishlistResponse
          : wishlistResponse?.results || [];
        setSavedPets(
          wishlistItems
            .map((item) => item.pet?.id)
            .filter((petId) => petId !== undefined && petId !== null)
            .map((petId) => String(petId)),
        );

        const applications = Array.isArray(applicationsResponse)
          ? applicationsResponse
          : applicationsResponse?.results || [];
        const activeApplicationPetIds = applications
          .filter((application) => ["pending", "approved"].includes(application.status))
          .map((application) => String(application.pet?.id))
          .filter(Boolean);
        setAdoptedPets(activeApplicationPetIds);
      } catch (stateError) {
        console.error("Error hydrating pet state:", stateError);
      }
    };

    hydrateUserPetState();
  }, [user]);

  const addToPetPouch = async (pet) => {
    if (!getAccessToken()) {
      navigate("/login/user");
      return;
    }

    if (user?.role === "rehomer" || user?.role === "shelter_admin") {
      setActionMessage({
        type: "error",
        text: "Only adopters can submit interest for pets.",
      });
      return;
    }

    try {
      setActionMessage({ type: "", text: "" });
      await createAdoptionApplication({
        pet_id: Number(pet.id),
        message: `I'm interested in adopting ${pet.name}.`,
      });
      setAdoptedPets((prevPets) =>
        prevPets.includes(pet.id) ? prevPets : [...prevPets, pet.id],
      );
      showNotification(`Your adoption interest for ${pet.name} was sent.`);
    } catch (requestError) {
      console.error("Error adding to pet pouch:", requestError);
      setActionMessage({
        type: "error",
        text: requestError.message || "Failed to save your interest for this pet.",
      });
    }
  };

  const savePetToWishlist = async (pet) => {
    if (!getAccessToken()) {
      navigate("/login/user");
      return;
    }

    try {
      setActionMessage({ type: "", text: "" });
      const response = await addToWishlist(pet.id);
      setSavedPets((currentPets) =>
        currentPets.includes(pet.id) ? currentPets : [...currentPets, pet.id],
      );
      updatePetPouchCount();

      const message =
        response?.created === false
          ? `${pet.name} is already in your Pet Pouch.`
          : `${pet.name} was saved to your Pet Pouch.`;

      setActionMessage({
        type: response?.created === false ? "info" : "success",
        text: message,
      });
      showNotification(message);
    } catch (saveError) {
      console.error("Error saving pet to wishlist:", saveError);
      setActionMessage({
        type: "error",
        text: saveError.message || "Failed to save this pet to your pouch.",
      });
    }
  };

  const handleLike = (petId) => {
    setLikedPets((currentLikes) =>
      currentLikes.includes(petId)
        ? currentLikes.filter((id) => id !== petId)
        : [...currentLikes, petId],
    );
  };

  const uploadImageToCloudinary = async (file) => {
    const imageFormData = new FormData();
    imageFormData.append("file", file);
    imageFormData.append("upload_preset", "pets_presets");
    imageFormData.append("cloud_name", "dgdf0svqx");

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dgdf0svqx/image/upload",
      {
        method: "POST",
        body: imageFormData,
      },
    );

    if (!response.ok) {
      throw new Error("Image upload failed. Please try again.");
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((currentTag) => currentTag !== tag) : [...prev, tag],
    );
  };

  const handleUpdateImage = (event, petId) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (!file.type.match("image.*")) {
      setActionMessage({
        type: "error",
        text: "Please select an image file (JPEG, PNG).",
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setActionMessage({
        type: "error",
        text: "Image must be smaller than 5MB.",
      });
      return;
    }

    const uploadImage = async () => {
      try {
        setActionMessage({ type: "", text: "" });
        const uploadedImageUrl = await uploadImageToCloudinary(file);
        await updatePet(petId, { image_url: uploadedImageUrl });

        setPets((prevPets) =>
          prevPets.map((pet) =>
            pet.id === petId ? { ...pet, imageUrl: uploadedImageUrl } : pet,
          ),
        );
        setActionMessage({
          type: "success",
          text: "Pet image updated successfully.",
        });
      } catch (updateError) {
        console.error("Error saving image:", updateError);
        setActionMessage({
          type: "error",
          text: updateError.message || "Failed to update pet image.",
        });
      }
    };

    uploadImage();
  };

  const filteredGroupedPets = pets
    .filter(
      (pet) =>
        selectedTags.length === 0 ||
        selectedTags.every((tag) => (pet.personality || []).includes(tag)),
    )
    .filter((pet) => pet.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((groups, pet) => {
      const type = toTitleCase(pet.type || "other");
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(pet);
      return groups;
    }, {});

  return (
    <div style={{ display: "flex", padding: "20px" }}>
      <div
        style={{
          width: "280px",
          marginRight: "30px",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#2d3748",
            marginBottom: "16px",
            paddingBottom: "8px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          Filter by Personality
        </h2>

        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {personalityTags.map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                padding: "8px 12px",
                backgroundColor: "white",
                borderRadius: "8px",
                cursor: "pointer",
                border: "1px solid #e2e8f0",
                transition: "all 0.2s ease",
              }}
            >
              <label
                htmlFor={tag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "14px",
                  color: "#4a5568",
                  cursor: "pointer",
                  userSelect: "none",
                  width: "100%",
                }}
              >
                <input
                  type="checkbox"
                  id={tag}
                  checked={selectedTags.includes(tag)}
                  onChange={() => handleTagToggle(tag)}
                  style={{
                    marginRight: "10px",
                    accentColor: "#4299e1",
                    width: "16px",
                    height: "16px",
                    cursor: "pointer",
                  }}
                />
                {tag}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Search by pet name..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        {actionMessage.text && (
          <div
            style={{
              ...styles.statusMessage,
              ...(actionMessage.type === "error"
                ? styles.errorMessage
                : styles.infoMessage),
            }}
          >
            {actionMessage.text}
          </div>
        )}

        {loading ? (
          <p>Loading pets...</p>
        ) : loadError ? (
          <div style={{ ...styles.statusMessage, ...styles.errorMessage }}>
            {loadError}
          </div>
        ) : Object.keys(filteredGroupedPets).length === 0 ? (
          <div style={styles.emptyState}>
            No pets matched your current search or filters.
          </div>
        ) : (
          Object.entries(filteredGroupedPets).map(([type, petsArray]) => (
            <div key={type} style={{ marginBottom: "40px" }}>
              <h1 style={styles.categoryHeading}>{type}</h1>
              <div style={styles.petCardsContainer}>
                {petsArray.map((pet) => (
                  <div key={pet.id} style={styles.petCard}>
                    <img src={pet.imageUrl} alt={pet.name} style={styles.petImage} />
                    <div style={styles.petName}>
                      {pet.name}
                      <span
                        style={{
                          ...styles.heart,
                          color: likedPets.includes(pet.id) ? "orange" : "#FFA500",
                        }}
                        onClick={() => handleLike(pet.id)}
                      >
                        {likedPets.includes(pet.id) ? "\u2665" : "\uD83E\uDD0D"}
                      </span>
                    </div>

                    <p style={styles.petDescription}>{pet.breed}</p>
                    <p style={styles.petDescription}>{pet.age}</p>
                    <p style={styles.petPersonality}>
                      {(pet.personality || []).join(", ")}
                    </p>

                    {user?.role === "rehomer" && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleUpdateImage(event, pet.id)}
                        style={{ marginTop: "10px" }}
                      />
                    )}

                    <button
                      style={
                        adoptedPets.includes(pet.id)
                          ? styles.adoptedButton
                          : styles.petButton
                      }
                      onClick={() => addToPetPouch(pet)}
                      disabled={adoptedPets.includes(pet.id)}
                    >
                      {adoptedPets.includes(pet.id) ? "Requested" : "Adopt me"}
                    </button>
                    <button
                      style={styles.secondaryButton}
                      onClick={() => savePetToWishlist(pet)}
                    >
                      {savedPets.includes(pet.id) ? "Saved to Pet Pouch" : "Save to Pet Pouch"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {notification.show && (
        <div style={styles.notification}>
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>
            {notification.text}
          </span>
        </div>
      )}
    </div>
  );
};

export default PetsList;
