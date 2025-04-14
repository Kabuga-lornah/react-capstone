import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../pages/firebaseconfig";
import { auth } from "../pages/firebaseconfig";

const PetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isInterested, setIsInterested] = useState(false);

  useEffect(() => {
    const fetchPet = async () => {
      try {
        const docRef = doc(db, "pets", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setPet({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError("Pet not found");
        }
      } catch (err) {
        setError("Failed to fetch pet details");
      } finally {
        setLoading(false);
      }
    };

    fetchPet();
  }, [id]);

  const handleAdoptInterest = async () => {
    if (!auth.currentUser) {
      navigate("/login/user");
      return;
    }

    try {
      const petRef = doc(db, "pets", id);
      await updateDoc(petRef, {
        interestedUsers: [...(pet.interestedUsers || []), auth.currentUser.uid]
      });
      
      // Create adoption application
      await addDoc(collection(db, "adoptionApplications"), {
        petId: id,
        userId: auth.currentUser.uid,
        petName: pet.name,
        userName: auth.currentUser.displayName || "Anonymous",
        userEmail: auth.currentUser.email,
        status: "pending",
        createdAt: new Date(),
      });
      
      setIsInterested(true);
    } catch (err) {
      setError("Failed to express interest: " + err.message);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!pet) return <p>Pet not found</p>;

  return (
    <div style={styles.container}>
      <button 
        onClick={() => navigate(-1)} 
        style={styles.backButton}
      >
        &larr; Back to Pets
      </button>
      
      <div style={styles.petContainer}>
        <div style={styles.imageContainer}>
          <img 
            src={pet.imageUrl || "/default-pet.jpg"} 
            alt={pet.name}
            style={styles.petImage}
          />
        </div>
        
        <div style={styles.detailsContainer}>
          <h1 style={styles.petName}>{pet.name}</h1>
          <p style={styles.rehomer}>Listed by: {pet.rehomerName}</p>
          
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <h3>Breed</h3>
              <p>{pet.breed}</p>
            </div>
            <div style={styles.detailItem}>
              <h3>Age</h3>
              <p>{pet.age}</p>
            </div>
            <div style={styles.detailItem}>
              <h3>Gender</h3>
              <p>{pet.gender}</p>
            </div>
            <div style={styles.detailItem}>
              <h3>Status</h3>
              <p>{pet.adopted ? "Adopted" : "Available"}</p>
            </div>
          </div>
          
          <div style={styles.section}>
            <h2>About {pet.name}</h2>
            <p>{pet.description}</p>
          </div>
          
          <div style={styles.section}>
            <h2>Personality</h2>
            <div style={styles.traitsContainer}>
              {pet.personality.map((trait, index) => (
                <span key={index} style={styles.trait}>
                  {trait}
                </span>
              ))}
            </div>
          </div>
          
          {pet.requirements && (
            <div style={styles.section}>
              <h2>Special Requirements</h2>
              <p>{pet.requirements}</p>
            </div>
          )}
          
          {!pet.adopted && (
            <div style={styles.actionSection}>
              {isInterested ? (
                <p style={styles.successMessage}>
                  Thank you for your interest! The rehomer will contact you soon.
                </p>
              ) : (
                <button 
                  onClick={handleAdoptInterest}
                  style={styles.adoptButton}
                >
                  I'm Interested in Adopting
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
  },
  backButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#FFA500",
    fontSize: "16px",
    cursor: "pointer",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  petContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "40px",
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
    },
  },
  imageContainer: {
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  petImage: {
    width: "100%",
    height: "auto",
    display: "block",
  },
  detailsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },
  petName: {
    fontSize: "32px",
    color: "#333",
    margin: "0",
  },
  rehomer: {
    color: "#666",
    fontSize: "16px",
    margin: "5px 0 0",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "15px",
    backgroundColor: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
  },
  detailItem: {
    h3: {
      margin: "0 0 5px",
      fontSize: "14px",
      color: "#666",
    },
    p: {
      margin: "0",
      fontSize: "18px",
      fontWeight: "500",
    },
  },
  section: {
    h2: {
      fontSize: "20px",
      margin: "0 0 15px",
      color: "#444",
    },
    p: {
      margin: "0",
      lineHeight: "1.6",
    },
  },
  traitsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  trait: {
    backgroundColor: "#FFA500",
    color: "white",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "14px",
  },
  actionSection: {
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "1px solid #eee",
  },
  adoptButton: {
    backgroundColor: "#FFA500",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "5px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.3s",
    "&:hover": {
      backgroundColor: "#e69500",
    },
  },
  successMessage: {
    color: "#4CAF50",
    fontSize: "16px",
  },
};

export default PetDetail;