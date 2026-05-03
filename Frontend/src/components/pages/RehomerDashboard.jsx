import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  approveApplication,
  deletePet,
  getAccessToken,
  listMyPets,
  listReceivedApplications,
  rejectApplication,
} from "../../services/api";
import { useAuth } from "./AuthContext";
import "./RehomerDashboard.css";

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

const normalizeStatus = (status) => {
  if (!status) {
    return "available";
  }

  return String(status).toLowerCase();
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
  status: normalizeStatus(pet.status),
  adopted:
    pet.adopted !== undefined
      ? pet.adopted
      : pet.status
        ? normalizeStatus(pet.status) === "adopted"
        : false,
  locationLabel: pet.location || pet.city || pet.county || "Location not listed",
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
    petType: pet.type,
    petStatus: pet.status,
    petImageUrl: pet.imageUrl || "/default-pet.jpg",
    petLocation: pet.locationLabel,
    userName: applicantName || applicant.username || applicant.email || "Anonymous",
    userEmail: applicant.email || "No email",
    userPhone: applicant.phone_number || "No phone",
    visitDate: application.preferred_visit_date || "",
    message: application.message || `Interested in adopting ${pet.name || "this pet"}`,
    status: normalizeStatus(application.status || "pending"),
  };
};

const getStatusTone = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "approved" || normalizedStatus === "adopted") {
    return "success";
  }

  if (normalizedStatus === "pending") {
    return "warning";
  }

  if (normalizedStatus === "rejected" || normalizedStatus === "unavailable") {
    return "danger";
  }

  return "neutral";
};

const getCareBadges = (pet) => {
  const badges = [];

  if (pet.energy_level && pet.energy_level !== "unknown") {
    badges.push(`Energy: ${toTitleCase(pet.energy_level)}`);
  }

  if (pet.care_level && pet.care_level !== "unknown") {
    badges.push(`Care: ${toTitleCase(pet.care_level)}`);
  }

  if (pet.good_with_children && pet.good_with_children !== "unknown") {
    badges.push(`Children: ${toTitleCase(pet.good_with_children)}`);
  }

  if (pet.apartment_friendly && pet.apartment_friendly !== "unknown") {
    badges.push(`Apartment: ${toTitleCase(pet.apartment_friendly)}`);
  }

  return badges.slice(0, 3);
};

const dashboardQuotes = [
  "Every thoughtful listing brings the right family one step closer.",
  "Clear photos and honest notes help great adopters say yes with confidence.",
  "Safe rehoming is not about speed. It is about fit, trust, and long-term care.",
  "The best adoption journeys start with a kind listing and a patient conversation.",
];

const dailyTips = [
  "Add at least one bright, face-forward photo to build trust quickly.",
  "Mention temperament honestly so adopters know what kind of support to expect.",
  "Highlight vaccination and deworming details whenever you have them.",
  "Pets settling into a new home may need a few calm days before showing their full personality.",
];

const quickActions = [
  {
    id: "add",
    title: "Add pet listing",
    description: "Create a new listing with photos, care notes, and compatibility details.",
    actionLabel: "Add Pet",
    onClick: (navigate, updateTab) => {
      updateTab("my-pets");
      navigate("/add-pet");
    },
  },
  {
    id: "requests",
    title: "Review requests",
    description: "Check pending adoption applications and respond thoughtfully.",
    actionLabel: "Open Requests",
    onClick: (_, updateTab) => updateTab("requests"),
  },
  {
    id: "public",
    title: "View public pets",
    description: "See how adopters experience the browsing side of your listings.",
    actionLabel: "Browse Pets",
    onClick: (navigate) => navigate("/pets"),
  },
  {
    id: "profiles",
    title: "Improve pet profiles",
    description: "Use specific photos, temperament notes, and care details to strengthen trust.",
    actionLabel: "See Tips",
    onClick: (_, updateTab) => updateTab("tips"),
  },
];

const rehomerTips = [
  {
    title: "Add clear photos",
    body: "Use well-lit photos that show the pet's face, posture, and coat condition.",
  },
  {
    title: "Be honest about temperament",
    body: "Helpful details about energy, shyness, or training needs create better long-term matches.",
  },
  {
    title: "Ask about the home environment",
    body: "A quick conversation about space, children, and other pets often prevents poor matches.",
  },
  {
    title: "Confirm health details",
    body: "Vaccination, deworming, and spay or neuter information helps adopters feel prepared.",
  },
  {
    title: "Give pets adjustment time",
    body: "Encourage adopters to expect a slow settling-in period and a calm first week.",
  },
  {
    title: "Never rush an adoption",
    body: "A slightly slower process is worth it when it leads to a safer, more stable home.",
  },
];

const tabParamToDashboardTab = (tabParam) => {
  if (tabParam === "pets") {
    return "my-pets";
  }

  if (tabParam === "requests") {
    return "requests";
  }

  if (tabParam === "tips") {
    return "tips";
  }

  return "overview";
};

const dashboardTabToTabParam = (tab) => {
  if (tab === "my-pets") {
    return "pets";
  }

  if (tab === "requests" || tab === "tips") {
    return tab;
  }

  return "overview";
};

const RehomerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userData, loading: authLoading } = useAuth();
  const [pets, setPets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState(
    tabParamToDashboardTab(searchParams.get("tab")),
  );
  const [petFilter, setPetFilter] = useState("all");
  const [requestFilter, setRequestFilter] = useState("all");
  const [petPendingDelete, setPetPendingDelete] = useState(null);
  const [isDeletingPet, setIsDeletingPet] = useState(false);

  const hasToken = Boolean(getAccessToken());
  const isAllowedRole = userData?.role === "rehomer" || userData?.role === "shelter_admin";

  const welcomeName =
    userData?.first_name ||
    userData?.displayName?.split(" ")?.[0] ||
    (userData?.role === "shelter_admin" ? "Shelter Team" : "Rehomer");

  const currentQuote = useMemo(
    () => dashboardQuotes[new Date().getDate() % dashboardQuotes.length],
    [],
  );

  const dailyTip = useMemo(
    () => dailyTips[new Date().getDay() % dailyTips.length],
    [],
  );

  const updateActiveTab = (nextTab) => {
    setActiveTab(nextTab);
    const nextTabParam = dashboardTabToTabParam(nextTab);
    setSearchParams(
      nextTabParam === "overview" ? {} : { tab: nextTabParam },
      { replace: true },
    );
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!hasToken) {
      navigate("/login/rehomer", { replace: true });
    }
  }, [authLoading, hasToken, navigate]);

  useEffect(() => {
    const nextTab = tabParamToDashboardTab(searchParams.get("tab"));
    setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
  }, [searchParams]);

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

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSuccess("");
    }, 3200);

    return () => clearTimeout(timer);
  }, [success]);

  const stats = useMemo(() => {
    const totalPets = pets.length;
    const availablePets = pets.filter((pet) => pet.status === "available").length;
    const pendingRequests = requests.filter((request) => request.status === "pending").length;
    const approvedApplications = requests.filter((request) => request.status === "approved").length;
    const adoptedPets = pets.filter((pet) => pet.status === "adopted" || pet.adopted).length;
    const processedRequests = requests.filter((request) => request.status !== "pending").length;
    const responseRate = requests.length
      ? Math.round((processedRequests / requests.length) * 100)
      : 0;

    return {
      totalPets,
      availablePets,
      pendingRequests,
      approvedApplications,
      adoptedPets,
      responseRate,
    };
  }, [pets, requests]);

  const filteredPets = useMemo(() => {
    if (petFilter === "all") {
      return pets;
    }

    return pets.filter((pet) => pet.status === petFilter);
  }, [petFilter, pets]);

  const filteredRequests = useMemo(() => {
    if (requestFilter === "all") {
      return requests;
    }

    return requests.filter((request) => request.status === requestFilter);
  }, [requestFilter, requests]);

  const recentPets = useMemo(() => pets.slice(0, 3), [pets]);
  const recentRequests = useMemo(() => requests.slice(0, 3), [requests]);

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
    try {
      setIsDeletingPet(true);
      setError("");
      setSuccess("");
      await deletePet(petId);
      setPets((prevPets) => prevPets.filter((pet) => pet.id !== petId));
      setRequests((prevRequests) => prevRequests.filter((request) => request.petId !== petId));
      setPetPendingDelete(null);
      setSuccess("Pet deleted successfully.");
    } catch (deleteError) {
      console.error("Error deleting pet:", deleteError);
      setError(deleteError.message || "Failed to delete pet.");
    } finally {
      setIsDeletingPet(false);
    }
  };

  if (!authLoading && hasToken && !isAllowedRole) {
    return (
      <div className="rehomer-dashboard-shell">
        <div className="rehomer-dashboard rehomer-dashboard--tight">
          <div className="rehomer-state-card">
            <h1>Access denied</h1>
            <p>Only rehomers or shelter admins can view this dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  const renderEmptyPets = () => (
    <div className="rehomer-empty-card">
      <div className="rehomer-empty-icon">🐾</div>
      <h3>No pets listed yet</h3>
      <p>Your first listing can start a pet&apos;s path to a safe new home.</p>
      <button
        onClick={() => navigate("/add-pet")}
        className="rehomer-button rehomer-button--primary"
      >
        Add Your First Pet
      </button>
    </div>
  );

  const renderEmptyRequests = () => (
    <div className="rehomer-empty-card">
      <div className="rehomer-empty-icon">📬</div>
      <h3>No adoption applications yet</h3>
      <p>When adopters start applying, their requests will show up here.</p>
    </div>
  );

  return (
    <div className="rehomer-dashboard-shell">
      {petPendingDelete ? (
        <div className="rehomer-modal-overlay" role="presentation">
          <div
            className="rehomer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rehomer-delete-title"
            aria-describedby="rehomer-delete-description"
          >
            <span className="rehomer-card-label">Delete Listing</span>
            <h2 id="rehomer-delete-title">Remove this pet listing?</h2>
            <p id="rehomer-delete-description">
              This will remove <strong>{petPendingDelete.name}</strong> from your listings and also clear related pending requests from this dashboard view.
            </p>
            <div className="rehomer-modal__actions">
              <button
                type="button"
                onClick={() => setPetPendingDelete(null)}
                className="rehomer-button rehomer-button--secondary rehomer-button--small"
                disabled={isDeletingPet}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(petPendingDelete.id)}
                className="rehomer-button rehomer-button--danger rehomer-button--small"
                disabled={isDeletingPet}
              >
                {isDeletingPet ? "Deleting..." : "Delete listing"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rehomer-dashboard">
        <section className="rehomer-hero">
          <div className="rehomer-hero__content">
            <span className="rehomer-pill rehomer-pill--soft">My FurryFriends Rehomer Space</span>
            <h1>Welcome back, {welcomeName}</h1>
            <p>
              Manage your listings, review adoption requests, and help pets find safe homes.
            </p>
            <div className="rehomer-hero__actions">
              <button
                onClick={() => navigate("/add-pet")}
                className="rehomer-button rehomer-button--primary"
              >
                Add New Pet
              </button>
              <button
                onClick={() => navigate("/pets")}
                className="rehomer-button rehomer-button--secondary rehomer-button--hero-secondary"
              >
                View Public Listings
              </button>
            </div>
          </div>

          <div className="rehomer-hero__side">
            <div className="rehomer-quote-card">
              <span className="rehomer-card-label">Daily Rehomer Tip</span>
              <p>{dailyTip}</p>
            </div>
            <div className="rehomer-quote-card rehomer-quote-card--warm">
              <span className="rehomer-card-label">Today&apos;s Reminder</span>
              <p>{currentQuote}</p>
            </div>
          </div>
        </section>

        {error && <div className="rehomer-banner rehomer-banner--error">{error}</div>}
        {success && <div className="rehomer-banner rehomer-banner--success">{success}</div>}

        {loading ? (
          <div className="rehomer-loading-card">
            <div className="rehomer-loading-spinner"></div>
            <p>Loading your rehomer dashboard...</p>
          </div>
        ) : (
          <>
            <section className="rehomer-stats-grid">
              <div className="rehomer-stat-card">
                <div className="rehomer-stat-card__icon">🐶</div>
                <div>
                  <p className="rehomer-stat-card__label">Total pets listed</p>
                  <h3>{stats.totalPets}</h3>
                </div>
              </div>
              <div className="rehomer-stat-card">
                <div className="rehomer-stat-card__icon">✨</div>
                <div>
                  <p className="rehomer-stat-card__label">Available pets</p>
                  <h3>{stats.availablePets}</h3>
                </div>
              </div>
              <div className="rehomer-stat-card">
                <div className="rehomer-stat-card__icon">📩</div>
                <div>
                  <p className="rehomer-stat-card__label">Pending requests</p>
                  <h3>{stats.pendingRequests}</h3>
                </div>
              </div>
              <div className="rehomer-stat-card">
                <div className="rehomer-stat-card__icon">🤝</div>
                <div>
                  <p className="rehomer-stat-card__label">Approved adoptions</p>
                  <h3>{stats.approvedApplications}</h3>
                </div>
              </div>
              <div className="rehomer-stat-card">
                <div className="rehomer-stat-card__icon">🏡</div>
                <div>
                  <p className="rehomer-stat-card__label">Success stories</p>
                  <h3>{stats.adoptedPets}</h3>
                </div>
              </div>
              <div className="rehomer-stat-card rehomer-stat-card--progress">
                <div className="rehomer-stat-card__header">
                  <div className="rehomer-stat-card__icon">📈</div>
                  <div>
                    <p className="rehomer-stat-card__label">Response rate</p>
                    <h3>{stats.responseRate}%</h3>
                  </div>
                </div>
                <div className="rehomer-progress-track">
                  <div
                    className="rehomer-progress-fill"
                    style={{ width: `${Math.max(stats.responseRate, 6)}%` }}
                  ></div>
                </div>
              </div>
            </section>

            <section className="rehomer-tabs">
              {[
                { id: "overview", label: "Overview" },
                { id: "my-pets", label: "My Pets" },
                { id: "requests", label: "Requests" },
                { id: "tips", label: "Tips" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => updateActiveTab(tab.id)}
                  className={`rehomer-tab ${activeTab === tab.id ? "rehomer-tab--active" : ""}`}
                >
                  {tab.label}
                </button>
              ))}
            </section>

            {activeTab === "overview" && (
              <div className="rehomer-overview-grid">
                <div className="rehomer-panel">
                  <div className="rehomer-panel__header">
                    <div>
                      <span className="rehomer-card-label">Quick Actions</span>
                      <h2>Move faster with the next best step</h2>
                    </div>
                  </div>
                  <div className="rehomer-action-grid">
                    {quickActions.map((action) => (
                      <button
                        key={action.id}
                        className="rehomer-action-card"
                        onClick={() => action.onClick(navigate, updateActiveTab)}
                      >
                        <strong>{action.title}</strong>
                        <p>{action.description}</p>
                        <span>{action.actionLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rehomer-panel">
                  <div className="rehomer-panel__header">
                    <div>
                      <span className="rehomer-card-label">Recent Pets</span>
                      <h2>Your newest listings</h2>
                    </div>
                    <button className="rehomer-link-button" onClick={() => updateActiveTab("my-pets")}>
                      See all pets
                    </button>
                  </div>
                  {recentPets.length === 0 ? (
                    renderEmptyPets()
                  ) : (
                    <div className="rehomer-compact-grid">
                      {recentPets.map((pet) => (
                        <article key={pet.id} className="rehomer-mini-card">
                          <img src={pet.imageUrl} alt={pet.name} className="rehomer-mini-card__image" />
                          <div>
                            <h3>{pet.name}</h3>
                            <p>{pet.breed || toTitleCase(pet.type)} • {pet.locationLabel}</p>
                            <span className={`rehomer-badge rehomer-badge--${getStatusTone(pet.status)}`}>
                              {toTitleCase(pet.status)}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rehomer-panel">
                  <div className="rehomer-panel__header">
                    <div>
                      <span className="rehomer-card-label">Recent Requests</span>
                      <h2>Latest adopter activity</h2>
                    </div>
                    <button className="rehomer-link-button" onClick={() => updateActiveTab("requests")}>
                      Review requests
                    </button>
                  </div>
                  {recentRequests.length === 0 ? (
                    renderEmptyRequests()
                  ) : (
                    <div className="rehomer-request-preview-list">
                      {recentRequests.map((request) => (
                        <article key={request.id} className="rehomer-request-preview">
                          <img
                            src={request.petImageUrl}
                            alt={request.petName}
                            className="rehomer-request-preview__image"
                          />
                          <div>
                            <h3>{request.userName}</h3>
                            <p>Interested in {request.petName}</p>
                          </div>
                          <span className={`rehomer-badge rehomer-badge--${getStatusTone(request.status)}`}>
                            {toTitleCase(request.status)}
                          </span>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "my-pets" && (
              <div className="rehomer-panel">
                <div className="rehomer-panel__header rehomer-panel__header--stack-mobile">
                  <div>
                    <span className="rehomer-card-label">My Pets</span>
                    <h2>Manage your listings</h2>
                  </div>
                  <div className="rehomer-filter-pills">
                    {["all", "available", "pending", "adopted"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setPetFilter(filter)}
                        className={`rehomer-filter-pill ${petFilter === filter ? "rehomer-filter-pill--active" : ""}`}
                      >
                        {toTitleCase(filter)}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredPets.length === 0 ? (
                  renderEmptyPets()
                ) : (
                  <div className="rehomer-pet-grid">
                    {filteredPets.map((pet) => (
                      <article key={pet.id} className="rehomer-pet-card">
                        <div className="rehomer-pet-card__image-wrap">
                          <img src={pet.imageUrl} alt={pet.name} className="rehomer-pet-card__image" />
                          <span className={`rehomer-badge rehomer-badge--${getStatusTone(pet.status)} rehomer-pet-card__status`}>
                            {toTitleCase(pet.status)}
                          </span>
                        </div>
                        <div className="rehomer-pet-card__body">
                          <div className="rehomer-pet-card__topline">
                            <div>
                              <h3>{pet.name}</h3>
                              <p>
                                {pet.breed || toTitleCase(pet.type)} • {pet.age || "Age not listed"}
                              </p>
                            </div>
                          </div>
                          <p className="rehomer-pet-card__location">{pet.locationLabel}</p>
                          <div className="rehomer-tag-row">
                            <span className="rehomer-tag">{toTitleCase(pet.type)}</span>
                            {getCareBadges(pet).map((badge) => (
                              <span key={`${pet.id}-${badge}`} className="rehomer-tag rehomer-tag--soft">
                                {badge}
                              </span>
                            ))}
                          </div>
                          <div className="rehomer-pet-card__actions">
                              <button
                                onClick={() => navigate(`/pet/${pet.id}`)}
                                className="rehomer-button rehomer-button--listing rehomer-button--small"
                              >
                                Manage Listing
                              </button>
                              <button
                                onClick={() => setPetPendingDelete({ id: pet.id, name: pet.name })}
                                className="rehomer-button rehomer-button--danger rehomer-button--small"
                              >
                                Delete
                              </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "requests" && (
              <div className="rehomer-panel">
                <div className="rehomer-panel__header rehomer-panel__header--stack-mobile">
                  <div>
                    <span className="rehomer-card-label">Adoption Requests</span>
                    <h2>Review adopter conversations</h2>
                  </div>
                  <div className="rehomer-filter-pills">
                    {["all", "pending", "approved", "rejected"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setRequestFilter(filter)}
                        className={`rehomer-filter-pill ${requestFilter === filter ? "rehomer-filter-pill--active" : ""}`}
                      >
                        {toTitleCase(filter)}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredRequests.length === 0 ? (
                  renderEmptyRequests()
                ) : (
                  <div className="rehomer-request-list">
                    {filteredRequests.map((request) => {
                      const isProcessed = request.status !== "pending";

                      return (
                        <article key={request.id} className="rehomer-request-card">
                          <div className="rehomer-request-card__media">
                            <img
                              src={request.petImageUrl}
                              alt={request.petName}
                              className="rehomer-request-card__image"
                            />
                          </div>
                          <div className="rehomer-request-card__body">
                            <div className="rehomer-request-card__header">
                              <div>
                                <span className="rehomer-card-label">For {request.petName}</span>
                                <h3>{request.userName}</h3>
                                <p>{request.userEmail} • {request.userPhone}</p>
                              </div>
                              <span className={`rehomer-badge rehomer-badge--${getStatusTone(request.status)}`}>
                                {toTitleCase(request.status)}
                              </span>
                            </div>

                            <div className="rehomer-request-meta">
                              <span>Pet: {request.petName}</span>
                              <span>Type: {toTitleCase(request.petType)}</span>
                              <span>Location: {request.petLocation}</span>
                              <span>
                                Visit date: {request.visitDate ? new Date(request.visitDate).toLocaleDateString() : "Not provided"}
                              </span>
                            </div>

                            <div className="rehomer-message-box">
                              <strong>Message</strong>
                              <p>{request.message}</p>
                            </div>

                            <div className="rehomer-request-card__actions">
                              <button
                                onClick={() => handleApprove(request.petId, request.id)}
                                disabled={isProcessed}
                                className="rehomer-button rehomer-button--primary rehomer-button--small"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                disabled={isProcessed}
                                className="rehomer-button rehomer-button--danger rehomer-button--small"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => navigate(`/pet/${request.petId}`)}
                                className="rehomer-button rehomer-button--secondary rehomer-button--small"
                              >
                                View Pet
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "tips" && (
              <div className="rehomer-panel">
                <div className="rehomer-panel__header">
                  <div>
                    <span className="rehomer-card-label">Rehomer Guidance</span>
                    <h2>Simple habits that improve safe adoption outcomes</h2>
                  </div>
                </div>
                <div className="rehomer-tips-grid">
                  {rehomerTips.map((tip) => (
                    <article key={tip.title} className="rehomer-tip-card">
                      <h3>{tip.title}</h3>
                      <p>{tip.body}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RehomerDashboard;
