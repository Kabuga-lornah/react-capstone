import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  approveApplication,
  deletePet,
  getAccessToken,
  listMyPets,
  listReceivedApplications,
  rejectApplication,
} from "../../services/api";
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

const normalizePet = (pet) => ({
  ...pet,
  id: String(pet.id),
  type: pet.type || pet.species || "other",
  personality: Array.isArray(pet.personality)
    ? pet.personality
    : Array.isArray(pet.personality_traits)
      ? pet.personality_traits.map((trait) => toTitleCase(String(trait)))
      : [],
  imageUrl: getPetImageUrl(pet),
  adopted:
    pet.adopted !== undefined
      ? pet.adopted
      : pet.status
        ? pet.status !== "available"
        : false,
});

const normalizeApplication = (application) => {
  const applicant = application.applicant || {};
  const pet = normalizePet(application.pet || {});
  const applicantName = `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim();

  return {
    ...application,
    id: String(application.id),
    petId: pet.id,
    petName: pet.name || "Unnamed Pet",
    petImageUrl: pet.imageUrl || "/default-pet.jpg",
    userName: applicantName || applicant.username || applicant.email || "Anonymous",
    userEmail: applicant.email || "No email",
    userPhone: applicant.phone_number || "No phone",
    visitDate: application.preferred_visit_date || "",
    message: application.message || `Interested in adopting ${pet.name || "this pet"}`,
    status: application.status || "pending",
  };
};

const RehomerDashboard = () => {
  const navigate = useNavigate();
  const { userData, loading: authLoading } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const petQuotes = [
    "Helping pets find their fur-ever homes, one adoption at a time!",
    "Remember: You're not just rehoming pets, you're matchmaking for life!",
    "Pro tip: The best way to keep a pet is to put it in your heart, not your pocket.",
    "Did you know? Dogs have owners, cats have staff, and you're the HR department!",
    "Warning: Rehoming pets may cause spontaneous smiles and warm fuzzies.",
    "You're doing a pawsome job! Every adoption creates two happy endings.",
  ];

  const [currentQuote] = useState(
    petQuotes[Math.floor(Math.random() * petQuotes.length)],
  );

  const hasToken = Boolean(getAccessToken());
  const isAllowedRole = userData?.role === "rehomer" || userData?.role === "shelter_admin";

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!hasToken) {
      navigate("/login/rehomer", { replace: true });
    }
  }, [authLoading, hasToken, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !hasToken || !isAllowedRole) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const [petsResponse, applicationsResponse] = await Promise.all([
          listMyPets(),
          listReceivedApplications(),
        ]);

        const petsData = Array.isArray(petsResponse) ? petsResponse : petsResponse?.results || [];
        const applicationsData = Array.isArray(applicationsResponse)
          ? applicationsResponse
          : applicationsResponse?.results || [];

        setPets(petsData.map(normalizePet));
        setRequests(applicationsData.map(normalizeApplication));
      } catch (fetchError) {
        console.error("Error fetching dashboard data:", fetchError);
        setError(fetchError.message || "Failed to load your dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, hasToken, isAllowedRole]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );

  const handleApprove = async (petId, requestId) => {
    try {
      setError("");
      setSuccess("");
      await approveApplication(requestId);

      setPets((prevPets) =>
        prevPets.map((pet) =>
          pet.id === petId ? { ...pet, adopted: true, status: "adopted" } : pet,
        ),
      );

      setRequests((prevRequests) =>
        prevRequests.map((request) => {
          if (request.id === requestId) {
            return { ...request, status: "approved" };
          }

          if (request.petId === petId && request.status === "pending") {
            return { ...request, status: "rejected" };
          }

          return request;
        }),
      );

      setSuccess("Adoption approved successfully.");
    } catch (approveError) {
      console.error("Error approving application:", approveError);
      setError(approveError.message || "Failed to approve adoption.");
    }
  };

  const handleReject = async (requestId) => {
    try {
      setError("");
      setSuccess("");
      await rejectApplication(requestId);

      setRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.id === requestId ? { ...request, status: "rejected" } : request,
        ),
      );

      setSuccess("Application rejected.");
    } catch (rejectError) {
      console.error("Error rejecting application:", rejectError);
      setError(rejectError.message || "Failed to reject application.");
    }
  };

  const handleDelete = async (petId) => {
    const confirmed = window.confirm("Are you sure you want to delete this pet?");
    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await deletePet(petId);
      setPets((prevPets) => prevPets.filter((pet) => pet.id !== petId));
      setRequests((prevRequests) => prevRequests.filter((request) => request.petId !== petId));
      setSuccess("Pet deleted successfully.");
    } catch (deleteError) {
      console.error("Error deleting pet:", deleteError);
      setError(deleteError.message || "Failed to delete pet.");
    }
  };

  if (!authLoading && hasToken && !isAllowedRole) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBanner}>Access denied. Only rehomers or shelter admins can view this dashboard.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.welcomeBanner}>
        <h1 style={styles.title}>Welcome to Your Rehomer Dashboard</h1>
        <p style={styles.subtitle}>
          Your mission: Transform "just pets" into beloved family members
        </p>
        <div style={styles.quoteBox}>
          <p style={styles.quote}>"{currentQuote}"</p>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {success && <div style={styles.successBanner}>{success}</div>}

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{pets.length}</h3>
          <p style={styles.statLabel}>Pets Listed</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{pets.filter((pet) => pet.adopted).length}</h3>
          <p style={styles.statLabel}>Success Stories</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{pendingRequests.length}</h3>
          <p style={styles.statLabel}>Pending Requests</p>
        </div>
      </div>

      <div style={styles.header}>
        <button onClick={() => navigate("/add-pet")} style={styles.addButton}>
          Add New Pet
        </button>

        <button
          onClick={() => setShowRequests(!showRequests)}
          style={styles.requestsButton}
        >
          {showRequests
            ? "Hide Requests"
            : `View Requests (${pendingRequests.length})`}
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingState}>
          <p>Loading your furry friends...</p>
        </div>
      ) : showRequests ? (
        <div style={styles.requestsSection}>
          <h2 style={styles.sectionTitle}>Adoption Requests</h2>
          {requests.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No adoption applications yet.</p>
              <p>Your future matches will appear here once adopters start applying.</p>
            </div>
          ) : (
            <div style={styles.requestsList}>
              {requests.map((request) => (
                <div key={request.id} style={styles.requestCard}>
                  <div style={styles.requestHeader}>
                    <img
                      src={request.petImageUrl}
                      alt={request.petName}
                      style={styles.requestPetImage}
                    />
                    <div>
                      <h3>{request.petName}</h3>
                      <p><strong>Requested by:</strong> {request.userName}</p>
                    </div>
                  </div>

                  <div style={styles.requestDetails}>
                    <p><strong>Contact:</strong> {request.userPhone} | {request.userEmail}</p>
                    <p>
                      <strong>Visit Date:</strong>{" "}
                      {request.visitDate ? new Date(request.visitDate).toLocaleDateString() : "Not provided"}
                    </p>
                    <p><strong>Message:</strong> "{request.message}"</p>
                    <p><strong>Status:</strong> {toTitleCase(request.status)}</p>
                  </div>

                  {request.status === "pending" && (
                    <div style={styles.requestActions}>
                      <button
                        onClick={() => handleApprove(request.petId, request.id)}
                        style={styles.approveButton}
                      >
                        Approve Adoption
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        style={styles.rejectButton}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : pets.length === 0 ? (
        <div style={styles.emptyState}>
          <h2 style={styles.sectionTitle}>Your Pets</h2>
          <p>No pets listed yet. The perfect home is waiting - add your first pet!</p>
          <button
            onClick={() => navigate("/add-pet")}
            style={styles.ctaButton}
          >
            Start Your First Listing
          </button>
        </div>
      ) : (
        <div style={styles.petsSection}>
          <h2 style={styles.sectionTitle}>Your Current Listings</h2>
          <div style={styles.petsGrid}>
            {pets.map((pet) => (
              <div key={pet.id} style={styles.petCard}>
                <img
                  src={pet.imageUrl || "/default-pet.jpg"}
                  alt={pet.name}
                  style={styles.petImage}
                />
                <div style={styles.petInfo}>
                  <h3>{pet.name}</h3>
                  <p><strong>Breed:</strong> {pet.breed || "Unknown"}</p>
                  <p><strong>Age:</strong> {pet.age || "Unknown"}</p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      style={{
                        color: pet.adopted ? "green" : "orange",
                        fontWeight: "bold",
                      }}
                    >
                      {pet.adopted ? "Adopted" : "Available"}
                    </span>
                  </p>
                  {!pet.adopted && (
                    <button
                      onClick={() => handleDelete(pet.id)}
                      style={styles.deleteButton}
                    >
                      Delete Pet
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "'Arial', sans-serif",
  },
  welcomeBanner: {
    backgroundColor: "#FFF8E1",
    padding: "25px",
    borderRadius: "10px",
    marginBottom: "30px",
    textAlign: "center",
    borderLeft: "5px solid #FFA500",
  },
  title: {
    color: "#333",
    marginBottom: "10px",
    fontSize: "28px",
  },
  subtitle: {
    color: "#666",
    fontSize: "18px",
    marginBottom: "20px",
  },
  quoteBox: {
    backgroundColor: "#FFF",
    padding: "15px",
    borderRadius: "8px",
    margin: "20px auto",
    maxWidth: "600px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    borderLeft: "3px solid #FFA500",
  },
  quote: {
    fontStyle: "italic",
    color: "#555",
    margin: "0",
  },
  statsContainer: {
    display: "flex",
    justifyContent: "space-around",
    margin: "30px 0",
    flexWrap: "wrap",
    gap: "15px",
  },
  statCard: {
    backgroundColor: "#f5f5f5",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
    minWidth: "150px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  statNumber: {
    fontSize: "32px",
    color: "#FFA500",
    margin: "0",
  },
  statLabel: {
    color: "#666",
    margin: "5px 0 0",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "15px",
  },
  addButton: {
    backgroundColor: "#FFA500",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
  },
  requestsButton: {
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
  },
  sectionTitle: {
    color: "#333",
    marginBottom: "20px",
    fontSize: "24px",
    borderBottom: "2px solid #FFA500",
    paddingBottom: "10px",
  },
  petsSection: {
    marginTop: "20px",
  },
  petsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "25px",
  },
  petCard: {
    backgroundColor: "#fff",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
  },
  petImage: {
    width: "100%",
    height: "180px",
    objectFit: "contain",
    borderRadius: "8px",
    marginBottom: "10px",
  },
  petInfo: {
    padding: "15px",
  },
  requestsSection: {
    marginTop: "20px",
  },
  requestsList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  requestCard: {
    backgroundColor: "#fff",
    padding: "15px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },
  requestHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "10px",
  },
  requestPetImage: {
    width: "100px",
    height: "100px",
    borderRadius: "10%",
    objectFit: "cover",
    marginRight: "15px",
  },
  requestDetails: {
    marginBottom: "10px",
  },
  requestActions: {
    marginTop: "10px",
    textAlign: "right",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  approveButton: {
    backgroundColor: "#FFA500",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
  },
  rejectButton: {
    backgroundColor: "#e53e3e",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "14px",
  },
  deleteButton: {
    backgroundColor: "#e53e3e",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: "10px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    backgroundColor: "#f9f9f9",
    borderRadius: "10px",
    margin: "20px 0",
  },
  ctaButton: {
    backgroundColor: "#FFA500",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "20px",
  },
  loadingState: {
    textAlign: "center",
    padding: "40px",
    color: "#666",
  },
  errorBanner: {
    backgroundColor: "#fff5f5",
    color: "#c53030",
    border: "1px solid #feb2b2",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  successBanner: {
    backgroundColor: "#f0fff4",
    color: "#2f855a",
    border: "1px solid #9ae6b4",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
};

export default RehomerDashboard;
