import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../pages/firebaseconfig";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../pages/firebaseconfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { deleteDoc } from "firebase/firestore";


const RehomerDashboard = () => {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [user] = useAuthState(auth);

  // Fun pet-related quotes and jokes
  const petQuotes = [
    "Helping pets find their 'fur-ever' homes, one adoption at a time!",
    "Remember: You're not just rehoming pets, you're matchmaking for life!",
    "Pro tip: The best way to keep a pet is to put it in your heart, not your pocket.",
    "Did you know? Dogs have owners, cats have staff... and you're the HR department!",
    "Warning: Rehoming pets may cause spontaneous smiles and warm fuzzies.",
    "You're doing a pawsome job! Every adoption creates two happy endings."
  ];

  const [currentQuote] = useState(
    petQuotes[Math.floor(Math.random() * petQuotes.length)]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch pets
        const petsQuery = query(
          collection(db, "pets"),
          where("rehomerId", "==", user?.uid)
        );
        const petsSnapshot = await getDocs(petsQuery);
        const petsData = petsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPets(petsData);
        
        // Only fetch requests if there are pets
        if (petsData.length > 0) {
          const requestsQuery = query(
            collection(db, "adoptionApplications"),
            where("petId", "in", petsData.map(pet => pet.id))
          );
          const requestsSnapshot = await getDocs(requestsQuery);
          setRequests(requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleAdopt = async (petId, applicationId) => {
    try {
      // Mark pet as adopted
      await updateDoc(doc(db, "pets", petId), {
        adopted: true,
        adoptedAt: new Date()
      });
      
      // Update application status
      await updateDoc(doc(db, "adoptionApplications", applicationId), {
        status: "approved"
      });
      
      // Refresh data
      setPets(pets.map(pet => 
        pet.id === petId ? { ...pet, adopted: true } : pet
      ));
      setRequests(requests.map(req => 
        req.petId === petId ? { ...req, status: "rejected" } : req
      ));
    } catch (error) {
      console.error("Error processing adoption:", error);
    }
  };
  const handleDelete = async (petId) => {
    const confirm = window.confirm("Are you sure you want to delete this pet?");
    if (!confirm) return;
  
    try {
      await deleteDoc(doc(db, "pets", petId));
      setPets(prevPets => prevPets.filter(pet => pet.id !== petId));
    } catch (error) {
      console.error("Error deleting pet:", error);
    }
  };
  

  return (
    <div style={styles.container}>
      <div style={styles.welcomeBanner}>
        <h1 style={styles.title}>Welcome to Your Rehomer Dashboard</h1>
        <p style={styles.subtitle}>Your mission: Transform "just pets" into beloved family members</p>
        <div style={styles.quoteBox}>
          <p style={styles.quote}>"{currentQuote}"</p>
        </div>
      </div>
      
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{pets.length}</h3>
          <p style={styles.statLabel}>Pets Listed</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{pets.filter(p => p.adopted).length}</h3>
          <p style={styles.statLabel}>Success Stories</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{requests.length}</h3>
          <p style={styles.statLabel}>Pending Requests</p>
        </div>
      </div>

      <div style={styles.header}>
        <button 
          onClick={() => navigate("/add-pet")} 
          style={styles.addButton}
        >
          🐾 Add New Pet
        </button>
        
        <button 
          onClick={() => setShowRequests(!showRequests)}
          style={styles.requestsButton}
        >
          {showRequests ? "🐶 Hide Requests" : `📨 View Requests (${requests.length})`}
        </button>
      </div>

      {showRequests ? (
        <div style={styles.requestsSection}>
          <h2 style={styles.sectionTitle}>Adoption Requests</h2>
          {requests.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No adoption requests yet. But don't worry - your perfect matches are out there!</p>
              <p>Try adding more photos or details to your pet listings to attract adopters.</p>
            </div>
          ) : (
            <div style={styles.requestsList}>
              {requests.map(request => (
                <div key={request.id} style={styles.requestCard}>
                  <div style={styles.requestInfo}>
                    <h3>{request.petName}</h3>
                    <p><strong>From:</strong> {request.userName}</p>
                    <p><strong>Message:</strong> "{request.message || 'No message provided'}"</p>
                    <p><strong>Status:</strong> 
                      <span style={{
                        color: request.status === "approved" ? "green" : 
                              request.status === "rejected" ? "red" : "orange",
                        fontWeight: "bold"
                      }}>
                        {request.status}
                      </span>
                    </p>
                  </div>
                  
                  {request.status === "pending" && (
                    <button
                      onClick={() => handleAdopt(request.petId, request.id)}
                      style={styles.approveButton}
                    >
                      Approve Adoption 🎉
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {loading ? (
            <div style={styles.loadingState}>
              <p>Loading your furry friends...</p>
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
                      <p><strong>Breed:</strong> {pet.breed}</p>
                      <p><strong>Age:</strong> {pet.age}</p>
                      <p><strong>Status:</strong> 
                        <span style={{
                          color: pet.adopted ? "green" : "orange",
                          fontWeight: "bold"
                        }}>
                          {pet.adopted ? "Adopted 🎉" : "Available 🏠"}
                        </span>
                      </p>
                      {pet.adopted && (
                        <p style={styles.successNote}>You made this happen!</p>
                      )}
                      <button 
  onClick={() => handleDelete(pet.id)} 
  style={{
    marginTop: "10px",
    backgroundColor: "orange",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer"
  }}
>
  Delete Pet ❌
</button>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
    transition: "all 0.3s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "&:hover": {
      backgroundColor: "#e69500",
      transform: "translateY(-2px)",
    },
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
    transition: "all 0.3s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "&:hover": {
      backgroundColor: "#3e8e41",
      transform: "translateY(-2px)",
    },
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
    transition: "transform 0.3s",
    "&:hover": {
      transform: "translateY(-5px)",
    },
  },
  petImage: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
  },
  petInfo: {
    padding: "15px",
    h3: {
      margin: "0 0 10px",
      color: "#333",
    },
    p: {
      margin: "8px 0",
      color: "#555",
    },
  },
  successNote: {
    color: "#4CAF50",
    fontWeight: "bold",
    marginTop: "10px",
  },
  requestsSection: {
    marginTop: "20px",
  },
  requestsList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    marginTop: "20px",
  },
  requestCard: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
  },
  requestInfo: {
    flex: "1",
    minWidth: "250px",
    h3: {
      margin: "0 0 10px",
      color: "#333",
    },
    p: {
      margin: "8px 0",
      color: "#555",
    },
  },
  approveButton: {
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s",
    "&:hover": {
      backgroundColor: "#3e8e41",
    },
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
    transition: "all 0.3s",
    "&:hover": {
      backgroundColor: "#e69500",
    },
  },
  loadingState: {
    textAlign: "center",
    padding: "40px",
    color: "#666",
  },
};

export default RehomerDashboard;