import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminDashboard,
  getAdminPets,
  getAdminUsers,
  reviewRehomerRequest,
} from "../../services/api";
import { useAuth } from "./AuthContext";

const toTitle = (value) =>
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

const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10.5V20h13V10.5" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

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

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 5 6v6c0 5 3.4 8.6 7 10 3.6-1.4 7-5 7-10V6Z" />
    <path d="m9.5 12 1.7 1.7 3.8-3.8" />
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

const statusStyles = {
  available: { background: "#E8F9EE", color: "#1A7A48" },
  adopted: { background: "#FFF0CC", color: "#B85D00" },
  pending: { background: "#FFF7EA", color: "#B7791F" },
  approved: { background: "#E8F9EE", color: "#1A7A48" },
  rejected: { background: "#FFF1F1", color: "#C53030" },
  verified: { background: "#E8F9EE", color: "#1A7A48" },
};

const badgeStyle = (status) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 800,
  background: statusStyles[status]?.background || "#F4F1EC",
  color: statusStyles[status]?.color || "#7A6040",
  whiteSpace: "nowrap",
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { userData, logout } = useAuth();
  const [screen, setScreen] = useState("home");
  const [dashboard, setDashboard] = useState({
    counts: {
      pending_rehomer_reviews: 0,
      total_rehomers: 0,
      total_users: 0,
      total_pets: 0,
      pending_applications: 0,
    },
    pending_rehomers: [],
    recent_pets: [],
    recent_applications: [],
  });
  const [users, setUsers] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [selectedRehomer, setSelectedRehomer] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [rehomerPage, setRehomerPage] = useState(1);

  const REHOMERS_PER_PAGE = 20;

  const adminName = useMemo(() => {
    const fullName = `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim();
    return fullName || userData?.username || userData?.email || "Admin";
  }, [userData]);

  const handleLogout = () => {
    logout();
    navigate("/login/user");
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [dashboardResponse, usersResponse, petsResponse] = await Promise.all([
        getAdminDashboard(),
        getAdminUsers(),
        getAdminPets(),
      ]);

      setDashboard({
        counts: dashboardResponse?.counts || {},
        pending_rehomers: dashboardResponse?.pending_rehomers || [],
        recent_pets: dashboardResponse?.recent_pets || [],
        recent_applications: dashboardResponse?.recent_applications || [],
      });
      setUsers(Array.isArray(usersResponse) ? usersResponse : usersResponse?.results || []);
      setPets(Array.isArray(petsResponse) ? petsResponse : petsResponse?.results || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const handleReview = async (userId, status) => {
    try {
      setProcessingId(userId);
      setError("");
      setSuccess("");
      await reviewRehomerRequest(userId, { status });
      await loadAll();
      setSelectedRehomer(null);
      setSuccess(status === "verified" ? "Rehomer approved successfully." : "Rehomer rejected.");
    } catch (reviewError) {
      setError(reviewError.message || "Failed to review rehomer request.");
    } finally {
      setProcessingId(null);
    }
  };

  const rehomers = useMemo(
    () => users.filter((user) => user.role === "rehomer"),
    [users],
  );

  const totalRehomerPages = Math.max(1, Math.ceil(rehomers.length / REHOMERS_PER_PAGE));
  const pagedRehomers = useMemo(() => {
    const startIndex = (rehomerPage - 1) * REHOMERS_PER_PAGE;
    return rehomers.slice(startIndex, startIndex + REHOMERS_PER_PAGE);
  }, [rehomerPage, rehomers]);

  useEffect(() => {
    setRehomerPage((currentPage) => Math.min(currentPage, totalRehomerPages));
  }, [totalRehomerPages]);

  const statCards = [
    { label: "Pending reviews", value: dashboard.counts.pending_rehomer_reviews || 0 },
    { label: "Rehomers", value: dashboard.counts.total_rehomers || 0 },
    { label: "Pets", value: dashboard.counts.total_pets || 0 },
    { label: "Users", value: dashboard.counts.total_users || 0 },
  ];

  const renderHome = () => (
    <>
      <section style={s.hero}>
        <div style={s.heroLabel}>My FurryFriends Admin</div>
        <h1 style={s.heroTitle}>Welcome, {adminName}</h1>
        <p style={s.heroText}>
          Review rehomer requests, watch pet activity, and stay on top of what needs approval.
        </p>
      </section>

      <section style={s.statGrid}>
        {statCards.map((item) => (
          <article key={item.label} style={s.statCard}>
            <div style={s.statValue}>{item.value}</div>
            <div style={s.statLabel}>{item.label}</div>
          </article>
        ))}
      </section>

      <section style={s.card}>
        <div style={s.sectionTop}>
          <div style={s.eyebrow}>Pending approvals</div>
          <h2 style={s.sectionTitle}>Rehomer requests waiting for review</h2>
        </div>

        {dashboard.pending_rehomers.length === 0 ? (
          <div style={s.emptyState}>No pending rehomer approvals right now.</div>
        ) : (
          <div style={s.list}>
            {dashboard.pending_rehomers.slice(0, 4).map((rehomer) => {
              const fullName = `${rehomer.first_name || ""} ${rehomer.last_name || ""}`.trim();
              return (
                <article key={rehomer.id} style={s.listCard}>
                  <div style={s.listTop}>
                    <div>
                      <div style={s.listTitle}>{fullName || rehomer.username || rehomer.email}</div>
                      <div style={s.listMeta}>{rehomer.email || "No email"} · {rehomer.phone_number || "No phone"}</div>
                    </div>
                    <span style={badgeStyle("pending")}>Pending approval</span>
                  </div>
                  <div style={s.actionRow}>
                    <button type="button" style={s.secondaryButton} onClick={() => { setSelectedRehomer(rehomer); setScreen("rehomers"); }}>
                      Review documents
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );

const renderRehomers = () => (
    <section style={s.card}>
      <div style={s.sectionTop}>
        <div style={s.eyebrow}>Rehomers</div>
        <h2 style={s.sectionTitle}>All rehomers and approval requests</h2>
        <p style={s.sectionCopy}>
          Open a rehomer row to inspect documents and manage approval status.
        </p>
      </div>

      {rehomers.length === 0 ? (
        <div style={s.emptyState}>No rehomer accounts yet.</div>
      ) : (
        <>
          <div style={s.sheet}>
            <div style={s.sheetHead}>
              <span>Rehomer</span>
              <span>Status</span>
            </div>

          {pagedRehomers.map((rehomer) => {
            const fullName = `${rehomer.first_name || ""} ${rehomer.last_name || ""}`.trim();
            const status = rehomer.rehomer_verification_status || "incomplete";
            return (
              <button
                key={rehomer.id}
                type="button"
                style={s.sheetRow}
                onClick={() => setSelectedRehomer(rehomer)}
              >
                <div>
                  <div>
                    <div style={s.listTitle}>{fullName || rehomer.username || rehomer.email}</div>
                    <div style={s.listMeta}>{rehomer.email || "No email"}</div>
                  </div>
                </div>
                <div style={s.sheetRowRight}>
                  <span style={badgeStyle(status)}>
                    {toTitle(status === "pending" ? "pending approval" : status)}
                  </span>
                  <span style={s.sheetArrow}>
                    <IconArrow />
                  </span>
                </div>
              </button>
            );
          })}
          </div>

          {totalRehomerPages > 1 ? (
            <div style={s.pagination}>
              {Array.from({ length: totalRehomerPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  style={{
                    ...s.pageButton,
                    ...(page === rehomerPage ? s.pageButtonActive : {}),
                  }}
                  onClick={() => setRehomerPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );

  const renderPets = () => (
    <section style={s.card}>
      <div style={s.sectionTop}>
        <div style={s.eyebrow}>Pets</div>
        <h2 style={s.sectionTitle}>All pets in the system</h2>
      </div>

      {pets.length === 0 ? (
        <div style={s.emptyState}>No pets have been added yet.</div>
      ) : (
        <div style={s.list}>
          {pets.map((pet) => (
            <article key={pet.id} style={s.petRow}>
              <img src={getPetImageUrl(pet)} alt={pet.name} style={s.petThumb} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.listTitle}>{pet.name}</div>
                <div style={s.listMeta}>
                  {pet.breed || toTitle(pet.species)} · {toTitle(pet.status || "available")}
                </div>
                <div style={{ ...s.listMeta, marginTop: 6 }}>
                  Vaccinated: {pet.is_vaccinated ? "Yes" : "No"} · Dewormed: {pet.is_dewormed ? "Yes" : "No"} · Spayed/Neutered: {pet.is_neutered ? "Yes" : "No"}
                </div>
              </div>
              <span style={badgeStyle(pet.status || "available")}>{toTitle(pet.status || "available")}</span>
              <button type="button" style={s.secondaryButton} onClick={() => setSelectedPet(pet)}>
                Review proofs
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderUsers = () => (
    <section style={s.card}>
      <div style={s.sectionTop}>
        <div style={s.eyebrow}>Users</div>
        <h2 style={s.sectionTitle}>All users in the system</h2>
      </div>

      {users.length === 0 ? (
        <div style={s.emptyState}>No users found.</div>
      ) : (
        <div style={s.list}>
          {users.map((user) => {
            const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
            return (
              <article key={user.id} style={s.listCard}>
                <div style={s.listTop}>
                  <div>
                    <div style={s.listTitle}>{fullName || user.username || user.email}</div>
                    <div style={s.listMeta}>{user.email || "No email"} · {user.phone_number || "No phone"}</div>
                  </div>
                  <span style={badgeStyle(user.role === "rehomer" ? "verified" : "available")}>{toTitle(user.role)}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div style={s.shell}>
      <div style={s.glowTop} />
      <div style={s.glowBottom} />

      <div style={s.page}>
        <header style={s.topBar}>
          <div style={s.logoText}>My FurryFriends</div>
          <button type="button" style={s.logoutButton} onClick={handleLogout} aria-label="Log out admin">
            <span style={s.logoutIcon}>
              <IconLogout />
            </span>
            <span>Log out</span>
          </button>
        </header>

        {success ? <div style={{ ...s.banner, ...s.successBanner }}>{success}</div> : null}
        {error ? <div style={{ ...s.banner, ...s.errorBanner }}>{error}</div> : null}

        {loading ? (
          <div style={s.loadingCard}>Loading admin dashboard...</div>
        ) : (
          <>
            {screen === "home" ? renderHome() : null}
            {screen === "rehomers" ? renderRehomers() : null}
            {screen === "pets" ? renderPets() : null}
            {screen === "users" ? renderUsers() : null}
          </>
        )}
      </div>

      {selectedRehomer ? (
        <div style={s.modalOverlay} role="presentation">
          <div style={s.modal}>
            <div style={s.sectionTop}>
              <div style={s.eyebrow}>Document review</div>
              <h2 style={s.sectionTitle}>
                {`${selectedRehomer.first_name || ""} ${selectedRehomer.last_name || ""}`.trim() || selectedRehomer.username || selectedRehomer.email}
              </h2>
            </div>
            <div style={s.modalMeta}>Email: {selectedRehomer.email || "Not provided"}</div>
            <div style={s.modalMeta}>Phone: {selectedRehomer.phone_number || "Not provided"}</div>
            <div style={s.modalImages}>
              {selectedRehomer.profile_photo_url ? (
                <div style={s.modalImageCard}>
                  <span style={s.modalImageLabel}>Profile photo</span>
                  <img src={selectedRehomer.profile_photo_url} alt="Profile" style={s.modalImage} />
                </div>
              ) : null}
              {selectedRehomer.id_front_url ? (
                <div style={s.modalImageCard}>
                  <span style={s.modalImageLabel}>ID front</span>
                  <img src={selectedRehomer.id_front_url} alt="ID front" style={s.modalImage} />
                </div>
              ) : null}
              {selectedRehomer.id_back_url ? (
                <div style={s.modalImageCard}>
                  <span style={s.modalImageLabel}>ID back</span>
                  <img src={selectedRehomer.id_back_url} alt="ID back" style={s.modalImage} />
                </div>
              ) : null}
            </div>
            {!selectedRehomer.profile_photo_url && !selectedRehomer.id_front_url && !selectedRehomer.id_back_url ? (
              <div style={s.emptyState}>No private verification documents were uploaded yet.</div>
            ) : null}
            <div style={s.actionRow}>
              <button type="button" style={s.secondaryButton} onClick={() => setSelectedRehomer(null)}>
                Close
              </button>
              {selectedRehomer.rehomer_verification_status !== "verified" ? (
                <>
                  <button
                    type="button"
                    style={s.approveButton}
                    onClick={() => handleReview(selectedRehomer.id, "verified")}
                    disabled={processingId === selectedRehomer.id}
                  >
                    {processingId === selectedRehomer.id ? "Working..." : "Approve"}
                  </button>
                </>
              ) : null}
              {selectedRehomer.rehomer_verification_status !== "rejected" ? (
                <button
                  type="button"
                  style={s.rejectButton}
                  onClick={() => handleReview(selectedRehomer.id, "rejected")}
                  disabled={processingId === selectedRehomer.id}
                >
                  {selectedRehomer.rehomer_verification_status === "verified"
                    ? "Remove rehomer access"
                    : "Reject"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {selectedPet ? (
        <div style={s.modalOverlay} role="presentation">
          <div style={s.modal}>
            <div style={s.sectionTop}>
              <div style={s.eyebrow}>Pet medical review</div>
              <h2 style={s.sectionTitle}>{selectedPet.name}</h2>
            </div>
            <div style={s.modalMeta}>
              {selectedPet.breed || toTitle(selectedPet.species)} · {toTitle(selectedPet.status || "available")}
            </div>
            <div style={s.modalMeta}>
              Vaccinated: {selectedPet.is_vaccinated ? "Yes" : "No"} · Dewormed: {selectedPet.is_dewormed ? "Yes" : "No"} · Spayed/Neutered: {selectedPet.is_neutered ? "Yes" : "No"}
            </div>
            <div style={s.modalImages}>
              {selectedPet.vaccination_proof_url ? (
                <div style={s.modalImageCard}>
                  <span style={s.modalImageLabel}>Vaccination proof</span>
                  <img src={selectedPet.vaccination_proof_url} alt="Vaccination proof" style={s.modalImage} />
                </div>
              ) : null}
              {selectedPet.deworming_proof_url ? (
                <div style={s.modalImageCard}>
                  <span style={s.modalImageLabel}>Deworming proof</span>
                  <img src={selectedPet.deworming_proof_url} alt="Deworming proof" style={s.modalImage} />
                </div>
              ) : null}
              {selectedPet.neutering_proof_url ? (
                <div style={s.modalImageCard}>
                  <span style={s.modalImageLabel}>Spay / neuter proof</span>
                  <img src={selectedPet.neutering_proof_url} alt="Spay or neuter proof" style={s.modalImage} />
                </div>
              ) : null}
            </div>
            {!selectedPet.vaccination_proof_url && !selectedPet.deworming_proof_url && !selectedPet.neutering_proof_url ? (
              <div style={s.emptyState}>No medical proof documents were uploaded for this pet yet.</div>
            ) : null}
            <div style={s.actionRow}>
              <button type="button" style={s.secondaryButton} onClick={() => setSelectedPet(null)}>
                Close
              </button>
              <button type="button" style={s.secondaryButton} onClick={() => navigate(`/pet/${selectedPet.id}`)}>
                Open listing
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav style={s.bottomNav} aria-label="Admin navigation">
        {[
          { key: "home", label: "Home", icon: <IconHome /> },
          { key: "rehomers", label: "Rehomers", icon: <IconShield /> },
          { key: "pets", label: "Pets", icon: <IconPaw /> },
          { key: "users", label: "Users", icon: <IconUsers /> },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setScreen(item.key)}
            style={{
              ...s.navItem,
              color: screen === item.key ? "#FF9900" : "#C0A070",
            }}
          >
            <span style={s.navIcon}>{item.icon}</span>
            <span style={s.navLabel}>{item.label}</span>
            {screen === item.key ? <span style={s.navPip} /> : null}
          </button>
        ))}
      </nav>
    </div>
  );
};

const s = {
  shell: {
    minHeight: "100vh",
    background: "#FFF8EE",
    position: "relative",
    overflowX: "hidden",
    fontFamily: "'Nunito', sans-serif",
    paddingBottom: 90,
  },
  glowTop: {
    position: "absolute",
    top: -70,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: "50%",
    background: "#FFCD7A",
    filter: "blur(50px)",
    opacity: 0.32,
    pointerEvents: "none",
  },
  glowBottom: {
    position: "absolute",
    top: 360,
    left: -90,
    width: 200,
    height: 200,
    borderRadius: "50%",
    background: "#FFAA33",
    filter: "blur(50px)",
    opacity: 0.18,
    pointerEvents: "none",
  },
  page: {
    position: "relative",
    zIndex: 1,
    maxWidth: 430,
    margin: "0 auto",
    padding: "14px 16px 18px",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 4px 16px",
  },
  logoText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 16,
    fontWeight: 800,
    color: "#3D2000",
  },
  logoutButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid rgba(255,180,50,.28)",
    background: "rgba(255,255,255,.92)",
    color: "#B86A00",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
    boxShadow: "0 6px 16px rgba(255,153,0,.08)",
  },
  logoutIcon: {
    width: 16,
    height: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    borderRadius: 24,
    background: "linear-gradient(135deg,#FF9900 0%,#E87000 100%)",
    padding: 20,
    color: "#fff",
    boxShadow: "0 12px 30px rgba(255,140,0,.28)",
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,.8)",
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    margin: "0 0 8px",
  },
  heroText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.6,
    color: "rgba(255,255,255,.88)",
  },
  banner: {
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 14,
  },
  successBanner: {
    background: "#F0FFF5",
    color: "#1A7A48",
    border: "1px solid #B9E5C9",
  },
  errorBanner: {
    background: "#FFF1F1",
    color: "#C53030",
    border: "1px solid #F6B7B7",
  },
  loadingCard: {
    background: "#fff",
    borderRadius: 20,
    padding: 24,
    border: "1px solid rgba(255,180,50,.2)",
    color: "#7A5C35",
    fontWeight: 700,
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    background: "linear-gradient(145deg,#FFFAF2,#FFFFFF)",
    borderRadius: 20,
    border: "1px solid rgba(255,180,50,.22)",
    padding: 16,
    boxShadow: "0 4px 14px rgba(255,153,0,.06)",
  },
  statValue: {
    fontSize: 26,
    fontWeight: 900,
    color: "#2A1500",
    lineHeight: 1,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#9A7040",
  },
  card: {
    background: "linear-gradient(145deg,#FFFAF2,#FFFFFF)",
    borderRadius: 24,
    border: "1px solid rgba(255,180,50,.22)",
    padding: 16,
    boxShadow: "0 4px 14px rgba(255,153,0,.06)",
    marginBottom: 16,
  },
  sectionTop: {
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#D96A00",
    marginBottom: 4,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: "#2A1500",
  },
  sectionCopy: {
    margin: "8px 0 0",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.6,
    color: "#8A6A44",
  },
  emptyState: {
    borderRadius: 18,
    border: "1px solid rgba(255,180,50,.16)",
    background: "rgba(255,255,255,.78)",
    padding: 18,
    color: "#8A6A44",
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
  },
  list: {
    display: "grid",
    gap: 12,
  },
  sheet: {
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(255,180,50,.18)",
    background: "rgba(255,255,255,.76)",
  },
  sheetHead: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    alignItems: "center",
    padding: "12px 14px",
    background: "#FFF3DF",
    color: "#B86A00",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  sheetRow: {
    width: "100%",
    border: "none",
    borderTop: "1px solid rgba(255,180,50,.14)",
    background: "transparent",
    padding: "14px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    alignItems: "center",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
  },
  sheetRowRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  sheetArrow: {
    width: 16,
    height: 16,
    color: "#C0A070",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  listCard: {
    borderRadius: 18,
    border: "1px solid rgba(255,180,50,.18)",
    background: "rgba(255,255,255,.72)",
    padding: 14,
  },
  listTop: {
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  listTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#2A1500",
  },
  listMeta: {
    fontSize: 12,
    fontWeight: 600,
    color: "#9A7040",
    marginTop: 4,
  },
  actionRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 12,
  },
  approveButton: {
    border: "none",
    background: "linear-gradient(135deg,#FF9900 0%,#E87800 100%)",
    color: "#fff",
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  rejectButton: {
    border: "1px solid rgba(220,50,50,.24)",
    background: "#FFF1F1",
    color: "#C53030",
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid rgba(255,180,50,.28)",
    background: "rgba(255,255,255,.92)",
    color: "#B86A00",
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  petRow: {
    display: "grid",
    gridTemplateColumns: "56px 1fr",
    gap: 12,
    alignItems: "start",
    borderRadius: 18,
    border: "1px solid rgba(255,180,50,.18)",
    background: "rgba(255,255,255,.72)",
    padding: 12,
  },
  petThumb: {
    width: 56,
    height: 56,
    objectFit: "cover",
    borderRadius: 14,
    background: "#FFE4B0",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(34,20,0,0.46)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    zIndex: 200,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "88vh",
    overflowY: "auto",
    background: "linear-gradient(145deg,#FFFAF2,#FFFFFF)",
    borderRadius: 24,
    border: "1px solid rgba(255,180,50,.22)",
    padding: 18,
    boxShadow: "0 18px 44px rgba(51,32,8,.18)",
  },
  modalMeta: {
    fontSize: 13,
    fontWeight: 700,
    color: "#7A5C35",
    marginBottom: 8,
  },
  modalImages: {
    display: "grid",
    gap: 12,
    marginTop: 14,
  },
  modalImageCard: {
    borderRadius: 18,
    border: "1px solid rgba(255,180,50,.18)",
    background: "rgba(255,255,255,.78)",
    padding: 12,
  },
  modalImageLabel: {
    display: "inline-flex",
    marginBottom: 8,
    fontSize: 11,
    fontWeight: 800,
    color: "#D96A00",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  modalImage: {
    width: "100%",
    borderRadius: 14,
    display: "block",
  },
  pagination: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 14,
  },
  pageButton: {
    minWidth: 36,
    height: 36,
    borderRadius: 999,
    border: "1px solid rgba(255,180,50,.28)",
    background: "rgba(255,255,255,.92)",
    color: "#B86A00",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
  },
  pageButtonActive: {
    background: "#FF9900",
    color: "#fff",
    borderColor: "transparent",
    boxShadow: "0 8px 18px rgba(255,140,0,.22)",
  },
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 430,
    background: "rgba(255,255,255,.96)",
    borderTop: "1px solid rgba(255,180,50,.2)",
    display: "flex",
    padding: "10px 0 14px",
    zIndex: 100,
  },
  navItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    border: "none",
    background: "none",
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
    padding: 0,
  },
  navIcon: {
    width: 18,
    height: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: 10,
    fontWeight: 800,
  },
  navPip: {
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#FF9900",
    marginTop: 1,
  },
};

export default AdminDashboard;
