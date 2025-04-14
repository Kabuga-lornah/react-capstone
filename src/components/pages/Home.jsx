import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../pages/firebaseconfig";

const Home = () => {
  const [liked, setLiked] = useState([false, false, false, false, false]);
  const [featuredPets, setFeaturedPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const hardcodedPets = [
      {
        id: "1",
        name: "Bella",
        breed: "Golden Retriever",
        age: "3 years",
        personality: "Friendly and energetic",
        imageUrl: "/golden retriver.jpg"
      },
      {
        id: "2",
        name: "Milo",
        breed: "White Cat",
        age: "2 years",
        personality: "Curious and calm",
        imageUrl: "/white cat.jpg"
      },
      {
        id: "3",
        name: "Luna",
        breed: "Labrador",
        age: "1 year",
        personality: "Loyal and playful",
        imageUrl: "/Labrador.jpeg"
      },
      {
        id: "4",
        name: "Quackers",
        breed: "Parrot",
        age: "4 years",
        personality: "Talkative and bright",
        imageUrl: "/duck.jpeg"
      },
      {
        id: "5",
        name: "Nibbles",
        breed: "Rabbit",
        age: "1.5 years",
        personality: "Gentle and shy",
        imageUrl: "/nibbles.jpeg"
      }
    ];
    
    setFeaturedPets(hardcodedPets);
    setLoading(false);
  }, []);

  const toggleLike = (index) => {
    const updatedLikes = [...liked];
    updatedLikes[index] = !updatedLikes[index];
    setLiked(updatedLikes);
  };

  const handleQuizClick = () => {
    navigate("/quiz");
  };

  const handleAdoptClick = (petId) => {
    navigate(`/pet/${petId}`);
  };

  const styles = {
    container: { padding: "20px" },
    heroSection: {
      padding: "50px 20px",
      textAlign: "center",
      borderRadius: "8px",
    },
    aboutSection: {
      backgroundColor: "#fffaf0",
      padding: "50px 30px",
      borderRadius: "16px",
      marginTop: "40px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
      maxWidth: "1000px",
      margin: "60px auto",
    },
    aboutContent: {
      maxWidth: "800px",
      margin: "0 auto",
      textAlign: "center",
    },
    aboutTitle: {
      fontSize: "32px",
      fontWeight: "bold",
      marginBottom: "20px",
      color: "#FFA500",
    },
    aboutDescription: {
      fontSize: "18px",
      lineHeight: "1.8",
      color: "#444444",
    },
    
    heroContent: {
      maxWidth: "600px",
      margin: "0 auto",
    },
    heroTitle: {
      fontSize: "36px",
      marginBottom: "10px",
      fontWeight: "bold",
    },
    heroDescription: {
      fontSize: "18px",
      marginBottom: "20px",
    },
    heroButton: {
      backgroundColor: "#ffffff",
      color: "#FFA500",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      fontSize: "16px",
    },
    heroAnimations: {
      marginTop: "40px",
      marginLeft: "80px",
      position: "relative",
      height: "0px",
    },
    leftAnimation: {
      position: "absolute",
      left: "50",
      width: "100px",
      animation: "floatLeft 4s ease-in-out infinite",
    },
    featuredSection: {
      textAlign: "center",
      marginBottom: "30px",
    },
    sectionTitle: {
      fontSize: "28px",
      marginBottom: "20px",
      fontWeight: "bold",
    },
    petCardsContainer: {
      display: "flex",
      justifyContent: "center",
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
      height: "400px",
    },
    petImage: {
      width: "100%",
      height: "180px",
      objectFit: "contain",
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
      fontSize: "28px",
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
    },
    quizSection: {
      backgroundColor: "#ffffff",
      padding: "40px 20px",
      borderRadius: "12px",
      marginTop: "30px",
    },
    quizContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "50px",
      maxWidth: "1100px",
      margin: "0 auto",
      flexWrap: "wrap",
    },
    quizTextWrapper: {
      flex: "1",
      textAlign: "left",
    },
    quizImageWrapper: {
      flex: "1",
      textAlign: "right",
    },
    quizImage: {
      maxWidth: "100%",
      height: "400px",
      borderRadius: "10px",
    },
    quizText: {
      fontSize: "18px",
      color: "#333333",
      lineHeight: "1.7",
      marginBottom: "20px",
    },
    quizButton: {
      backgroundColor: "#FFA500",
      color: "#ffffff",
      border: "none",
      padding: "12px 24px",
      borderRadius: "6px",
      fontSize: "16px",
      cursor: "pointer",
      transition: "background-color 0.3s ease",
    },
    aboutSection: {
      // backgroundColor: "#f1f1f1",
      padding: "30px",
      borderRadius: "8px",
      textAlign: "center",
    },
    aboutDescription: {
      fontSize: "18px",
      lineHeight: "1.6",
      color: "#333333",
    },
  };

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroAnimations}>
          <img src="/paw gif.gif" alt="Paw animation" style={styles.leftAnimation} />
        </div>
        <div style={styles.heroContent}>
          <h2 style={styles.heroTitle}>Welcome to My FurryFriends</h2>
          <p style={styles.heroDescription}>
            Where paws meet hearts and every tail has a story. Discover your new
            best friend from our handpicked selection of lovable, loyal, and
            life-changing companions.
          </p>
          <button style={styles.heroButton} onClick={() => navigate("/pets")}>Meet Your Match</button>
        </div>
      </section>

      <hr />

      {/* Featured Pets Section */}
      <section style={styles.featuredSection}>
        <h3 style={styles.sectionTitle}>Featured Pets</h3>
        {loading ? (
          <p>Loading featured pets...</p>
        ) : (
          <div style={styles.petCardsContainer}>
            {featuredPets.map((pet, index) => (
              <div key={pet.id} style={styles.petCard}>
                <img
                  src={pet.imageUrl || "/default-pet.jpg"}
                  alt={pet.name}
                  style={styles.petImage}
                />
                <h4 style={styles.petName}>
                  {pet.name}
                  <span
                    style={{
                      ...styles.heart,
                      color: liked[index] ? "orange" : "#ccc",
                    }}
                    onClick={() => toggleLike(index)}
                  >
                    ♥
                  </span>
                </h4>
                <p style={styles.petDescription}>{pet.breed} • {pet.age}</p>
                <p style={styles.petPersonality}>{pet.personality}</p>
                <button
                  style={styles.petButton}
                  onClick={() => handleAdoptClick(pet.id)}
                >
                  Adopt Me
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quiz Section */}
      <section style={styles.quizSection}>
        <div style={styles.quizContent}>
          <div style={styles.quizTextWrapper}>
            <h3 style={styles.sectionTitle}>Purr-sonality Quiz</h3>
            <p style={styles.quizText}>
              Not sure which fur baby is your spirit animal? 🐾
              <br /> Take our fun personality quiz and get matched with your ideal
              furry friend!
              <br /> Whether you dream of cuddling a bunny, bonding with a bearded
              dragon, or strolling with a duckling—this is the place for you.
            </p>
            <button style={styles.quizButton} onClick={handleQuizClick}>
              Take the Quiz
            </button>
          </div>
          <div style={styles.quizImageWrapper}>
            <img src="/bunny.jpg" alt="Quiz pets" style={styles.quizImage} />
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section style={styles.aboutSection}>
  <div style={styles.aboutContent}>
    <h3 style={styles.aboutTitle}>About Us</h3>
    <p style={styles.aboutDescription}>
      At <strong>My FurryFriends</strong>, we believe every pet deserves a forever home filled with love and cuddles. 🐾
      <br /><br />
      From playful puppies to wise parrots, our platform connects kind humans with their ideal companions. We’re more than an adoption center — we’re a heartwarming community built around second chances, wagging tails, and happy purrs.
    </p>
  </div>
</section>

    </div>
  );
};

export default Home;
