import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken, listMyApplications } from "../../services/api";
import { useAuth } from "./AuthContext";

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

const normalizeApplication = (application) => {
  const pet = application.pet || {};

  return {
    ...application,
    id: String(application.id),
    petId: pet.id ? String(pet.id) : String(application.id),
    petName: pet.name || "Unnamed Pet",
    petType: pet.type || pet.species || "other",
    petBreed: pet.breed || "Unknown",
    petAge: pet.age || "Unknown",
    petImageUrl: getPetImageUrl(pet),
    status: application.status || "pending",
    message: application.message || "",
    visitDate: application.preferred_visit_date || "",
    createdAt: application.created_at || "",
  };
};

const MyListings = () => {
  const navigate = useNavigate();
  const { loading: authLoading, userData } = useAuth();
  const [adoptionRequests, setAdoptionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("myRequests");

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
    const fetchApplications = async () => {
      if (authLoading || !hasToken || !isAdopter) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await listMyApplications();
        const requests = Array.isArray(response) ? response : response?.results || [];
        setAdoptionRequests(requests.map(normalizeApplication));
      } catch (fetchError) {
        console.error("Error fetching adoption requests:", fetchError);
        setError(fetchError.message || "Failed to load your adoption applications.");
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [authLoading, hasToken, isAdopter]);

  const pendingCount = useMemo(
    () => adoptionRequests.filter((request) => request.status === "pending").length,
    [adoptionRequests],
  );

  if (!authLoading && hasToken && !isAdopter) {
    return (
      <div style={styles.container}>
        <p style={styles.errorMessage}>
          Access denied. Only adopters can view this page.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>My Listings</h1>

      <div style={styles.tabContainer}>
        <button
          style={activeTab === "notifications" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("notifications")}
        >
          Notifications
        </button>
        <button
          style={activeTab === "myRequests" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("myRequests")}
        >
          My Adoption Requests
          {pendingCount > 0 && <span style={styles.badge}>{pendingCount}</span>}
        </button>
      </div>

      {activeTab === "notifications" && (
        <div style={styles.notificationsContainer}>
          <p style={styles.emptyMessage}>
            Notifications are not connected to the Django API yet. Your current adoption request statuses are available in the "My Adoption Requests" tab.
          </p>
        </div>
      )}

      {activeTab === "myRequests" && (
        <div style={styles.requestsContainer}>
          {loading ? (
            <p>Loading adoption requests...</p>
          ) : error ? (
            <p style={styles.errorMessage}>{error}</p>
          ) : adoptionRequests.length === 0 ? (
            <p style={styles.emptyMessage}>No adoption applications yet.</p>
          ) : (
            <div style={styles.adoptionRequestsList}>
              {adoptionRequests.map((request) => (
                <div key={request.id} style={styles.adoptionRequestCard}>
                  <div style={styles.requestHeader}>
                    <img
                      src={request.petImageUrl}
                      alt={request.petName}
                      style={styles.petImage}
                    />
                    <div>
                      <h3>Pet Name: {request.petName}</h3>
                      <p>Breed: {request.petBreed}</p>
                      <p>Age: {request.petAge}</p>
                    </div>
                  </div>
                  <p>Message: {request.message || "No message provided."}</p>
                  <p>
                    Status:{" "}
                    <strong style={{ color: request.status === "approved" ? "#2e7d32" : request.status === "rejected" ? "#c62828" : "#ef6c00" }}>
                      {toTitleCase(request.status)}
                    </strong>
                  </p>
                  {request.visitDate && (
                    <p>Preferred Visit Date: {new Date(request.visitDate).toLocaleDateString()}</p>
                  )}
                  <div style={styles.requestActions}>
                    <button
                      style={styles.viewButton}
                      onClick={() => navigate(`/pet/${request.petId}`)}
                    >
                      View Pet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    textAlign: "center",
    color: "#FFA500",
    marginBottom: "30px",
  },
  tabContainer: {
    display: "flex",
    marginBottom: "20px",
    borderBottom: "1px solid #FFA500",
  },
  tab: {
    padding: "10px 20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    position: "relative",
    color: "#FFA500",
  },
  activeTab: {
    padding: "10px 20px",
    background: "none",
    border: "none",
    borderBottom: "2px solid #FFA500",
    cursor: "pointer",
    fontWeight: "bold",
    position: "relative",
    color: "#FFA500",
  },
  badge: {
    position: "absolute",
    top: "-5px",
    right: "5px",
    backgroundColor: "#FFA500",
    color: "white",
    borderRadius: "50%",
    padding: "2px 6px",
    fontSize: "12px",
  },
  notificationsContainer: {
    backgroundColor: "#fffaf0",
    borderRadius: "8px",
    padding: "20px",
  },
  emptyMessage: {
    textAlign: "center",
    color: "#FFA500",
  },
  errorMessage: {
    textAlign: "center",
    color: "#c62828",
  },
  requestsContainer: {
    padding: "20px",
  },
  adoptionRequestsList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  adoptionRequestCard: {
    border: "1px solid #FFA500",
    padding: "15px",
    marginBottom: "10px",
    borderRadius: "8px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
  },
  requestHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "12px",
  },
  petImage: {
    width: "90px",
    height: "90px",
    objectFit: "cover",
    borderRadius: "8px",
    backgroundColor: "#f5f5f5",
  },
  requestActions: {
    marginTop: "12px",
    display: "flex",
    justifyContent: "flex-end",
  },
  viewButton: {
    backgroundColor: "#FFA500",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

export default MyListings;
