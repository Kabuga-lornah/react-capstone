import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAccessToken,
  listConversations,
  listMyApplications,
  listWishlist,
  removeFromWishlist,
} from "../../services/api";
import { useAuth } from "./AuthContext";
import { PetPouchContext } from "./PetPouchContext";

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

  return {
    ...wishlistItem,
    id: String(wishlistItem.id),
    petId: pet.id ? String(pet.id) : "",
    name: pet.name || "Unnamed Pet",
    breed: pet.breed || "Unknown breed",
    imageUrl: getPetImageUrl(pet),
  };
};

const getPetProgress = (petId, applications, conversations) => {
  const application = applications.find((item) => item.petId === petId);
  const conversation = conversations.find((item) => item.petId === petId);

  if (application?.status === "approved") {
    return { label: "Approved", tone: "#1e7b48", bg: "#edf9ef" };
  }

  if (application?.status === "rejected") {
    return { label: "Request not approved", tone: "#c53030", bg: "#fff1f1" };
  }

  if (application?.status === "withdrawn") {
    return { label: "Interest canceled", tone: "#7a6b57", bg: "#f4f1eb" };
  }

  if (application?.visitStatus === "agreed") {
    return { label: "Visit agreed", tone: "#1e7b48", bg: "#edf9ef" };
  }

  if (conversation?.unreadCount > 0) {
    return { label: "Rehomer replied", tone: "#1d4ed8", bg: "#eef4ff" };
  }

  if (application?.visitStatus === "proposed") {
    return { label: "Visit plan saved", tone: "#c16f00", bg: "#fff4df" };
  }

  if (conversation?.lastMessageIsMine) {
    return { label: "Waiting for reply", tone: "#8b7049", bg: "#fff8ef" };
  }

  if (conversation) {
    return { label: "Chat started", tone: "#1d4ed8", bg: "#eef4ff" };
  }

  if (application) {
    return { label: "Requested", tone: "#c16f00", bg: "#fff4df" };
  }

  return { label: "Saved for later", tone: "#8b7049", bg: "#fff8ef" };
};

const PetPouch = () => {
  const { loading: authLoading, userData } = useAuth();
  const { updatePetPouchCount } = useContext(PetPouchContext);
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [applications, setApplications] = useState([]);
  const [conversations, setConversations] = useState([]);
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
    const fetchPetPouchData = async () => {
      if (authLoading || !hasToken || !isAdopter) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [wishlistResponse, applicationsResponse, conversationsResponse] = await Promise.all([
          listWishlist(),
          listMyApplications().catch(() => []),
          listConversations().catch(() => []),
        ]);

        const wishlistData = Array.isArray(wishlistResponse) ? wishlistResponse : wishlistResponse?.results || [];
        const applicationData = Array.isArray(applicationsResponse)
          ? applicationsResponse
          : applicationsResponse?.results || [];
        const conversationData = Array.isArray(conversationsResponse)
          ? conversationsResponse
          : conversationsResponse?.results || [];

        setWishlistItems(wishlistData.map(normalizeWishlistItem));
        setApplications(
          applicationData.map((application) => ({
            petId: application?.pet?.id ? String(application.pet.id) : "",
            status: application?.status || "pending",
            visitStatus: application?.visit_status || "not_started",
            preferredVisitDate: application?.preferred_visit_date || "",
            meetingPreference: application?.meeting_preference || "",
            meetingLocationNotes: application?.meeting_location_notes || "",
          })),
        );
        setConversations(
          conversationData.map((conversation) => ({
            petId: conversation?.pet?.id ? String(conversation.pet.id) : "",
            unreadCount: Number(conversation?.unread_count || 0),
            lastMessageIsMine: Boolean(conversation?.last_message?.is_mine),
          })),
        );
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load your pet pouch.");
      } finally {
        setLoading(false);
      }
    };

    fetchPetPouchData();
  }, [authLoading, hasToken, isAdopter]);

  const handleRemoveSavedPet = async (wishlistId) => {
    try {
      setRemovingId(wishlistId);
      setError("");
      await removeFromWishlist(wishlistId);
      setWishlistItems((currentItems) => currentItems.filter((item) => item.id !== wishlistId));
      updatePetPouchCount();
    } catch (removeError) {
      setError(removeError.message || "Failed to remove this pet from your pouch.");
    } finally {
      setRemovingId("");
    }
  };

  if (loading) {
    return <div style={styles.state}>Loading your pet pouch...</div>;
  }

  if (!authLoading && hasToken && !isAdopter) {
    return <div style={styles.stateError}>Access denied. Only adopters can view the Pet Pouch.</div>;
  }

  return (
    <div style={styles.shell}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Saved pets</p>
          <h1 style={styles.title}>Pet Pouch</h1>
        </div>
        <span style={styles.countPill}>{wishlistItems.length}</span>
      </div>

      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      {!error && wishlistItems.length === 0 ? (
        <div style={styles.emptyCard}>
          <p style={styles.emptyTitle}>No saved pets yet.</p>
          <p style={styles.emptyCopy}>Tap the heart on a pet to keep it here.</p>
          <button onClick={() => navigate("/pets")} style={styles.primaryButton}>
            Browse Pets
          </button>
        </div>
      ) : (
        <div style={styles.list}>
          {wishlistItems.map((wishlistItem) => {
            const progress = getPetProgress(wishlistItem.petId, applications, conversations);

            return (
              <article key={wishlistItem.id} style={styles.row}>
                <button
                  type="button"
                  style={styles.rowMain}
                  onClick={() => navigate(`/pet/${wishlistItem.petId}`)}
                >
                  <img src={wishlistItem.imageUrl} alt={wishlistItem.name} style={styles.image} />
                  <div style={styles.meta}>
                    <strong style={styles.name}>{wishlistItem.name}</strong>
                    <span style={styles.breed}>{wishlistItem.breed}</span>
                    <span
                      style={{
                        ...styles.progressPill,
                        background: progress.bg,
                        color: progress.tone,
                      }}
                    >
                      {progress.label}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveSavedPet(wishlistItem.id)}
                  disabled={removingId === wishlistItem.id}
                  style={styles.removeButton}
                  aria-label={`Remove ${wishlistItem.name} from Pet Pouch`}
                >
                  {removingId === wishlistItem.id ? "..." : "x"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  shell: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "18px 14px 110px",
    background:
      "radial-gradient(circle at top right, rgba(255, 206, 120, 0.18), transparent 28%), linear-gradient(180deg, #fff9f1 0%, #fffefb 100%)",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "16px",
  },
  eyebrow: {
    margin: "0 0 4px",
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#d97100",
  },
  title: {
    margin: 0,
    color: "#2c1700",
    fontSize: "1.7rem",
  },
  countPill: {
    minWidth: "40px",
    height: "40px",
    borderRadius: "999px",
    background: "#fff1d8",
    color: "#c66c00",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
  errorBanner: {
    background: "#fff1f1",
    color: "#c62828",
    border: "1px solid #f2bdbd",
    borderRadius: "16px",
    padding: "12px 14px",
    marginBottom: "14px",
  },
  emptyCard: {
    background: "rgba(255,255,255,0.96)",
    borderRadius: "22px",
    border: "1px solid rgba(255,185,90,0.2)",
    padding: "24px 18px",
    textAlign: "center",
    boxShadow: "0 12px 28px rgba(125, 88, 32, 0.06)",
  },
  emptyTitle: {
    margin: "0 0 8px",
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#2c1700",
  },
  emptyCopy: {
    margin: "0 0 16px",
    color: "#7d6542",
  },
  primaryButton: {
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #ffab16 0%, #ff8600 100%)",
    color: "#fff",
    padding: "12px 16px",
    fontWeight: 800,
    cursor: "pointer",
  },
  list: {
    display: "grid",
    gap: "10px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: "12px",
    padding: "10px",
    border: "1px solid rgba(255,185,90,0.18)",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 8px 22px rgba(125, 88, 32, 0.05)",
  },
  rowMain: {
    display: "grid",
    gridTemplateColumns: "70px 1fr",
    alignItems: "center",
    gap: "12px",
    border: "none",
    background: "transparent",
    padding: 0,
    textAlign: "left",
    cursor: "pointer",
  },
  image: {
    width: "70px",
    height: "70px",
    borderRadius: "14px",
    objectFit: "cover",
    background: "#fff2dc",
  },
  meta: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  name: {
    color: "#2c1700",
    fontSize: "1rem",
  },
  breed: {
    color: "#8b7049",
    fontSize: "0.86rem",
  },
  progressPill: {
    width: "fit-content",
    marginTop: "2px",
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "0.72rem",
    fontWeight: 800,
  },
  removeButton: {
    border: "none",
    background: "#fff4e1",
    color: "#c66c00",
    width: "42px",
    height: "42px",
    borderRadius: "999px",
    fontSize: "1rem",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  state: {
    textAlign: "center",
    padding: "40px 16px",
  },
  stateError: {
    textAlign: "center",
    padding: "40px 16px",
    color: "#c62828",
  },
};

export default PetPouch;
