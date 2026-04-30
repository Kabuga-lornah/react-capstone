import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAccessToken,
  listWishlist,
  removeFromWishlist,
} from "../../services/api";
import { useAuth } from "./AuthContext";
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

const normalizeWishlistItem = (wishlistItem) => {
  const pet = wishlistItem.pet || {};
  const personality = Array.isArray(pet.personality)
    ? pet.personality
    : Array.isArray(pet.personality_traits)
      ? pet.personality_traits.map((trait) => toTitleCase(String(trait)))
      : [];

  return {
    ...wishlistItem,
    id: String(wishlistItem.id),
    petId: pet.id ? String(pet.id) : "",
    name: pet.name || "Unnamed Pet",
    breed: pet.breed || "Unknown",
    age: pet.age || "Unknown",
    type: pet.type || pet.species || "other",
    imageUrl: getPetImageUrl(pet),
    personality,
    addedAt: wishlistItem.added_at || "",
  };
};

const PetPouch = () => {
  const { loading: authLoading, userData } = useAuth();
  const { updatePetPouchCount } = useContext(PetPouchContext);
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState("");

  const hasToken = Boolean(getAccessToken());
  const isAdopter = userData?.role === "adopter";

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!hasToken) {
      navigate("/login/user", { replace: true });
    }
  }, [authLoading, hasToken, navigate]);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (authLoading || !hasToken || !isAdopter) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await listWishlist();
        const wishlistData = Array.isArray(response) ? response : response?.results || [];
        setWishlistItems(wishlistData.map(normalizeWishlistItem));
      } catch (fetchError) {
        console.error("Error fetching wishlist:", fetchError);
        setError(fetchError.message || "Failed to load your pet pouch.");
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [authLoading, hasToken, isAdopter]);

  const handleRemoveSavedPet = async (wishlistId) => {
    try {
      setRemovingId(wishlistId);
      setError("");
      await removeFromWishlist(wishlistId);
      setWishlistItems((currentItems) =>
        currentItems.filter((item) => item.id !== wishlistId),
      );
      updatePetPouchCount();
    } catch (removeError) {
      console.error("Error removing saved pet:", removeError);
      setError(removeError.message || "Failed to remove this pet from your pouch.");
    } finally {
      setRemovingId("");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p>Loading your pet pouch...</p>
      </div>
    );
  }

  if (!authLoading && hasToken && !isAdopter) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p style={{ color: "#c62828" }}>
          Access denied. Only adopters can view the Pet Pouch.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "20px" }}>Your Pet Pouch</h1>

      {error && (
        <div
          style={{
            backgroundColor: "#ffebee",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "20px",
            border: "1px solid #ffcdd2",
            color: "#c62828",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {!error && wishlistItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
            No saved pets yet.
          </p>
          <p style={{ marginBottom: "20px", color: "#555" }}>
            Save pets to your pouch to keep track of the ones you love.
          </p>
          <button
            onClick={() => navigate("/pets")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#FFA500",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Browse Pets to Save
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "25px",
            marginTop: "20px",
          }}
        >
          {wishlistItems.map((wishlistItem) => (
            <div
              key={wishlistItem.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "20px",
                position: "relative",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "200px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  borderRadius: "8px",
                  marginBottom: "15px",
                  backgroundColor: "#f5f5f5",
                }}
              >
                <img
                  src={wishlistItem.imageUrl}
                  alt={wishlistItem.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: "1.4rem" }}>
                {wishlistItem.name}
              </h3>
              <p style={{ margin: "5px 0" }}>
                <strong>Breed:</strong> {wishlistItem.breed}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Age:</strong> {wishlistItem.age}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Type:</strong> {toTitleCase(wishlistItem.type)}
              </p>
              {wishlistItem.addedAt && (
                <p style={{ margin: "5px 0" }}>
                  <strong>Saved:</strong>{" "}
                  {new Date(wishlistItem.addedAt).toLocaleDateString()}
                </p>
              )}
              <div style={{ margin: "10px 0" }}>
                {wishlistItem.personality.map((trait, index) => (
                  <span
                    key={`${wishlistItem.id}-${trait}-${index}`}
                    style={{
                      display: "inline-block",
                      backgroundColor: "#f5f5f5",
                      color: "#333",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      marginRight: "5px",
                      marginBottom: "5px",
                      border: "1px solid #ddd",
                    }}
                  >
                    {trait}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <button
                  onClick={() => navigate(`/pet/${wishlistItem.petId}`)}
                  style={{
                    backgroundColor: "#FFA500",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  View Pet Details
                </button>
                <button
                  onClick={() => handleRemoveSavedPet(wishlistItem.id)}
                  disabled={removingId === wishlistItem.id}
                  style={{
                    backgroundColor: "#fff5f5",
                    color: "#c62828",
                    border: "1px solid #ffcdd2",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  {removingId === wishlistItem.id ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PetPouch;
