import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPets } from "../../services/api";
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
});

const trustStats = [
  {
    title: "Verified pet profiles",
    description: "Browse clear pet details, photos, and care notes before you apply.",
  },
  {
    title: "Safe adoption requests",
    description: "Adoption interest is handled through tracked application flows.",
  },
  {
    title: "Rehomer dashboards",
    description: "Pet owners can manage listings, requests, and updates in one place.",
  },
  {
    title: "Pet Pouch saving",
    description: "Save promising companions so you can revisit them anytime.",
  },
];

const howItWorksSteps = [
  {
    title: "Browse available pets",
    description: "Explore dogs, cats, birds, rabbits, and more with helpful profile details.",
  },
  {
    title: "Save favorites to Pet Pouch",
    description: "Keep your top matches in one spot while you compare personalities and care needs.",
  },
  {
    title: "Apply for adoption",
    description: "Send your interest through the app when you feel ready to meet a pet.",
  },
  {
    title: "Rehomer reviews and approves",
    description: "Pet owners can review applications, respond, and move the adoption forward safely.",
  },
];

const funFacts = [
  "Dogs read human body language amazingly well and often notice our feelings before we say a word.",
  "Cats use slow blinks as a sign of comfort, trust, and relaxed affection.",
  "Rabbits do happy jumps called binkies when they feel playful and safe.",
  "Parrots need daily enrichment because many are clever problem-solvers who get bored easily.",
  "Ducks are social animals and usually feel happiest with routine, space, and companionship.",
  "Many reptiles thrive best when their temperature and lighting stay steady every day.",
];

const careTips = [
  {
    title: "Prepare your home",
    description: "Set up bedding, food bowls, safe toys, and a quiet resting area before adoption day.",
  },
  {
    title: "Budget beyond the basics",
    description: "Plan for food, grooming, routine vet visits, and emergency care before bringing a pet home.",
  },
  {
    title: "Ask health questions",
    description: "Check vaccination, deworming, feeding routines, and medical history before you commit.",
  },
  {
    title: "Give pets time to adjust",
    description: "New pets often need patience, gentle routines, and calm spaces while they settle in.",
  },
];

const Home = () => {
  const [liked, setLiked] = useState([]);
  const [featuredPets, setFeaturedPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [factIndex, setFactIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchFeaturedPets = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await listPets();
        const petsData = Array.isArray(response) ? response : response?.results || [];
        const normalizedPets = petsData.map(normalizePet).slice(0, 4);

        setFeaturedPets(normalizedPets);
        setLiked(normalizedPets.map(() => false));
      } catch (fetchError) {
        console.error("Error fetching featured pets:", fetchError);
        setError(fetchError.message || "Failed to load featured pets.");
        setFeaturedPets([]);
        setLiked([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedPets();
  }, []);

  const toggleLike = (index) => {
    const updatedLikes = [...liked];
    updatedLikes[index] = !updatedLikes[index];
    setLiked(updatedLikes);
  };

  const showAnotherFact = () => {
    setFactIndex((currentIndex) => (currentIndex + 1) % funFacts.length);
  };

  const handleAdoptClick = (petId) => {
    if (!user) {
      navigate("/login/user");
      return;
    }

    navigate(`/pet/${petId}`);
  };

  const getPetLocation = (pet) =>
    pet.location ||
    [pet.city, pet.state, pet.country].filter(Boolean).join(", ") ||
    "Location coming soon";

  const getPetStatus = (pet) => toTitleCase(pet.status || "available");

  const styles = {
    page: {
      background:
        "linear-gradient(180deg, #fff9f0 0%, #fffefb 26%, #ffffff 100%)",
      color: "#2d3748",
    },
    sectionShell: {
      width: "min(1180px, calc(100% - 32px))",
      margin: "0 auto",
    },
    heroSection: {
      padding: "48px 0 28px",
    },
    heroCard: {
      background:
        "linear-gradient(135deg, rgba(255,165,0,0.16) 0%, rgba(255,243,224,0.95) 45%, rgba(255,255,255,1) 100%)",
      borderRadius: "28px",
      padding: "clamp(24px, 4vw, 44px)",
      boxShadow: "0 18px 42px rgba(0,0,0,0.08)",
      border: "1px solid rgba(255,165,0,0.14)",
      overflow: "hidden",
      position: "relative",
    },
    heroGlow: {
      position: "absolute",
      right: "-60px",
      top: "-40px",
      width: "220px",
      height: "220px",
      borderRadius: "50%",
      background: "rgba(255,165,0,0.14)",
      filter: "blur(8px)",
    },
    heroGrid: {
      position: "relative",
      zIndex: 1,
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "28px",
      alignItems: "center",
    },
    heroTextBlock: {
      maxWidth: "620px",
    },
    eyebrow: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 14px",
      borderRadius: "999px",
      backgroundColor: "#fff4df",
      color: "#9c5f00",
      fontWeight: "700",
      fontSize: "13px",
      marginBottom: "18px",
    },
    heroTitle: {
      fontSize: "clamp(2.2rem, 5vw, 4rem)",
      lineHeight: 1.05,
      margin: "0 0 18px",
      color: "#1f2937",
    },
    heroDescription: {
      fontSize: "clamp(1rem, 2vw, 1.15rem)",
      lineHeight: 1.8,
      color: "#4a5568",
      marginBottom: "24px",
      maxWidth: "560px",
    },
    heroActions: {
      display: "flex",
      flexWrap: "wrap",
      gap: "14px",
      marginBottom: "22px",
    },
    primaryButton: {
      backgroundColor: "#FFA500",
      color: "#ffffff",
      border: "none",
      borderRadius: "999px",
      cursor: "pointer",
      fontSize: "15px",
      fontWeight: "700",
      padding: "14px 22px",
      boxShadow: "0 10px 20px rgba(255,165,0,0.24)",
    },
    secondaryButton: {
      backgroundColor: "#ffffff",
      color: "#9c5f00",
      border: "1px solid rgba(255,165,0,0.4)",
      borderRadius: "999px",
      cursor: "pointer",
      fontSize: "15px",
      fontWeight: "700",
      padding: "14px 22px",
    },
    heroSupportText: {
      color: "#6b7280",
      fontSize: "15px",
      lineHeight: 1.7,
    },
    heroVisual: {
      display: "grid",
      gap: "16px",
      alignContent: "center",
    },
    heroImageFrame: {
      backgroundColor: "#ffffff",
      borderRadius: "24px",
      padding: "18px",
      boxShadow: "0 16px 30px rgba(0,0,0,0.08)",
      border: "1px solid rgba(255,165,0,0.12)",
    },
    heroImage: {
      width: "100%",
      height: "clamp(240px, 34vw, 380px)",
      objectFit: "cover",
      borderRadius: "18px",
      display: "block",
    },
    heroMiniCards: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: "12px",
    },
    heroMiniCard: {
      backgroundColor: "#ffffff",
      borderRadius: "18px",
      padding: "14px 16px",
      border: "1px solid rgba(255,165,0,0.14)",
      boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
    },
    heroMiniValue: {
      fontSize: "1.4rem",
      fontWeight: "800",
      color: "#FFA500",
      marginBottom: "6px",
    },
    trustStatsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
      gap: "16px",
      marginTop: "24px",
    },
    trustCard: {
      backgroundColor: "#ffffff",
      borderRadius: "18px",
      padding: "18px",
      boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
      border: "1px solid rgba(255,165,0,0.12)",
    },
    trustTitle: {
      fontSize: "1rem",
      fontWeight: "800",
      marginBottom: "8px",
      color: "#1f2937",
    },
    trustText: {
      color: "#5f6c7b",
      lineHeight: 1.6,
      fontSize: "14px",
      margin: 0,
    },
    section: {
      padding: "40px 0",
    },
    sectionHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "end",
      gap: "16px",
      flexWrap: "wrap",
      marginBottom: "22px",
    },
    sectionTitle: {
      fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
      margin: "0 0 8px",
      color: "#1f2937",
    },
    sectionDescription: {
      margin: 0,
      color: "#5f6c7b",
      lineHeight: 1.7,
      maxWidth: "700px",
      fontSize: "15px",
    },
    featuredGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: "20px",
    },
    petCard: {
      backgroundColor: "#ffffff",
      borderRadius: "22px",
      overflow: "hidden",
      boxShadow: "0 14px 28px rgba(0,0,0,0.07)",
      border: "1px solid rgba(255,165,0,0.12)",
      display: "flex",
      flexDirection: "column",
    },
    petImageWrap: {
      position: "relative",
      backgroundColor: "#fff7eb",
    },
    petImage: {
      width: "100%",
      height: "220px",
      objectFit: "cover",
      display: "block",
    },
    petBadgeRow: {
      position: "absolute",
      top: "14px",
      left: "14px",
      right: "14px",
      display: "flex",
      justifyContent: "space-between",
      gap: "10px",
      alignItems: "center",
    },
    statusBadge: {
      backgroundColor: "rgba(255,255,255,0.94)",
      color: "#1f2937",
      borderRadius: "999px",
      padding: "7px 12px",
      fontSize: "12px",
      fontWeight: "800",
      border: "1px solid rgba(0,0,0,0.05)",
    },
    likeButton: {
      width: "38px",
      height: "38px",
      borderRadius: "50%",
      border: "none",
      backgroundColor: "rgba(255,255,255,0.94)",
      cursor: "pointer",
      fontSize: "18px",
      boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
    },
    petBody: {
      padding: "18px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      flex: 1,
    },
    petHeadingRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      alignItems: "start",
    },
    petName: {
      margin: 0,
      fontSize: "1.2rem",
      color: "#1f2937",
    },
    petType: {
      color: "#9c5f00",
      fontWeight: "700",
      fontSize: "13px",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
    },
    petMeta: {
      color: "#5f6c7b",
      fontSize: "14px",
      lineHeight: 1.6,
      margin: 0,
    },
    tagRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
    },
    tag: {
      backgroundColor: "#fff4df",
      color: "#9c5f00",
      borderRadius: "999px",
      padding: "6px 10px",
      fontSize: "12px",
      fontWeight: "700",
    },
    petActionRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
      marginTop: "auto",
      flexWrap: "wrap",
    },
    actionButton: {
      backgroundColor: "#FFA500",
      color: "#ffffff",
      border: "none",
      borderRadius: "999px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "800",
      padding: "12px 18px",
      minWidth: "136px",
    },
    plainButton: {
      backgroundColor: "transparent",
      color: "#9c5f00",
      border: "none",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: "14px",
      padding: 0,
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "18px",
    },
    infoCard: {
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      padding: "22px",
      boxShadow: "0 12px 26px rgba(0,0,0,0.06)",
      border: "1px solid rgba(255,165,0,0.1)",
    },
    stepNumber: {
      width: "42px",
      height: "42px",
      borderRadius: "50%",
      backgroundColor: "#fff4df",
      color: "#9c5f00",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "800",
      marginBottom: "14px",
    },
    cardTitle: {
      margin: "0 0 10px",
      fontSize: "1.05rem",
      color: "#1f2937",
    },
    cardText: {
      margin: 0,
      color: "#5f6c7b",
      lineHeight: 1.7,
      fontSize: "14px",
    },
    factSection: {
      padding: "40px 0",
    },
    factCard: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "20px",
      background:
        "linear-gradient(135deg, #fff3de 0%, #ffffff 50%, #fff9ef 100%)",
      borderRadius: "26px",
      padding: "clamp(22px, 4vw, 34px)",
      boxShadow: "0 14px 30px rgba(0,0,0,0.07)",
      border: "1px solid rgba(255,165,0,0.12)",
      alignItems: "center",
    },
    factLabel: {
      display: "inline-block",
      backgroundColor: "#ffffff",
      color: "#9c5f00",
      padding: "7px 12px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: "800",
      marginBottom: "14px",
    },
    factText: {
      margin: "0 0 18px",
      fontSize: "clamp(1.05rem, 2vw, 1.3rem)",
      lineHeight: 1.8,
      color: "#2d3748",
    },
    factButton: {
      backgroundColor: "#1f2937",
      color: "#ffffff",
      border: "none",
      borderRadius: "999px",
      cursor: "pointer",
      padding: "12px 18px",
      fontWeight: "700",
      fontSize: "14px",
    },
    factAside: {
      backgroundColor: "rgba(255,255,255,0.8)",
      borderRadius: "20px",
      padding: "18px",
      border: "1px solid rgba(255,165,0,0.1)",
    },
    factAsideTitle: {
      margin: "0 0 10px",
      color: "#1f2937",
      fontSize: "1rem",
    },
    factAsideText: {
      margin: 0,
      color: "#5f6c7b",
      lineHeight: 1.7,
      fontSize: "14px",
    },
    quizSection: {
      padding: "40px 0",
    },
    quizCard: {
      backgroundColor: "#ffffff",
      borderRadius: "26px",
      padding: "clamp(22px, 4vw, 34px)",
      boxShadow: "0 14px 30px rgba(0,0,0,0.06)",
      border: "1px solid rgba(255,165,0,0.12)",
    },
    quizContent: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "30px",
      alignItems: "center",
    },
    quizImageWrap: {
      backgroundColor: "#fff9ef",
      borderRadius: "22px",
      padding: "12px",
    },
    quizImage: {
      width: "100%",
      height: "320px",
      objectFit: "cover",
      borderRadius: "16px",
      display: "block",
    },
    missionSection: {
      padding: "40px 0 60px",
    },
    missionCard: {
      background:
        "linear-gradient(135deg, #fffaf0 0%, #ffffff 55%, #fff7e3 100%)",
      borderRadius: "26px",
      padding: "clamp(24px, 4vw, 38px)",
      boxShadow: "0 14px 30px rgba(0,0,0,0.06)",
      border: "1px solid rgba(255,165,0,0.1)",
    },
    missionGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "18px",
      marginTop: "24px",
    },
    missionMiniCard: {
      backgroundColor: "#ffffff",
      borderRadius: "18px",
      padding: "18px",
      border: "1px solid rgba(255,165,0,0.1)",
    },
    missionMiniTitle: {
      margin: "0 0 8px",
      fontSize: "1rem",
      color: "#1f2937",
    },
    missionMiniText: {
      margin: 0,
      color: "#5f6c7b",
      lineHeight: 1.65,
      fontSize: "14px",
    },
    statusMessage: {
      maxWidth: "700px",
      margin: "0 auto",
      padding: "18px",
      borderRadius: "16px",
      backgroundColor: "#fffaf0",
      color: "#555",
      lineHeight: 1.7,
    },
    errorMessage: {
      backgroundColor: "#fff5f5",
      color: "#c53030",
      border: "1px solid #feb2b2",
    },
  };

  return (
    <div style={styles.page}>
      <section style={styles.heroSection}>
        <div style={styles.sectionShell}>
          <div style={styles.heroCard}>
            <div style={styles.heroGlow}></div>
            <div style={styles.heroGrid}>
              <div style={styles.heroTextBlock}>
                <div style={styles.eyebrow}>Warm, safe, joyful pet adoption</div>
                <h1 style={styles.heroTitle}>
                  Find a pet companion who truly fits your home and heart.
                </h1>
                <p style={styles.heroDescription}>
                  My FurryFriends helps adopters explore trusted pet profiles, save
                  favorites, apply safely, and connect with caring rehomers who
                  want every animal to land in the right forever home.
                </p>
                <div style={styles.heroActions}>
                  <button
                    style={styles.primaryButton}
                    onClick={() => navigate("/pets")}
                  >
                    Browse Pets
                  </button>
                  <button
                    style={styles.secondaryButton}
                    onClick={() => navigate("/quiz")}
                  >
                    Take Quiz
                  </button>
                </div>
                <p style={styles.heroSupportText}>
                  Whether you&apos;re searching for a calm cuddle buddy, an energetic
                  walking partner, or a curious little character, we make the first
                  steps feel welcoming and easy to follow.
                </p>
              </div>

              <div style={styles.heroVisual}>
                <div style={styles.heroImageFrame}>
                  <img
                    src="/bunny.jpg"
                    alt="Happy pets waiting for adoption"
                    style={styles.heroImage}
                  />
                </div>
                <div style={styles.heroMiniCards}>
                  <div style={styles.heroMiniCard}>
                    <div style={styles.heroMiniValue}>4 steps</div>
                    <div style={styles.cardText}>From browsing to approved adoption.</div>
                  </div>
                  <div style={styles.heroMiniCard}>
                    <div style={styles.heroMiniValue}>1 pouch</div>
                    <div style={styles.cardText}>Save favorites and revisit them fast.</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.trustStatsGrid}>
              {trustStats.map((stat) => (
                <div key={stat.title} style={styles.trustCard}>
                  <h3 style={styles.trustTitle}>{stat.title}</h3>
                  <p style={styles.trustText}>{stat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionShell}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Featured Pets</h2>
              <p style={styles.sectionDescription}>
                Meet a few of the pets currently available through the Django API.
                Each profile highlights personality, availability, and location to
                help you narrow down your best match.
              </p>
            </div>
            <button
              style={styles.secondaryButton}
              onClick={() => navigate("/pets")}
            >
              View All Pets
            </button>
          </div>

          {loading ? (
            <p>Loading featured pets...</p>
          ) : error ? (
            <div style={{ ...styles.statusMessage, ...styles.errorMessage }}>
              {error}
            </div>
          ) : featuredPets.length === 0 ? (
            <div style={styles.statusMessage}>
              No pets are available yet. Check back soon for new furry friends.
            </div>
          ) : (
            <div style={styles.featuredGrid}>
              {featuredPets.map((pet, index) => (
                <div key={pet.id} style={styles.petCard}>
                  <div style={styles.petImageWrap}>
                    <img
                      src={pet.imageUrl || "/default-pet.jpg"}
                      alt={pet.name}
                      style={styles.petImage}
                    />
                    <div style={styles.petBadgeRow}>
                      <span style={styles.statusBadge}>{getPetStatus(pet)}</span>
                      <button
                        style={styles.likeButton}
                        onClick={() => toggleLike(index)}
                        aria-label={`Like ${pet.name}`}
                      >
                        <span style={{ color: liked[index] ? "#ef4444" : "#c7c7c7" }}>
                          {"\u2665"}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div style={styles.petBody}>
                    <div style={styles.petHeadingRow}>
                      <div>
                        <h3 style={styles.petName}>{pet.name}</h3>
                        <div style={styles.petType}>{toTitleCase(pet.type)}</div>
                      </div>
                    </div>
                    <p style={styles.petMeta}>
                      {pet.breed || "Breed coming soon"} {"\u2022"} {pet.age || "Age coming soon"}
                    </p>
                    <p style={styles.petMeta}>{getPetLocation(pet)}</p>
                    <div style={styles.tagRow}>
                      {(pet.personality || []).slice(0, 4).map((trait) => (
                        <span key={`${pet.id}-${trait}`} style={styles.tag}>
                          {trait}
                        </span>
                      ))}
                    </div>
                    <div style={styles.petActionRow}>
                      <button
                        style={styles.actionButton}
                        onClick={() => handleAdoptClick(pet.id)}
                      >
                        Adopt Me
                      </button>
                      <button
                        style={styles.plainButton}
                        onClick={() => navigate(`/pet/${pet.id}`)}
                      >
                        View details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionShell}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>How It Works</h2>
              <p style={styles.sectionDescription}>
                The adoption flow is designed to be simple, transparent, and kind
                to both adopters and rehomers.
              </p>
            </div>
          </div>
          <div style={styles.infoGrid}>
            {howItWorksSteps.map((step, index) => (
              <div key={step.title} style={styles.infoCard}>
                <div style={styles.stepNumber}>0{index + 1}</div>
                <h3 style={styles.cardTitle}>{step.title}</h3>
                <p style={styles.cardText}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.factSection}>
        <div style={styles.sectionShell}>
          <div style={styles.factCard}>
            <div>
              <span style={styles.factLabel}>Fun Pet Fact</span>
              <p style={styles.factText}>{funFacts[factIndex]}</p>
              <button style={styles.factButton} onClick={showAnotherFact}>
                Show another fact
              </button>
            </div>
            <div style={styles.factAside}>
              <h3 style={styles.factAsideTitle}>Why this matters</h3>
              <p style={styles.factAsideText}>
                Small facts can make a big difference when choosing the right pet.
                Learning how different animals behave helps adopters ask better
                questions and prepare more thoughtfully for real life together.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionShell}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Pet Care Tips for New Adopters</h2>
              <p style={styles.sectionDescription}>
                A smooth first week starts with simple planning, realistic
                expectations, and a calm welcome for your new companion.
              </p>
            </div>
          </div>
          <div style={styles.infoGrid}>
            {careTips.map((tip) => (
              <div key={tip.title} style={styles.infoCard}>
                <h3 style={styles.cardTitle}>{tip.title}</h3>
                <p style={styles.cardText}>{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.quizSection}>
        <div style={styles.sectionShell}>
          <div style={styles.quizCard}>
            <div style={styles.quizContent}>
              <div>
                <h2 style={styles.sectionTitle}>Take the Purr-sonality Quiz</h2>
                <p style={styles.sectionDescription}>
                  Not sure where to begin? The quiz helps you think about your
                  routine, energy level, and lifestyle so you can start your search
                  with pets whose personalities feel naturally compatible.
                </p>
                <div style={{ marginTop: "20px" }}>
                  <button style={styles.primaryButton} onClick={() => navigate("/quiz")}>
                    Start the Quiz
                  </button>
                </div>
              </div>
              <div style={styles.quizImageWrap}>
                <img src="/bunny.jpg" alt="Quiz pets" style={styles.quizImage} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.missionSection}>
        <div style={styles.sectionShell}>
          <div style={styles.missionCard}>
            <div className="mission-copy">
              <h2 style={styles.sectionTitle}>Our Mission</h2>
              <p style={styles.sectionDescription}>
                My FurryFriends connects adopters with pets who need loving homes,
                while giving rehomers a safe, organized way to present profiles,
                review applications, and make thoughtful decisions. Safe adoption
                matters because it protects pets from rushed placements, helps
                adopters prepare properly, and gives rehomers confidence that each
                pet is moving toward a more stable future.
              </p>
            </div>

            <div style={styles.missionGrid}>
              <div style={styles.missionMiniCard}>
                <h3 style={styles.missionMiniTitle}>For adopters</h3>
                <p style={styles.missionMiniText}>
                  Discover pets with clearer details, save favorites, and move
                  through the adoption process with more confidence.
                </p>
              </div>
              <div style={styles.missionMiniCard}>
                <h3 style={styles.missionMiniTitle}>For rehomers</h3>
                <p style={styles.missionMiniText}>
                  Manage pet listings, respond to interest, and review applicants
                  through one practical dashboard.
                </p>
              </div>
              <div style={styles.missionMiniCard}>
                <h3 style={styles.missionMiniTitle}>For pets</h3>
                <p style={styles.missionMiniText}>
                  Every feature is meant to support calmer transitions, better
                  matches, and happier long-term homes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
