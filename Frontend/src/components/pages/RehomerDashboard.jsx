import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  acceptVisitPlan,
  approveApplication,
  deletePet,
  getAccessToken,
  listConversations,
  listMyPets,
  listReceivedApplications,
  proposeVisitPlan,
  rejectApplication,
} from "../../services/api";
import { useAuth } from "./AuthContext";
import RehomerWorkspaceNav from "./RehomerWorkspaceNav";
import "./RehomerDashboard.css";

const toTitle = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const normalizeStatus = (status) => (status ? String(status).toLowerCase() : "available");

const resolvePetType = (pet) => {
  const baseType = String(pet.type || pet.species || "other").trim().toLowerCase();
  const customType = String(pet.custom_species || pet.species_label || "").trim();
  const breedFallback = String(pet.breed || "").trim();

  if (customType) {
    return customType;
  }

  if (baseType === "other" && breedFallback) {
    return breedFallback;
  }

  return baseType || "other";
};

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
  type: resolvePetType(pet),
  imageUrl: getPetImageUrl(pet),
  status: normalizeStatus(pet.status),
  adopted:
    pet.adopted !== undefined
      ? pet.adopted
      : normalizeStatus(pet.status) === "adopted",
  locationLabel: pet.location || pet.city || pet.county || "Location not listed",
});

const normalizeApplication = (application) => {
  const applicant = application.applicant || {};
  const pet = normalizePet(application.pet || {});
  const applicantName = `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim();

  return {
    ...application,
    id: String(application.id),
    applicantId: applicant.id ? String(applicant.id) : "",
    petId: pet.id,
    petName: pet.name || "Unnamed Pet",
    petType: pet.type,
    petImageUrl: pet.imageUrl || "/default-pet.jpg",
    petLocation: pet.locationLabel,
    userName: applicantName || applicant.username || applicant.email || "Anonymous",
    userEmail: applicant.email || "No email",
    userPhone: applicant.phone_number || "No phone",
    visitDate: application.preferred_visit_date || "",
    visitStatus: application.visit_status || "not_started",
    visitProposedBy: application.visit_proposed_by || "",
    visitConfirmedAt: application.visit_confirmed_at || "",
    meetingPreference: application.meeting_preference || "",
    meetingLocationNotes: application.meeting_location_notes || "",
    message: application.message || `Interested in adopting ${pet.name || "this pet"}`,
    status: normalizeStatus(application.status || "pending"),
    createdAt: application.created_at || "",
    updatedAt: application.updated_at || "",
  };
};

const meetingPreferenceLabel = {
  rehomer_home: "Visit the rehomer or pet location",
  adopter_home: "Rehomer visits adopter's place",
  neutral_place: "Meet at a neutral place",
};

const createVisitDraft = (request) => ({
  preferredVisitDate: request.visitDate || "",
  meetingPreference: request.meetingPreference || "",
  meetingLocationNotes: request.meetingLocationNotes || "",
});

const getRequestWorkflowStage = (request) => {
  if (request.status === "rejected") {
    return "Rejected";
  }

  if (request.status === "approved") {
    return "Completed";
  }

  if (request.visitStatus === "proposed" || request.visitStatus === "agreed") {
    return request.visitStatus === "agreed" ? "Visit agreed" : "Visit planned";
  }

  return "Reviewing";
};

const getWorkflowSteps = (request, conversationLookup) => {
  const hasConversation = Boolean(conversationLookup[`${request.petId}-${request.applicantId}`]);
  const currentStep = request.status === "approved"
    ? "completed"
    : request.visitStatus === "agreed" || request.visitStatus === "proposed"
      ? "visit_planned"
      : hasConversation || request.status === "pending"
        ? "reviewing"
        : "new_request";

  const steps = [
    { key: "new_request", label: "New request" },
    { key: "reviewing", label: "Reviewing" },
    { key: "visit_planned", label: request.visitStatus === "agreed" ? "Visit agreed" : "Visit planned" },
    { key: "completed", label: "Completed" },
  ];

  const activeIndex = steps.findIndex((step) => step.key === currentStep);

  return steps.map((step, index) => ({
    ...step,
    isActive: index === activeIndex,
    isComplete: index < activeIndex,
  }));
};

const getStatusTone = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "approved" || normalizedStatus === "adopted") {
    return "success";
  }

  if (
    normalizedStatus === "reviewing" ||
    normalizedStatus === "visit planned" ||
    normalizedStatus === "visit agreed" ||
    normalizedStatus === "new request"
  ) {
    return "warning";
  }

  if (normalizedStatus === "pending") {
    return "warning";
  }

  if (normalizedStatus === "rejected" || normalizedStatus === "unavailable") {
    return "danger";
  }

  return "neutral";
};

const getPresenceText = (profile) => {
  if (profile?.is_online) {
    return "Online";
  }

  if (profile?.last_seen) {
    return `Last active ${new Date(profile.last_seen).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return "Offline";
};

const tabToScreen = (tab) => {
  if (tab === "pets" || tab === "requests" || tab === "profile") {
    return tab;
  }

  return "requests";
};

const screenToTab = (screen) => {
  if (screen === "pets" || screen === "requests" || screen === "profile") {
    return screen;
  }

  return "requests";
};

const getPetTypeLabel = (pet) => pet.breed || toTitle(resolvePetType(pet));

const getPetGlyph = (type) => {
  const normalizedType = (type || "").toLowerCase();

  if (normalizedType === "cat") {
    return "C";
  }

  if (normalizedType === "dog") {
    return "D";
  }

  if (normalizedType === "rabbit") {
    return "R";
  }

  if (normalizedType === "bird") {
    return "B";
  }

  return "P";
};

const dailyTips = [
  "Adding 3 or more clear photos usually helps serious adopters trust the listing faster.",
  "Mention temperament honestly so families know what kind of support to expect at home.",
  "Vaccination and deworming details reduce confusion and help adopters prepare properly.",
  "A calm transition week helps newly adopted pets settle before their full personality shows.",
];

const IconPaw = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <ellipse cx="7" cy="8" rx="2" ry="2.7" />
    <ellipse cx="12" cy="6.2" rx="2" ry="2.9" />
    <ellipse cx="17" cy="8" rx="2" ry="2.7" />
    <ellipse cx="18.2" cy="13.2" rx="1.8" ry="2.4" />
    <ellipse cx="5.8" cy="13.2" rx="1.8" ry="2.4" />
    <path d="M12 11.5c-3.1 0-5.7 2.2-5.7 5 0 1.7 1.2 2.8 2.8 2.8.9 0 1.6-.3 2.1-.7.4-.3.9-.5 1.4-.5s1 .2 1.4.5c.5.4 1.3.7 2.1.7 1.6 0 2.8-1.1 2.8-2.8 0-2.8-2.6-5-5.7-5Z" />
  </svg>
);

const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
    <path d="M10 17a2 2 0 0 0 4 0" />
  </svg>
);

const IconPerson = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 5 6v6c0 5 3.4 8.6 7 10 3.6-1.4 7-5 7-10V6Z" />
    <path d="m9.5 12 1.7 1.7 3.8-3.8" />
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const getVerificationBadgeTone = (status) => {
  if (status === "verified") {
    return "success";
  }

  if (status === "pending") {
    return "warning";
  }

  if (status === "rejected") {
    return "danger";
  }

  return "neutral";
};

const getVerificationLabel = (status) => {
  if (status === "verified") {
    return "Verified";
  }

  if (status === "pending") {
    return "Pending approval";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Incomplete";
};

const Badge = ({ status, label }) => (
  <span className={`rd-badge rd-badge--${getStatusTone(status)}`}>{label || toTitle(status)}</span>
);

const SectionHead = ({ title, onSeeAll }) => (
  <div className="rd-section-head">
    <h3>{title}</h3>
    {onSeeAll ? (
      <button type="button" className="rd-see-all" onClick={onSeeAll}>
        See all
      </button>
    ) : null}
  </div>
);

const HomeScreen = ({
  stats,
  recentRequests,
  navigate,
  setScreen,
  isVerifiedRehomer,
  verificationStatus,
}) => {
  const tip = dailyTips[new Date().getDay() % dailyTips.length];
  const quickActions = isVerifiedRehomer
    ? [
        {
          id: "add-pet",
          icon: <IconPlus />,
          iconClass: "rd-icon--orange",
          label: "Add a pet",
          sub: "Create listing",
          onClick: () => navigate("/add-pet"),
        },
        {
          id: "my-pets",
          icon: <IconPaw />,
          iconClass: "rd-icon--peach",
          label: "My listings",
          sub: `${stats.totalPets} stored`,
          onClick: () => setScreen("pets"),
        },
        {
          id: "requests",
          icon: <IconMail />,
          iconClass: "rd-icon--cream",
          label: "Requests",
          sub: `${stats.pendingRequests} pending`,
          onClick: () => setScreen("requests"),
        },
        {
          id: "chats",
          icon: <IconMail />,
          iconClass: "rd-icon--soft",
          label: "Chats",
          sub: "Open inbox",
          onClick: () => navigate("/chats"),
        },
        {
          id: "public",
          icon: <IconEye />,
          iconClass: "rd-icon--cream",
          label: "Public view",
          sub: "Browse pets",
          onClick: () => navigate("/pets"),
        },
      ]
    : [
        {
          id: "verification",
          icon: <IconShield />,
          iconClass: "rd-icon--orange",
          label: "Verification",
          sub: verificationStatus === "pending" ? "Pending review" : "Complete profile",
          onClick: () => navigate("/rehomer-profile"),
        },
        {
          id: "my-pets",
          icon: <IconPaw />,
          iconClass: "rd-icon--peach",
          label: "My listings",
          sub: verificationStatus === "pending" ? "Pending approval" : "Locked for now",
          onClick: () => setScreen("pets"),
        },
        {
          id: "requests",
          icon: <IconMail />,
          iconClass: "rd-icon--cream",
          label: "Requests",
          sub: `${stats.pendingRequests} pending`,
          onClick: () => setScreen("requests"),
        },
        {
          id: "chats",
          icon: <IconMail />,
          iconClass: "rd-icon--soft",
          label: "Chats",
          sub: "Open inbox",
          onClick: () => navigate("/chats"),
        },
        {
          id: "public",
          icon: <IconEye />,
          iconClass: "rd-icon--cream",
          label: "Public view",
          sub: "Browse pets",
          onClick: () => navigate("/pets"),
        },
      ];

  return (
    <div className="rd-screen">
      <section className="rd-hero-card">
        <div className="rd-hero-card__shine" />
        <h2>Rehomer home</h2>
        <p>
          {isVerifiedRehomer
            ? "Here is a quick look at your listing activity today."
            : verificationStatus === "pending"
              ? "Your profile is under review. Listing tools will open once approval is complete."
              : "Finish your verification profile so your listing tools can be unlocked."}
        </p>
        <div className="rd-hero-stats">
          {[
            { label: "Listings", value: stats.totalPets },
            { label: "Requests", value: stats.pendingRequests },
            { label: "Adopted", value: stats.adoptedPets },
          ].map((item) => (
            <div key={item.label} className="rd-hstat">
              <div className="rd-hstat__num">{item.value}</div>
              <div className="rd-hstat__lbl">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      <SectionHead title="Quick actions" />
      <div className="rd-actions-grid">
        {quickActions.map((action) => (
          <button key={action.id} type="button" className="rd-action-card" onClick={action.onClick}>
            <div className={`rd-action-card__icon ${action.iconClass}`}>{action.icon}</div>
            <strong>{action.label}</strong>
            <span>{action.sub}</span>
          </button>
        ))}
      </div>

      <SectionHead title="Recent requests" onSeeAll={() => setScreen("requests")} />
      <div className="rd-requests-list">
        {recentRequests.length === 0 ? (
          <div className="rd-empty">
            <div className="rd-empty__icon">+</div>
            <h3>No requests yet</h3>
            <p>When adopters apply, their requests will show up here.</p>
          </div>
        ) : (
          recentRequests.map((request) => (
            <button
              key={request.id}
              type="button"
              className="rd-req-card"
              onClick={() => setScreen("requests")}
            >
              <div className="rd-req-avatar">{getPetGlyph(request.petType)}</div>
              <div className="rd-req-body">
                <div className="rd-req-name">{request.userName}</div>
                <div className="rd-req-sub">For {request.petName}</div>
              </div>
              <Badge status={request.status} />
            </button>
          ))
        )}
      </div>

      <section className="rd-tip-card">
        <div className="rd-tip-card__label">
          <span className="rd-tip-dot" />
          Tip of the day
        </div>
        <p>{tip}</p>
      </section>
    </div>
  );
};

const PetsScreen = ({ pets, navigate, onDelete, isVerifiedRehomer, verificationStatus }) => {
  const [filter, setFilter] = useState("all");
  const filteredPets = filter === "all" ? pets : pets.filter((pet) => pet.status === filter);

  return (
    <div className="rd-screen">
      <div className="rd-section-head">
        <h3>My listings {pets.length}</h3>
        {isVerifiedRehomer ? (
          <button
            type="button"
            className="rd-see-all"
            onClick={() => navigate("/add-pet")}
            aria-label="Add a new pet"
          >
            +
          </button>
        ) : null}
      </div>
      <div className="rd-filter-row">
        {["all", "available", "pending", "adopted"].map((value) => (
          <button
            key={value}
            type="button"
            className={`rd-filter-pill${filter === value ? " rd-filter-pill--active" : ""}`}
            onClick={() => setFilter(value)}
          >
            {toTitle(value)}
          </button>
        ))}
      </div>

      <div className="rd-pet-list">
        {filteredPets.length === 0 ? (
          <div className="rd-empty">
            <div className="rd-empty__icon">{isVerifiedRehomer ? "P" : "..."}</div>
            <h3>
              {isVerifiedRehomer ? "No pets here yet" : "Pending approval"}
            </h3>
            <p>
              {isVerifiedRehomer
                ? "Once you add your first listing, it will show up here."
                : verificationStatus === "pending"
                  ? "Your first pet listing will unlock after your rehomer profile is approved."
                  : "Complete your verification profile first to unlock pet listings."}
            </p>
            {isVerifiedRehomer ? (
              <button type="button" className="rd-btn rd-btn--primary" onClick={() => navigate("/add-pet")}>
                Add your first pet
                <span className="rd-btn__shine" />
              </button>
            ) : null}
          </div>
        ) : (
          filteredPets.map((pet) => (
            <article key={pet.id} className="rd-pet-card">
              {pet.imageUrl && pet.imageUrl !== "/default-pet.jpg" ? (
                <img src={pet.imageUrl} alt={pet.name} className="rd-pet-card__img" />
              ) : (
                <div className="rd-pet-card__img" style={{ display: "grid", placeItems: "center", fontWeight: 900, color: "#9C5F00" }}>
                  {getPetGlyph(pet.type)}
                </div>
              )}
              <div className="rd-pet-card__body">
                <div className="rd-pet-card__top">
                  <div>
                    <div className="rd-pet-card__name">{pet.name}</div>
                    <div className="rd-pet-card__sub">
                      {getPetTypeLabel(pet)} · {pet.locationLabel}
                    </div>
                  </div>
                  <Badge status={pet.status} />
                </div>
                {pet.status === "adopted" ? (
                  <div className="rd-pet-card__sub" style={{ color: "#1A7A48", fontWeight: 800, marginBottom: 10 }}>
                    Stored adoption record
                  </div>
                ) : null}
                <div className="rd-pet-card__actions">
                  <button type="button" className="rd-btn rd-btn--ghost" onClick={() => navigate(`/pet/${pet.id}`)}>
                    Manage
                  </button>
                  {pet.status !== "adopted" ? (
                    <button type="button" className="rd-btn rd-btn--soft" onClick={() => onDelete(pet)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

    </div>
  );
};

const RequestsScreen = ({
  requests,
  onApprove,
  onReject,
  onVisitUpdate,
  onVisitAccept,
  navigate,
  conversationLookup,
  conversationIdLookup,
}) => {
  const [filter, setFilter] = useState("all");
  const [visitEditorId, setVisitEditorId] = useState("");
  const [visitDrafts, setVisitDrafts] = useState({});
  const [visitSavingId, setVisitSavingId] = useState("");
  const filteredRequests =
    filter === "all" ? requests : requests.filter((request) => request.status === filter);

  const openVisitEditor = (request) => {
    setVisitEditorId(request.id);
    setVisitDrafts((currentDrafts) => ({
      ...currentDrafts,
      [request.id]: currentDrafts[request.id] || createVisitDraft(request),
    }));
  };

  const updateVisitDraft = (requestId, patch) => {
    setVisitDrafts((currentDrafts) => ({
      ...currentDrafts,
      [requestId]: {
        ...(currentDrafts[requestId] || {}),
        ...patch,
      },
    }));
  };

  const submitVisitPlan = async (requestId) => {
    try {
      setVisitSavingId(requestId);
      await onVisitUpdate(requestId, visitDrafts[requestId]);
      setVisitEditorId("");
    } finally {
      setVisitSavingId("");
    }
  };

  const acceptVisit = async (requestId) => {
    try {
      setVisitSavingId(requestId);
      await onVisitAccept(requestId);
    } finally {
      setVisitSavingId("");
    }
  };

  return (
    <div className="rd-screen">
      <SectionHead title={`Adoption requests ${requests.length}`} />
      <div style={{ padding: "0 16px 12px" }}>
        <div className="rd-tip-card" style={{ margin: 0 }}>
          <div className="rd-tip-card__label">
            <span className="rd-tip-dot" />
            Requests only
          </div>
          <p>
            This page is only for reviewing adoption requests. Ongoing conversations now live in
            <strong> Chats</strong>.
          </p>
        </div>
      </div>
      <div className="rd-filter-row">
        {["all", "pending", "approved", "rejected"].map((value) => (
          <button
            key={value}
            type="button"
            className={`rd-filter-pill${filter === value ? " rd-filter-pill--active" : ""}`}
            onClick={() => setFilter(value)}
          >
            {toTitle(value)}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 16px 24px" }}>
        {filteredRequests.length === 0 ? (
          <div className="rd-empty">
            <div className="rd-empty__icon">+</div>
            <h3>No requests in this category</h3>
            <p>This area will update as adopters apply and you review them.</p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const isProcessed = request.status !== "pending";
            const conversationKey = `${request.petId}-${request.applicantId}`;
            const workflowStage = getRequestWorkflowStage(request);
            const workflowSteps = getWorkflowSteps(request, conversationLookup);
            const conversationId = conversationIdLookup[conversationKey];
            const chatTarget = conversationId ? `/chats/${conversationId}` : "/chats";

            return (
              <article key={request.id} className="rd-req-full-card">
                <div className="rd-req-full-card__header">
                  <div className="rd-req-avatar">{request.userName.charAt(0).toUpperCase()}</div>
                  <div className="rd-req-body">
                    <div className="rd-req-name">{request.userName}</div>
                    <div className="rd-req-sub">Requested {request.petName}</div>
                    <div className="rd-req-sub">
                      {request.userEmail} · {request.userPhone}
                    </div>
                  </div>
                  <Badge
                    status={
                      workflowStage === "Rejected"
                        ? "rejected"
                        : workflowStage === "Completed"
                          ? "approved"
                          : "pending"
                    }
                    label={workflowStage}
                  />
                </div>

                <div className="rd-workflow-card">
                  <div className="rd-workflow-card__head">
                    <span className="rd-workflow-card__label">Request journey</span>
                    <span className="rd-workflow-card__status">{workflowStage}</span>
                  </div>
                  <div className="rd-workflow-line" aria-label={`Current stage: ${workflowStage}`}>
                    {workflowSteps.map((step, index) => (
                      <React.Fragment key={`${request.id}-${step.key}`}>
                        <span
                          className={`rd-workflow-step${
                            step.isActive ? " is-active" : step.isComplete ? " is-complete" : ""
                          }`}
                        >
                          {step.label}
                        </span>
                        {index < workflowSteps.length - 1 ? (
                          <span className="rd-workflow-arrow" aria-hidden="true">
                            &gt;
                          </span>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div
                  className="rd-req-full-card__pet"
                  onClick={() => navigate(chatTarget)}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(chatTarget);
                    }
                  }}
                >
                  <img src={request.petImageUrl} alt={request.petName} className="rd-req-full-card__pet-img" />
                  <div className="rd-req-body">
                    <div className="rd-req-name">{request.petName}</div>
                    <div className="rd-req-sub">
                      {toTitle(request.petType)} · {request.petLocation}
                    </div>
                    <div className="rd-req-sub">
                      {toTitle(request.petType)} · {request.petLocation}
                    </div>
                     <div className="rd-req-sub">
                       Visit date:{" "}
                       {request.visitDate
                         ? new Date(request.visitDate).toLocaleDateString()
                         : "Not provided"}
                     </div>
                     {request.meetingPreference ? (
                       <div className="rd-req-sub">
                         {meetingPreferenceLabel[request.meetingPreference] || request.meetingPreference}
                       </div>
                     ) : null}
                     {request.visitStatus !== "not_started" ? (
                       <div className="rd-req-sub" style={{ color: "#A85F00", fontWeight: 800 }}>
                         {request.visitStatus === "agreed"
                           ? "Visit agreed"
                           : request.visitProposedBy === "adopter"
                             ? "Adopter proposed this time"
                             : "You proposed this time"}
                       </div>
                     ) : null}
                   </div>
                 </div>

                <div className="rd-request-meta">
                  <div className="rd-request-meta__item">
                    <strong>Requested on</strong>
                    <span>
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleDateString()
                        : "Today"}
                    </span>
                  </div>
                  <div className="rd-request-meta__item">
                    <strong>Visit plan</strong>
                    <span>
                      {request.visitDate
                        ? new Date(request.visitDate).toLocaleDateString()
                        : "Not proposed yet"}
                    </span>
                  </div>
                  <div className="rd-request-meta__item">
                    <strong>Meeting</strong>
                    <span>
                      {request.meetingPreference
                        ? meetingPreferenceLabel[request.meetingPreference] ||
                          request.meetingPreference
                        : "To be agreed in chat"}
                    </span>
                  </div>
                </div>

                {request.meetingLocationNotes ? (
                  <div className="rd-request-note">
                    <strong>Meetup notes</strong>
                    <p>{request.meetingLocationNotes}</p>
                  </div>
                ) : null}

                 {visitEditorId === request.id ? (
                   <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                     <input
                       type="date"
                       value={visitDrafts[request.id]?.preferredVisitDate || ""}
                       onChange={(event) =>
                         updateVisitDraft(request.id, { preferredVisitDate: event.target.value })
                       }
                       className="rd-visit-input"
                     />
                     <select
                       value={visitDrafts[request.id]?.meetingPreference || ""}
                       onChange={(event) =>
                         updateVisitDraft(request.id, { meetingPreference: event.target.value })
                       }
                       className="rd-visit-input"
                     >
                       <option value="">Choose meeting style</option>
                       <option value="rehomer_home">Visit the rehomer or pet location</option>
                       <option value="adopter_home">Rehomer visits adopter's place</option>
                       <option value="neutral_place">Meet at a neutral place</option>
                     </select>
                     <textarea
                       value={visitDrafts[request.id]?.meetingLocationNotes || ""}
                       onChange={(event) =>
                         updateVisitDraft(request.id, { meetingLocationNotes: event.target.value })
                       }
                       placeholder="Share the time, area, or meetup details that work best."
                       className="rd-visit-textarea"
                     />
                     <div className="rd-req-full-card__actions">
                       <button
                         type="button"
                         className="rd-btn rd-btn--ghost"
                         onClick={() => setVisitEditorId("")}
                       >
                         Cancel
                       </button>
                       <button
                         type="button"
                         className="rd-btn rd-btn--soft"
                         onClick={() => submitVisitPlan(request.id)}
                         disabled={visitSavingId === request.id}
                       >
                         {visitSavingId === request.id ? "Saving..." : "Send visit plan"}
                       </button>
                     </div>
                   </div>
                 ) : null}

                 <div className="rd-req-full-card__actions">
                   {request.visitStatus === "proposed" && request.visitProposedBy === "adopter" ? (
                     <button
                       type="button"
                       className="rd-btn rd-btn--soft"
                       onClick={() => acceptVisit(request.id)}
                       disabled={visitSavingId === request.id}
                     >
                       {visitSavingId === request.id ? "Saving..." : "Accept visit"}
                     </button>
                   ) : null}
                   {request.status === "pending" ? (
                     <button
                       type="button"
                       className="rd-btn rd-btn--ghost"
                       onClick={() => openVisitEditor(request)}
                     >
                       {request.visitStatus === "not_started" ? "Propose visit" : "Suggest another time"}
                     </button>
                   ) : null}
                   <button
                     type="button"
                     className="rd-btn rd-btn--primary"
                    onClick={() => onApprove(request.petId, request.id)}
                    disabled={isProcessed}
                  >
                    Approve
                    <span className="rd-btn__shine" />
                  </button>
                  <button
                    type="button"
                    className="rd-btn rd-btn--danger"
                    onClick={() => onReject(request.id)}
                    disabled={isProcessed}
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

const ProfileScreen = ({ userData, navigate, logout, presenceText, stats, adoptionHistory }) => {
  const fullName = `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim();
  const verificationStatus = userData?.rehomer_verification_status || "incomplete";
  const statusLabel = getVerificationLabel(verificationStatus);
  const verificationTone = getVerificationBadgeTone(verificationStatus);

  return (
    <div className="rd-screen" style={{ padding: "0 16px 24px" }}>
      <div className="rd-req-full-card">
        <div className="rd-req-full-card__header">
          <div className="rd-req-avatar">
            {userData?.profile_photo_url ? (
              <img src={userData.profile_photo_url} alt={fullName || "Rehomer"} className="rd-avatar-image" />
            ) : (
              <div className="rd-avatar-fallback">
                <IconPerson />
              </div>
            )}
          </div>
          <div className="rd-req-body">
            <div className="rd-req-name">{fullName || "Rehomer"}</div>
            <div className="rd-req-sub">{toTitle(userData?.role || "rehomer")}</div>
          </div>
          <span className={`rd-badge rd-badge--${verificationTone}`}>{statusLabel}</span>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { label: "Status", value: presenceText },
            { label: "Verification", value: statusLabel },
            { label: "Phone", value: userData?.phone_number || "Not provided" },
            { label: "Email", value: userData?.email || "Not provided" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span className="rd-req-sub" style={{ marginTop: 0 }}>{item.label}</span>
              <span className="rd-req-name" style={{ fontSize: 12, textAlign: "right" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rd-actions-grid" style={{ marginBottom: 18 }}>
        {[
          { label: "Pets listed", value: stats.totalPets },
          { label: "Approved", value: stats.adoptedPets },
          { label: "Pending requests", value: stats.pendingRequests },
          { label: "Available", value: stats.availablePets },
        ].map((item) => (
          <div key={item.label} className="rd-action-card" style={{ cursor: "default" }}>
            <strong>{item.label}</strong>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#C26B00" }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="rd-profile-actions">
        <button
          type="button"
          className="rd-req-card"
          style={{ width: "100%", border: "none", textAlign: "left" }}
          onClick={() => navigate("/rehomer-profile")}
        >
          <div className="rd-req-avatar">
            <IconShield />
          </div>
          <div className="rd-req-body">
            <div className="rd-req-name">Verification details</div>
            <div className="rd-req-sub">Open your private review documents</div>
          </div>
          <div style={{ width: 18, height: 18, color: "#C0A070" }}>
            <IconArrow />
          </div>
        </button>

        <button
          type="button"
          className="rd-req-card"
          style={{ width: "100%", border: "none", textAlign: "left" }}
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          <div className="rd-req-avatar">
            <IconLogout />
          </div>
          <div className="rd-req-body">
            <div className="rd-req-name" style={{ color: "#C53030" }}>Log out</div>
            <div className="rd-req-sub">Leave your rehomer workspace</div>
          </div>
          <div style={{ width: 18, height: 18, color: "#C0A070" }}>
            <IconArrow />
          </div>
        </button>
      </div>

      <div className="rd-panel" style={{ marginTop: 18 }}>
        <div className="rd-panel__header">
          <div>
            <span className="rd-card-label">Adopted history</span>
            <h2>Completed pet handovers</h2>
          </div>
        </div>
        {adoptionHistory.length === 0 ? (
          <div className="rd-empty" style={{ padding: "20px 0 8px" }}>
            <h3>No adopted pets yet</h3>
            <p>Approved adoptions will be stored here with adopter details and final timing.</p>
          </div>
        ) : (
          <div className="rd-requests-list">
            {adoptionHistory.map((request) => (
              <article key={request.id} className="rd-req-card">
                <div className="rd-req-avatar">{getPetGlyph(request.petType)}</div>
                <div className="rd-req-body">
                  <div className="rd-req-name">{request.petName}</div>
                  <div className="rd-req-sub">Adopted by {request.userName}</div>
                  <div className="rd-req-sub">
                    {request.visitConfirmedAt
                      ? `Visit agreed ${new Date(request.visitConfirmedAt).toLocaleDateString()}`
                      : `Approved ${new Date(request.updated_at || request.created_at).toLocaleDateString()}`}
                  </div>
                </div>
                <span className="rd-badge rd-badge--success">Completed</span>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RehomerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userData, loading: authLoading, logout } = useAuth();

  const [pets, setPets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [screen, setScreenState] = useState(tabToScreen(searchParams.get("tab")));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasToken = Boolean(getAccessToken());
  const isAllowed = userData?.role === "rehomer" || userData?.role === "shelter_admin";
  const verificationStatus = userData?.rehomer_verification_status || "incomplete";
  const isVerifiedRehomer = verificationStatus === "verified";
  const presenceText = getPresenceText(userData);
  const setScreen = (nextScreen) => {
    setScreenState(nextScreen);
    const nextTab = screenToTab(nextScreen);
    setSearchParams(nextTab === "home" ? {} : { tab: nextTab }, { replace: true });
  };

  useEffect(() => {
    if (!authLoading && !hasToken) {
      navigate("/login/rehomer", { replace: true });
    }
  }, [authLoading, hasToken, navigate]);

  useEffect(() => {
    const nextScreen = tabToScreen(searchParams.get("tab"));
    setScreenState((currentScreen) => (currentScreen === nextScreen ? currentScreen : nextScreen));
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      if (authLoading || !hasToken || !isAllowed) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const [petResponse, requestResponse, conversationResponse] = await Promise.all([
          listMyPets(),
          listReceivedApplications(),
          listConversations(),
        ]);

        const petResults = Array.isArray(petResponse) ? petResponse : petResponse?.results || [];
        const requestResults = Array.isArray(requestResponse)
          ? requestResponse
          : requestResponse?.results || [];
        const conversationResults = Array.isArray(conversationResponse)
          ? conversationResponse
          : conversationResponse?.results || [];

        setPets(petResults.map(normalizePet));
        setRequests(requestResults.map(normalizeApplication));
        setConversations(conversationResults);
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, hasToken, isAllowed]);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = setTimeout(() => setSuccess(""), 4200);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    const stateMessage = location.state?.successMessage;

    if (!stateMessage) {
      return;
    }

    setSuccess(stateMessage);
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.state, navigate]);

  const stats = useMemo(
    () => ({
      totalPets: pets.length,
      availablePets: pets.filter((pet) => pet.status === "available").length,
      pendingRequests: requests.filter((request) => request.status === "pending").length,
      adoptedPets: pets.filter((pet) => pet.status === "adopted" || pet.adopted).length,
    }),
    [pets, requests],
  );

  const recentRequests = useMemo(() => requests.slice(0, 3), [requests]);
  const adoptionHistory = useMemo(
    () => requests.filter((request) => request.status === "approved"),
    [requests],
  );
  const conversationLookup = useMemo(
    () =>
      conversations.reduce((lookup, conversation) => {
        const petId = conversation?.pet?.id ? String(conversation.pet.id) : "";
        const adopterId = conversation?.adopter ? String(conversation.adopter) : "";

        if (petId && adopterId) {
          lookup[`${petId}-${adopterId}`] = true;
        }

        return lookup;
      }, {}),
    [conversations],
  );
  const conversationIdLookup = useMemo(
    () =>
      conversations.reduce((lookup, conversation) => {
        const petId = conversation?.pet?.id ? String(conversation.pet.id) : "";
        const adopterId = conversation?.adopter ? String(conversation.adopter) : "";

        if (petId && adopterId) {
          lookup[`${petId}-${adopterId}`] = String(conversation.id);
        }

        return lookup;
      }, {}),
    [conversations],
  );

  const handleApprove = async (petId, requestId) => {
    try {
      setError("");
      await approveApplication(requestId);
      setPets((currentPets) =>
        currentPets.map((pet) =>
          pet.id === petId ? { ...pet, adopted: true, status: "adopted" } : pet,
        ),
      );
      setRequests((currentRequests) =>
        currentRequests.map((request) => {
          if (request.id === requestId) {
            return { ...request, status: "approved" };
          }

          if (request.petId === petId && request.status === "pending") {
            return { ...request, status: "rejected" };
          }

          return request;
        }),
      );
      setSuccess("Adoption approved.");
    } catch (approveError) {
      setError(approveError.message || "Failed to approve.");
    }
  };

  const handleReject = async (requestId) => {
    try {
      setError("");
      await rejectApplication(requestId);
      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === requestId ? { ...request, status: "rejected" } : request,
        ),
      );
      setSuccess("Application rejected.");
    } catch (rejectError) {
      setError(rejectError.message || "Failed to reject.");
    }
  };

  const handleVisitUpdate = async (requestId, draft) => {
    try {
      setError("");
      setSuccess("");
      const updated = await proposeVisitPlan(requestId, {
        preferred_visit_date: draft.preferredVisitDate,
        meeting_preference: draft.meetingPreference,
        meeting_location_notes: draft.meetingLocationNotes,
      });
      const normalized = normalizeApplication(updated);
      setRequests((prevRequests) =>
        prevRequests.map((request) => (request.id === normalized.id ? normalized : request)),
      );
      setSuccess("New visit plan sent.");
    } catch (visitError) {
      console.error("Error updating visit plan:", visitError);
      setError(visitError.message || "Failed to update the visit plan.");
      throw visitError;
    }
  };

  const handleVisitAccept = async (requestId) => {
    try {
      setError("");
      setSuccess("");
      const updated = await acceptVisitPlan(requestId);
      const normalized = normalizeApplication(updated);
      setRequests((prevRequests) =>
        prevRequests.map((request) => (request.id === normalized.id ? normalized : request)),
      );
      setSuccess("Visit plan agreed.");
    } catch (visitError) {
      console.error("Error accepting visit plan:", visitError);
      setError(visitError.message || "Failed to accept the visit plan.");
      throw visitError;
    }
  };

  const handleDelete = async (petId) => {
    try {
      setIsDeleting(true);
      setError("");
      await deletePet(petId);
      setPets((currentPets) => currentPets.filter((pet) => pet.id !== petId));
      setRequests((currentRequests) =>
        currentRequests.filter((request) => request.petId !== petId),
      );
      setDeleteTarget(null);
      setSuccess("Listing removed.");
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!authLoading && hasToken && !isAllowed) {
    return (
      <div className="rd-shell">
        <div className="rd-empty" style={{ paddingTop: 80 }}>
          <h3>Access denied</h3>
          <p>Only rehomers can view this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rd-shell">
      <div className="rd-blob-a" />
      <div className="rd-blob-b" />

      <header className="rd-header">
        <div className="rd-logo">
          <div className="rd-logo__text">
            My<span>Furry</span>Friends
          </div>
        </div>
        <div className="rd-req-sub" style={{ marginTop: 0, textAlign: "center", color: userData?.is_online ? "#1A7A48" : "#9A7040" }}>
          {presenceText}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="rd-notif-btn"
            onClick={() => setScreen("requests")}
            aria-label="Open alerts"
          >
            <div style={{ width: 16, height: 16 }}>
              <IconBell />
            </div>
            {stats.pendingRequests > 0 ? <span className="rd-notif-dot" /> : null}
          </button>
          <button
            type="button"
            className="rd-notif-btn"
            onClick={() => setScreen("profile")}
            aria-label="Open profile"
          >
            {userData?.profile_photo_url ? (
              <img
                src={userData.profile_photo_url}
                alt="Profile"
                className="rd-avatar-image"
              />
            ) : (
              <div className="rd-avatar-fallback rd-avatar-fallback--small">
                <IconPerson />
              </div>
            )}
          </button>
        </div>
      </header>

      {success ? <div className="rd-banner rd-banner--success">{success}</div> : null}
      {error ? <div className="rd-banner rd-banner--error">{error}</div> : null}

      {loading ? (
        <div className="rd-spinner-wrap">
          <div className="rd-spinner" />
        </div>
      ) : (
        <>
          {screen === "home" || screen === "requests" ? (
              <RequestsScreen
                requests={requests}
                onApprove={handleApprove}
                onReject={handleReject}
                onVisitUpdate={handleVisitUpdate}
                onVisitAccept={handleVisitAccept}
                navigate={navigate}
                conversationLookup={conversationLookup}
                conversationIdLookup={conversationIdLookup}
              />
          ) : null}

          {screen === "pets" ? (
            <PetsScreen
              pets={pets}
              navigate={navigate}
              onDelete={setDeleteTarget}
              isVerifiedRehomer={isVerifiedRehomer}
              verificationStatus={verificationStatus}
            />
          ) : null}

          {screen === "profile" ? (
            <ProfileScreen
              userData={userData}
              navigate={navigate}
              logout={logout}
              presenceText={presenceText}
              stats={stats}
              adoptionHistory={adoptionHistory}
            />
          ) : null}
        </>
      )}

      {deleteTarget ? (
        <div className="rd-modal-overlay" role="presentation">
          <div className="rd-modal" role="dialog" aria-modal="true" aria-labelledby="rd-delete-title">
            <div className="rd-modal__icon">!</div>
            <h3 id="rd-delete-title">Delete {deleteTarget.name}?</h3>
            <p>This will remove the listing and clear related pending requests from this dashboard.</p>
            <div className="rd-modal__actions">
              <button type="button" className="rd-btn rd-btn--ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="rd-btn rd-btn--danger"
                onClick={() => handleDelete(deleteTarget.id)}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <RehomerWorkspaceNav pendingCount={stats.pendingRequests} />
    </div>
  );
};

export default RehomerDashboard;
