import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  acceptVisitPlan,
  getAccessToken,
  listConversations,
  listMyApplications,
  proposeVisitPlan,
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

const normalizeApplication = (application) => {
  const pet = application.pet || {};

  return {
    ...application,
    id: String(application.id),
    petId: pet.id ? String(pet.id) : String(application.id),
    petName: pet.name || "Unnamed Pet",
    petBreed: pet.breed || "Unknown breed",
    petImageUrl: getPetImageUrl(pet),
    status: application.status || "pending",
    message: application.message || "",
    housingType: application.housing_type || "",
    hasOtherPets: Boolean(application.has_other_pets),
    hasChildren: Boolean(application.has_children),
    canAffordVetCare: Boolean(application.can_afford_vet_care),
    petExperience: application.pet_experience || "",
    preferredVisitDate: application.preferred_visit_date || "",
    meetingPreference: application.meeting_preference || "",
    meetingLocationNotes: application.meeting_location_notes || "",
    visitStatus: application.visit_status || "not_started",
    visitProposedBy: application.visit_proposed_by || "",
    visitConfirmedAt: application.visit_confirmed_at || "",
    createdAt: application.created_at || "",
  };
};

const getRequestStage = (request, conversationMap) => {
  if (request.status === "withdrawn") {
    return "withdrawn";
  }

  if (request.status === "rejected") {
    return "rejected";
  }

  if (request.status === "approved") {
    return "approved";
  }

  const hasConversation = conversationMap[request.petId];
  const hasVisitPlan = request.visitStatus === "proposed";
  const hasAgreedVisit = request.visitStatus === "agreed";

  if (hasAgreedVisit) {
    return "visit_agreed";
  }

  if (hasVisitPlan) {
    return "visit_proposed";
  }

  if (hasConversation) {
    return "chatting";
  }

  return "requested";
};

const statusTone = {
  pending: { bg: "#fff4df", color: "#c16f00" },
  approved: { bg: "#edf9ef", color: "#1e7b48" },
  rejected: { bg: "#fff1f1", color: "#c53030" },
  withdrawn: { bg: "#f4f1eb", color: "#7a6b57" },
};

const stageTone = {
  requested: { bg: "#fff7ea", color: "#b56a00" },
  chatting: { bg: "#eef7ff", color: "#2563eb" },
  visit_proposed: { bg: "#fff4df", color: "#c16f00" },
  approved: { bg: "#edf9ef", color: "#1e7b48" },
  rejected: { bg: "#fff1f1", color: "#c53030" },
  withdrawn: { bg: "#f4f1eb", color: "#7a6b57" },
};

const stageLabel = {
  requested: "Interested",
  chatting: "Chatting",
  visit_proposed: "Visit proposed",
  visit_agreed: "Visit agreed",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Canceled",
};

const requestJourney = ["requested", "chatting", "visit_proposed", "visit_agreed", "approved"];

const meetingPreferenceLabel = {
  rehomer_home: "Visit the rehomer or pet location",
  adopter_home: "Rehomer visits my place",
  neutral_place: "Meet at a neutral place",
};

const proposedByLabel = {
  adopter: "You proposed this plan",
  rehomer: "Rehomer proposed this plan",
};

const createVisitDraft = (request) => ({
  preferredVisitDate: request.preferredVisitDate || "",
  meetingPreference: request.meetingPreference || "",
  meetingLocationNotes: request.meetingLocationNotes || "",
});

const MyListings = () => {
  const navigate = useNavigate();
  const { loading: authLoading, userData } = useAuth();
  const [adoptionRequests, setAdoptionRequests] = useState([]);
  const [conversationMap, setConversationMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [visitEditorId, setVisitEditorId] = useState("");
  const [visitDrafts, setVisitDrafts] = useState({});
  const [visitSavingId, setVisitSavingId] = useState("");

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
        const [applicationsResponse, conversationsResponse] = await Promise.all([
          listMyApplications(),
          listConversations().catch(() => []),
        ]);
        const requests = Array.isArray(applicationsResponse) ? applicationsResponse : applicationsResponse?.results || [];
        const conversations = Array.isArray(conversationsResponse)
          ? conversationsResponse
          : conversationsResponse?.results || [];
        setAdoptionRequests(requests.map(normalizeApplication));
        setConversationMap(
          conversations.reduce((accumulator, conversation) => {
            const petId = conversation?.pet?.id;
            if (petId != null) {
              accumulator[String(petId)] = conversation.id;
            }
            return accumulator;
          }, {}),
        );
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load your adoption requests.");
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [authLoading, hasToken, isAdopter]);

  const filteredRequests = useMemo(() => {
    if (activeFilter === "all") {
      return adoptionRequests;
    }

    return adoptionRequests.filter((request) => request.status === activeFilter);
  }, [activeFilter, adoptionRequests]);

  const requestsWithStage = useMemo(
    () =>
      filteredRequests.map((request) => ({
        ...request,
        stage: getRequestStage(request, conversationMap),
        conversationId: conversationMap[request.petId] || null,
      })),
    [conversationMap, filteredRequests],
  );

  const updateRequest = (updatedRequest) => {
    const normalizedRequest = normalizeApplication(updatedRequest);
    setAdoptionRequests((currentRequests) =>
      currentRequests.map((request) => (request.id === normalizedRequest.id ? normalizedRequest : request)),
    );
  };

  const handleOpenVisitEditor = (request) => {
    setVisitEditorId(request.id);
    setVisitDrafts((currentDrafts) => ({
      ...currentDrafts,
      [request.id]: currentDrafts[request.id] || createVisitDraft(request),
    }));
  };

  const handleVisitDraftChange = (requestId, patch) => {
    setVisitDrafts((currentDrafts) => ({
      ...currentDrafts,
      [requestId]: {
        ...(currentDrafts[requestId] || {}),
        ...patch,
      },
    }));
  };

  const handleSubmitVisitPlan = async (requestId) => {
    const draft = visitDrafts[requestId];

    try {
      setVisitSavingId(requestId);
      setError("");
      const updated = await proposeVisitPlan(requestId, {
        preferred_visit_date: draft.preferredVisitDate,
        meeting_preference: draft.meetingPreference,
        meeting_location_notes: draft.meetingLocationNotes,
      });
      updateRequest(updated);
      setVisitEditorId("");
    } catch (submitError) {
      setError(submitError.message || "Could not update the visit plan.");
    } finally {
      setVisitSavingId("");
    }
  };

  const handleAcceptVisitPlan = async (requestId) => {
    try {
      setVisitSavingId(requestId);
      setError("");
      const updated = await acceptVisitPlan(requestId);
      updateRequest(updated);
    } catch (acceptError) {
      setError(acceptError.message || "Could not accept the visit plan.");
    } finally {
      setVisitSavingId("");
    }
  };

  if (!authLoading && hasToken && !isAdopter) {
    return <div style={styles.stateError}>Access denied. Only adopters can view this page.</div>;
  }

  return (
    <div style={styles.shell}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Your activity</p>
          <h1 style={styles.title}>Adoption Requests</h1>
        </div>
      </div>

      <div style={styles.filters}>
        {["all", "pending", "approved", "rejected", "withdrawn"].map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            style={{
              ...styles.filterButton,
              ...(activeFilter === filter ? styles.filterButtonActive : {}),
            }}
          >
            {toTitleCase(filter)}
          </button>
        ))}
      </div>

      {loading ? <div style={styles.state}>Loading adoption requests...</div> : null}
      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      {!loading && !error && requestsWithStage.length === 0 ? (
        <div style={styles.emptyCard}>
          <p style={styles.emptyTitle}>No requests here yet.</p>
          <p style={styles.emptyCopy}>Once you mark interest in a pet, it will show up here.</p>
        </div>
      ) : null}

      {!loading && !error && requestsWithStage.length > 0 ? (
        <div style={styles.list}>
          {requestsWithStage.map((request) => (
            <article key={request.id} style={styles.card}>
              <div style={styles.cardTop}>
                <img src={request.petImageUrl} alt={request.petName} style={styles.image} />
                <div style={styles.meta}>
                  <strong style={styles.name}>{request.petName}</strong>
                  <span style={styles.breed}>{request.petBreed}</span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      background: stageTone[request.stage]?.bg || "#fff7ea",
                      color: stageTone[request.stage]?.color || "#9a7040",
                    }}
                  >
                    {stageLabel[request.stage] || toTitleCase(request.status)}
                  </span>
                </div>
              </div>
              <div style={styles.stageRow}>
                {requestJourney.map((step, index) => {
                  const currentIndex = requestJourney.indexOf(request.stage);
                  const stepIndex = requestJourney.indexOf(step);
                  const isTerminal = ["rejected", "withdrawn"].includes(request.stage);
                  const isDone = !isTerminal && stepIndex < currentIndex;
                  const isCurrent = !isTerminal && stepIndex === currentIndex;

                  return (
                    <React.Fragment key={`${request.id}-${step}`}>
                      <span
                        style={{
                          ...styles.stageText,
                          ...(isDone ? styles.stageTextDone : {}),
                          ...(isCurrent ? styles.stageTextCurrent : {}),
                        }}
                      >
                        {stageLabel[step]}
                      </span>
                      {index < requestJourney.length - 1 ? (
                        <span style={styles.stageArrow}>→</span>
                      ) : null}
                    </React.Fragment>
                  );
                })}
                {["rejected", "withdrawn"].includes(request.stage) ? (
                  <>
                    <span style={styles.stageArrow}>→</span>
                    <span style={{ ...styles.stageText, ...styles.stageTextRejected }}>
                      {request.stage === "withdrawn" ? "Canceled" : "Rejected"}
                    </span>
                  </>
                ) : null}
              </div>
              <div style={styles.detailGrid}>
                {request.preferredVisitDate ? (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Preferred date</span>
                    <strong>{new Date(request.preferredVisitDate).toLocaleDateString()}</strong>
                  </div>
                ) : null}
                {request.meetingPreference ? (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Meeting plan</span>
                    <strong>{meetingPreferenceLabel[request.meetingPreference] || request.meetingPreference}</strong>
                  </div>
                ) : null}
                {request.visitStatus !== "not_started" ? (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Visit status</span>
                    <strong>
                      {request.visitStatus === "agreed"
                        ? "Visit agreed"
                        : proposedByLabel[request.visitProposedBy] || "Visit proposed"}
                    </strong>
                  </div>
                ) : null}
                {request.housingType ? (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Home setup</span>
                    <strong>{toTitleCase(request.housingType)}</strong>
                  </div>
                ) : null}
              </div>
              {request.meetingLocationNotes ? (
                <p style={styles.noteBox}>{request.meetingLocationNotes}</p>
              ) : null}
              {visitEditorId === request.id ? (
                <div style={styles.visitPlanner}>
                  <div style={styles.visitPlannerGrid}>
                    <label style={styles.visitLabel}>
                      <span style={styles.detailLabel}>New proposed date</span>
                      <input
                        type="date"
                        value={visitDrafts[request.id]?.preferredVisitDate || ""}
                        onChange={(event) =>
                          handleVisitDraftChange(request.id, { preferredVisitDate: event.target.value })
                        }
                        style={styles.visitInput}
                      />
                    </label>
                    <label style={styles.visitLabel}>
                      <span style={styles.detailLabel}>Meeting style</span>
                      <select
                        value={visitDrafts[request.id]?.meetingPreference || ""}
                        onChange={(event) =>
                          handleVisitDraftChange(request.id, { meetingPreference: event.target.value })
                        }
                        style={styles.visitInput}
                      >
                        <option value="">Choose one</option>
                        <option value="rehomer_home">Visit the rehomer or pet location</option>
                        <option value="adopter_home">Rehomer visits my place</option>
                        <option value="neutral_place">Meet at a neutral place</option>
                      </select>
                    </label>
                  </div>
                  <label style={styles.visitLabel}>
                    <span style={styles.detailLabel}>Location notes</span>
                    <textarea
                      value={visitDrafts[request.id]?.meetingLocationNotes || ""}
                      onChange={(event) =>
                        handleVisitDraftChange(request.id, { meetingLocationNotes: event.target.value })
                      }
                      style={styles.visitTextarea}
                      placeholder="Share the place or timing notes that would work best."
                    />
                  </label>
                  <div style={styles.visitPlannerActions}>
                    <button
                      type="button"
                      style={styles.cancelVisitButton}
                      onClick={() => setVisitEditorId("")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      style={styles.visitButton}
                      disabled={visitSavingId === request.id}
                      onClick={() => handleSubmitVisitPlan(request.id)}
                    >
                      {visitSavingId === request.id ? "Saving..." : "Send new visit plan"}
                    </button>
                  </div>
                </div>
              ) : null}
              <div style={styles.actions}>
                {request.visitStatus === "proposed" && request.visitProposedBy === "rehomer" ? (
                  <button
                    style={styles.acceptButton}
                    onClick={() => handleAcceptVisitPlan(request.id)}
                    disabled={visitSavingId === request.id}
                  >
                    {visitSavingId === request.id ? "Saving..." : "Accept Visit"}
                  </button>
                ) : null}
                {request.status === "pending" ? (
                  <button
                    style={styles.secondaryActionButton}
                    onClick={() => handleOpenVisitEditor(request)}
                  >
                    {request.visitStatus === "not_started" ? "Propose Visit" : "Suggest Another Time"}
                  </button>
                ) : null}
                <button
                  style={styles.chatButton}
                  onClick={() => navigate(request.conversationId ? `/chats/${request.conversationId}` : "/chats")}
                >
                  Open Chat
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const styles = {
  shell: {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "18px 14px 110px",
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top right, rgba(255, 205, 118, 0.18), transparent 28%), linear-gradient(180deg, #fff9f2 0%, #fffefb 100%)",
  },
  header: {
    marginBottom: "14px",
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
  filters: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  filterButton: {
    border: "1px solid rgba(255,185,90,0.24)",
    background: "#fff",
    color: "#b56a00",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  filterButtonActive: {
    background: "#ff9800",
    color: "#fff",
    borderColor: "transparent",
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
    padding: "22px 18px",
    textAlign: "center",
    boxShadow: "0 12px 28px rgba(125, 88, 32, 0.06)",
  },
  emptyTitle: {
    margin: "0 0 8px",
    fontWeight: 800,
    color: "#2c1700",
  },
  emptyCopy: {
    margin: 0,
    color: "#7d6542",
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  card: {
    background: "rgba(255,255,255,0.96)",
    borderRadius: "20px",
    border: "1px solid rgba(255,185,90,0.18)",
    padding: "14px",
    boxShadow: "0 10px 24px rgba(125, 88, 32, 0.05)",
  },
  cardTop: {
    display: "grid",
    gridTemplateColumns: "72px 1fr",
    gap: "12px",
    alignItems: "center",
  },
  image: {
    width: "72px",
    height: "72px",
    borderRadius: "14px",
    objectFit: "cover",
    background: "#fff2dc",
  },
  meta: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    minWidth: 0,
  },
  name: {
    color: "#2c1700",
    fontSize: "1rem",
  },
  breed: {
    color: "#8b7049",
    fontSize: "0.86rem",
  },
  statusBadge: {
    width: "fit-content",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "0.74rem",
    fontWeight: 800,
  },
  stageRow: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    marginTop: "12px",
    alignItems: "center",
  },
  stageText: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#c2a27a",
  },
  stageTextDone: {
    color: "#a85f00",
    opacity: 0.88,
  },
  stageTextCurrent: {
    color: "#7a4500",
    fontWeight: 900,
  },
  stageTextRejected: {
    color: "#c53030",
    fontWeight: 900,
  },
  stageArrow: {
    color: "#d1b186",
    fontSize: "0.78rem",
    fontWeight: 800,
  },
  detailGrid: {
    display: "grid",
    gap: "8px",
    marginTop: "12px",
  },
  detailItem: {
    display: "grid",
    gap: "3px",
  },
  detailLabel: {
    color: "#9d7a52",
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  noteBox: {
    margin: "10px 0 0",
    padding: "10px 12px",
    borderRadius: "12px",
    background: "#fff8ef",
    border: "1px solid rgba(255,185,90,0.16)",
    color: "#6f5b3f",
    lineHeight: 1.55,
    fontSize: "0.88rem",
  },
  visitPlanner: {
    marginTop: "12px",
    padding: "12px",
    borderRadius: "14px",
    background: "#fffaf4",
    border: "1px solid rgba(255,185,90,0.16)",
    display: "grid",
    gap: "10px",
  },
  visitPlannerGrid: {
    display: "grid",
    gap: "10px",
  },
  visitLabel: {
    display: "grid",
    gap: "6px",
  },
  visitInput: {
    border: "1px solid rgba(255,185,90,0.22)",
    borderRadius: "12px",
    background: "#fff",
    padding: "10px 12px",
    font: "inherit",
    color: "#2c1700",
  },
  visitTextarea: {
    minHeight: "84px",
    border: "1px solid rgba(255,185,90,0.22)",
    borderRadius: "12px",
    background: "#fff",
    padding: "10px 12px",
    font: "inherit",
    color: "#2c1700",
    resize: "vertical",
  },
  visitPlannerActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },
  cancelVisitButton: {
    border: "1px solid rgba(255,185,90,0.22)",
    borderRadius: "12px",
    background: "#fff",
    color: "#8b7049",
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  visitButton: {
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #ffab16 0%, #ff8600 100%)",
    color: "#fff",
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "12px",
    gap: "8px",
    flexWrap: "wrap",
  },
  acceptButton: {
    border: "none",
    borderRadius: "12px",
    background: "#edf9ef",
    color: "#1e7b48",
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryActionButton: {
    border: "1px solid rgba(255,185,90,0.22)",
    borderRadius: "12px",
    background: "#fff8ef",
    color: "#a85f00",
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  chatButton: {
    border: "1px solid rgba(255,185,90,0.22)",
    borderRadius: "12px",
    background: "#fff8ef",
    color: "#a85f00",
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
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

export default MyListings;
