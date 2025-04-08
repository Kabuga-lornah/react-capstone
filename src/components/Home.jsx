import React, { useState } from "react";
import { useNavigate } from "react-router-dom";  // Import useNavigate

const Home = () => {
  const [liked, setLiked] = useState([false, false, false]);
  const navigate = useNavigate();  // useNavigate hook for navigation

  const toggleLike = (index) => {
    const updatedLikes = [...liked];
    updatedLikes[index] = !updatedLikes[index];
    setLiked(updatedLikes);
  };

  const handleQuizClick = () => {
    navigate("/quiz");  // Navigate to the Quiz page
  };

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroAnimations}>
          <img
            src="/paw gif.gif"
            alt="Paw animation"
            style={styles.leftAnimation}
          />
        </div>

        <div style={styles.heroContent}>
          <h2 style={styles.heroTitle}>Welcome to My FurryFriends</h2>
          <p style={styles.heroDescription}>
            Where paws meet hearts and every tail has a story. Discover your new
            best friend from our handpicked selection of lovable, loyal, and
            life-changing companions.
          </p>
          <button style={styles.heroButton}>Meet Your Match</button>
        </div>
      </section>

      <hr />
      <section style={styles.featuredSection}>
        <h3 style={styles.sectionTitle}>Featured Pets</h3>
        <div style={styles.petCardsContainer}>
          {pets.map((pet, index) => (
            <div key={index} style={styles.petCard}>
              <img src={pet.image} alt="Pet" style={styles.petImage} />
              <h4 style={styles.petName}>
                {pet.name}{" "}
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
              <p style={styles.petDescription}>{pet.description}</p>
              <button style={styles.petButton}>Adopt Me</button>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.quizSection}>
        <div style={styles.quizContent}>
          <div style={styles.quizTextWrapper}>
            <h3 style={styles.sectionTitle}>Purr-sonality Quiz</h3>
            <p style={styles.quizText}>
              Not sure which fur baby is your spirit animal? 🐾 <br />
              Take our fun personality quiz and get matched with your ideal furry friend! <br />
              Whether you dream of cuddling a bunny, bonding with a bearded dragon, or strolling with a duckling—this is the place for you.
            </p>
            <button
              style={styles.quizButton}
              onClick={handleQuizClick}  // Add onClick handler
            >
              Take the Quiz
            </button>
          </div>

          <div style={styles.quizImageWrapper}>
            <img
              src="/bunny.jpg"
              alt="Quiz pets"
              style={styles.quizImage}
            />
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section style={styles.aboutSection}>
        <h3 style={styles.sectionTitle}>About Us</h3>
        <p style={styles.aboutDescription}>
          At My FurryFriends, we believe every pet deserves a loving home. We
          specialize in offering a wide range of pets that are ready to be
          adopted by people like you. Whether you're looking for a playful
          puppy, a calm kitten, or an exotic bird, we've got you covered.
        </p>
      </section>
    </div>
  );
};



const pets = [
  {
    name: "Fluffy",
    description: "A friendly golden retriever.",
    image: "/golden retriver.jpg",
  },
  {
    name: "Bella",
    description: "A curious little kitten.",
    image: "/white cat.jpg",
  },
  {
    name: "Slither",
    description: "A calm, elegant corn snake.",
    image: "/snake.jpg",
  },
  {
    name: "Peep",
    description: "A cheerful yellow chick.",
    image: "/chick.jpg",
  },
  {
    name: "Quackers",
    description: "Loves to splash and waddle.",
    image: "/duck.jpeg",
  },
  
];

const styles = {
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
        marginLeft: "60px",
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
      

  container: {
    padding: "20px",
  },
  heroSection: {
    padding: "50px 20px",
    textAlign: "center",
    borderRadius: "8px",
    // marginBottom: "30px",
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
    height: "370px", 
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
    fontSize: "38px",
    transition: "color 0.3s ease",
    userSelect: "none",
  },
  petDescription: {
    fontSize: "14px",
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
  aboutSection: {
    backgroundColor: "#f1f1f1",
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

export default Home;
