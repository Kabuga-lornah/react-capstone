import { useState, useEffect, useRef, useContext } from "react";

import { useAuth } from "../pages/AuthContext";
import { collection, query, where, getDocs, addDoc, getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../pages/firebaseconfig";
import { useNavigate } from "react-router-dom";
import { PetPouchContext } from './PetPouchContext';




const personalityTags = [
  "Friendly",
  "Shy",
  "Energetic",
  "Calm",
  "Playful",
  "Independent",
  "Affectionate",
  "Intelligent",
  "Loyal",
];

const styles = {
  petCardsContainer: {
    display: "flex",
    // justifyContent: "center",
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
    objectFit: "cover",
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
    fontSize: "18px",
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
    transition: "background-color 0.3s",
  },
  categoryHeading: {
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "15px",
    color: "#2d3748",
  },
  
  adoptedButton: {
    backgroundColor: "#FFA500",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "default",
    fontSize: "16px",
  },
  notification: {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "white",
    color: "black",
    padding: "15px 25px",
    borderRadius: "50px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    animation: "slideUp 0.5s ease-out",
  },
  "@keyframes slideUp": {
    "0%": { transform: "translateX(-50%) translateY(100px)", opacity: 0 },
    "100%": { transform: "translateX(-50%) translateY(0)", opacity: 1 },
  },

};
const PetsList = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [likedPets, setLikedPets] = useState([]);
  const [adoptedPets, setAdoptedPets] = useState([]);
  const [notification, setNotification] = useState({ show: false, petName: "" });

  const notificationTimerRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updatePetPouchCount } = useContext(PetPouchContext);

  const addToPetPouch = async (pet) => {
    if (!user) {
      alert("Please log in to adopt pets");
      return;
    }
  
    try {
      const petRef = doc(db, "pets", pet.id);
      
      // Update the pet's adopted status to true
      await updateDoc(petRef, {
        adopted: true
      });
  
      const petDoc = await getDoc(petRef);
  
      if (!petDoc.exists()) {
        console.error("Pet not found in 'pets' collection");
        return;
      }
  
      const petData = petDoc.data();
      console.log("Adding pet to pouch with data:", petData);
  
      await addDoc(collection(db, "petPouch"), {
        userId: user.uid,
        petId: pet.id,
        name: pet.name,
        breed: pet.breed,
        age: pet.age,
        imageUrl: pet.imageUrl,
        personality: pet.personality,
        type: pet.type,
        addedAt: new Date(),
        rehomerId: petData.rehomerId,
        rehomerName: petData.rehomerName,
      });
  
      setAdoptedPets([...adoptedPets, pet.id]);
      updateNavbarCounter();
      
      // Instead of filtering, we'll rely on the Firestore query to refresh the list
      // Remove this line: setPets(prevPets => prevPets.filter(p => p.id !== pet.id));
    } catch (error) {
      console.error("Error adding to pet pouch:", error);
    }
    updatePetPouchCount();
  };

  const updateNavbarCounter = () => {
    const pouchCount = adoptedPets.length + 1;
    const pouchLink = document.querySelector('.nav-link[href="/pet-pouch"]');
    if (pouchLink) {
      pouchLink.textContent = `Pet Pouch (${pouchCount})`;
    }
  };

  const handleLike = (petId) => {
    const isLiked = likedPets.includes(petId);
    let updatedLikes;

    if (isLiked) {
      // Unliking
      updatedLikes = likedPets.filter((id) => id !== petId);
      setNotification({ show: false, petName: "" });

      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    } else {
      // Liking
      updatedLikes = [...likedPets, petId];
      const pet = pets.find((p) => p.id === petId);

      if (pet) {
        setNotification({ show: true, petName: pet.name });

        if (notificationTimerRef.current) {
          clearTimeout(notificationTimerRef.current);
        }

        notificationTimerRef.current = setTimeout(() => {
          setNotification({ show: false, petName: "" });
        }, 3000);
      }
    }

    setLikedPets(updatedLikes);
  };
  

  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "pets"), where("adopted", "==", false));
        const querySnapshot = await getDocs(q);

        const petsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          personality: doc.data().personality || [],
        }));

        setPets(petsData);
      } catch (error) {
        console.error("Error fetching pets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
}, [adoptedPets]);

  useEffect(() => {
    const fetchPetsRealtime = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "pets"),
          where("adopted", "==", false)
        );

        

        return 
      } catch (error) {
        console.error("Error fetching pets:", error);
        setLoading(false);
      }
    };

    
  }, [user]);

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleUpdateImage = (e, petId) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
  
    reader.onloadend = async () => {
      const base64String = reader.result;
  
      try {
        const petDocRef = doc(db, "pets", petId);
        await updateDoc(petDocRef, { imageUrl: base64String });
       
        setPets((prevPets) =>
          prevPets.map((pet) =>
            pet.id === petId ? { ...pet, imageUrl: base64String } : pet
          )
        );
      } catch (error) {
        console.error("Error saving image:", error);
      }
    };
  
    reader.readAsDataURL(file);
  };

  const filteredGroupedPets = pets
    .filter(
      (pet) =>
        selectedTags.length === 0 ||
        selectedTags.every((tag) => pet.personality.includes(tag))
    )
    .filter((pet) => pet.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((groups, pet) => {
      const type = pet.type.charAt(0).toUpperCase() + pet.type.slice(1);
      if (!groups[type]) groups[type] = [];
      groups[type].push(pet);
      return groups;
    }, {});

  return (
    <div style={{ display: "flex", padding: "20px" }}>
      {/* Sidebar filter */}
      <div
        style={{
          width: "280px",
          marginRight: "30px",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#2d3748",
            marginBottom: "16px",
            paddingBottom: "8px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          Filter by Personality
        </h2>
  
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {personalityTags.map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
                padding: "8px 12px",
                backgroundColor: "white",
                borderRadius: "8px",
                cursor: "pointer",
                border: "1px solid #e2e8f0",
                transition: "all 0.2s ease",
              }}
            >
              <label
                htmlFor={tag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "14px",
                  color: "#4a5568",
                  cursor: "pointer",
                  userSelect: "none",
                  width: "100%",
                }}
              >
                <input
                  type="checkbox"
                  id={tag}
                  checked={selectedTags.includes(tag)}
                  onChange={() => handleTagToggle(tag)}
                  style={{
                    marginRight: "10px",
                    accentColor: "#4299e1",
                    width: "16px",
                    height: "16px",
                    cursor: "pointer",
                  }}
                />
                {tag}
              </label>
            </div>
          ))}
        </div>
      </div>
  
      {/* Main Content */}
      <div style={{ flex: 1 }}>
      
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Search by pet name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
        </div>
  
        {/* Pets display */}
        {loading ? (
          <p>Loading pets...</p>
        ) : (
          Object.entries(filteredGroupedPets).map(([type, petsArray]) => (
            <div key={type} style={{ marginBottom: "40px" }}>
              <h1 style={styles.categoryHeading}>{type}</h1>
              <div style={styles.petCardsContainer}>
                {petsArray.map((pet) => (
                  <div key={pet.id} style={styles.petCard}>
                    <img
                      src={pet.imageUrl}
                      alt={pet.name}
                      style={styles.petImage}
                    />
                    <div style={styles.petName}>
                      {pet.name}
                      <span
                        style={{
                          ...styles.heart,
                          color: likedPets.includes(pet.id) ? "orange" : "#FFA500",
                        }}
                        onClick={() => handleLike(pet.id)}
                      >
                        {likedPets.includes(pet.id) ? "❤️" : "🤍"}
                      </span>
                    </div>
  
                    <p style={styles.petDescription}>{pet.breed}</p>
                    <p style={styles.petDescription}>{pet.age}</p>
                    <p style={styles.petPersonality}>
                      {pet.personality.join(", ")}
                    </p>
  
                    {user?.role === "rehomer" && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUpdateImage(e, pet.id)}
                        style={{ marginTop: "10px" }}
                      />
                    )}
  
                    <button
                      style={
                        adoptedPets.includes(pet.id)
                          ? styles.adoptedButton
                          : styles.petButton
                      }
                      onClick={() => addToPetPouch(pet)}
                      disabled={adoptedPets.includes(pet.id)}
                    >
                      {adoptedPets.includes(pet.id) ? "Adopted" : "Adopt me"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      {/* Notification */}
      {notification.show && (
        <div style={styles.notification}>
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>
            {notification.petName} likes you too! Want to adopt {notification.petName}? 💓
          </span>
        </div>
      )}
    </div>
  );
}
  export default PetsList;