import React, { useState, useEffect } from "react";
import { useAuth } from "../pages/AuthContext";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../pages/firebaseconfig";
import { useNavigate } from "react-router-dom";

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
  adoptedButton: {
    backgroundColor: "#FFA500",
    color: "#ffffff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "default",
    fontSize: "16px",
  },
};

const PetsList = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [likedPets, setLikedPets] = useState([]);
  const [adoptedPets, setAdoptedPets] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const addToPetPouch = async (pet) => {
    if (!user) {
      alert("Please log in to adopt pets");
      return;
    }

    try {
      await addDoc(collection(db, "petPouch"), {
        userId: user.uid,
        name: pet.name,
        breed: pet.breed,
        age: pet.age,
        imageUrl: pet.imageUrl,
        personality: pet.personality,
        type: pet.type,
        addedAt: new Date(),
      });

      setAdoptedPets([...adoptedPets, pet.id]);
      updateNavbarCounter();
    } catch (error) {
      console.error("Error adding to pet pouch:", error);
    }
  };

  const updateNavbarCounter = () => {
    const pouchCount = adoptedPets.length + 1;
    const pouchLink = document.querySelector('.nav-link[href="/pet-pouch"]');
    if (pouchLink) {
      pouchLink.textContent = `Pet Pouch (${pouchCount})`;
    }
  };

  const toggleLike = (petId) => {
    setLikedPets((prevLiked) =>
      prevLiked.includes(petId)
        ? prevLiked.filter((id) => id !== petId)
        : [...prevLiked, petId]
    );
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

        const hardcodedPets = [
          {
            id: "dog1",
            name: "Buddy",
            breed: "Labrador",
            age: "2 years",
            personality: ["Friendly", "Playful"],
            imageUrl: "/Labrador.jpeg",
            type: "dog",
          },
          {
            id: "dog2",
            name: "Max",
            breed: "Beagle",
            age: "3 years",
            personality: ["Energetic", "Loyal"],
            imageUrl: "/beagle.jpg",
            type: "dog",
          },
          {
            id: "dog3",
            name: "Charlie",
            breed: "Golden Retriever",
            age: "4 years",
            personality: ["Affectionate", "Friendly"],
            imageUrl: "/golden retriver.jpg",
            type: "dog",
          },
          {
            id: "dog4",
            name: "Daisy",
            breed: "Poodle",
            age: "1 year",
            personality: ["Intelligent", "Shy"],
            imageUrl: "/poodle.jpeg",
            type: "dog",
          },
          {
            id: "dog5",
            name: "Bella",
            breed: "Bulldog",
            age: "2.5 years",
            personality: ["Calm", "Loyal"],
            imageUrl: "/bulldog.jpeg",
            type: "dog",
          },
          {
            id: "dog6",
            name: "Rocky",
            breed: "Rottweiler",
            age: "3.5 years",
            personality: ["Independent", "Friendly"],
            imageUrl: "/Rottweiler.jpeg",
            type: "dog",
          },
          {
            id: "dog7",
            name: "Lucy",
            breed: "Shih Tzu",
            age: "2 years",
            personality: ["Playful", "Shy"],
            imageUrl: "/shih tzu.jpeg",
            type: "dog",
          },
          {
            id: "dog8",
            name: "zeus",
            breed: "German Shepherd",
            age: "4 years",
            personality: ["Loyal", "Intelligent"],
            imageUrl: "/zeus.jpeg",
            type: "dog",
          },
          {
            id: "dog9",
            name: "Ruby",
            breed: "Boxer",
            age: "1.5 years",
            personality: ["Energetic", "Affectionate"],
            imageUrl: "/beagle.jpeg",
            type: "dog",
          },
          {
            id: "dog10",
            name: "Bailey",
            breed: "Chihuahua",
            age: "3 years",
            personality: ["Friendly", "Calm"],
            imageUrl: "/chihuahua.jpeg",
            type: "dog",
          },
          {
            id: "dog11",
            name: "Coco",
            breed: "Golden Retriver",
            age: "1 year",
            personality: ["Independent", "Playful"],
            imageUrl: "/3 yrs golden retriver.jpeg",
            type: "dog",
          },
          {
            id: "dog12",
            name: "Toby",
            breed: "Doberman",
            age: "2.5 years",
            personality: ["Energetic", "Loyal"],
            imageUrl: "/Dobermann.jpeg",
            type: "dog",
          },

          // Cats (8)
          {
            id: "cat1",
            name: "Whiskers",
            breed: "Persian",
            age: "3 years",
            personality: ["Calm", "Independent"],
            imageUrl: "/persian.jpeg",
            type: "cat",
          },
          {
            id: "cat2",
            name: "Luna",
            breed: "Siamese",
            age: "2 years",
            personality: ["Affectionate", "Intelligent"],
            imageUrl: "/siames 2.jpeg",
            type: "cat",
          },
          {
            id: "cat3",
            name: "Mittens",
            breed: "Maine Coon",
            age: "4 years",
            personality: ["Loyal", "Shy"],
            imageUrl: "/cat3.jpg",
            type: "cat",
          },
          {
            id: "cat4",
            name: "Shadow",
            breed: "Bengal",
            age: "1.5 years",
            personality: ["Playful", "Energetic"],
            imageUrl: "/bengal.jpeg",
            type: "cat",
          },
          {
            id: "cat5",
            name: "Simba",
            breed: "Abyssinian",
            age: "3 years",
            personality: ["Intelligent", "Friendly"],
            imageUrl: "/Abyssinian.jpeg",
            type: "cat",
          },
          {
            id: "cat6",
            name: "Zoe",
            breed: "Russian Blue",
            age: "2 years",
            personality: ["Shy", "Calm"],
            imageUrl: "/russian blue.jpeg",
            type: "cat",
          },
          {
            id: "cat7",
            name: "Nala",
            breed: "British Shorthair",
            age: "2.8 years",
            personality: ["Loyal", "Independent"],
            imageUrl: "/british shorthair.jpeg",
            type: "cat",
          },
          {
            id: "cat8",
            name: "Tiger",
            breed: "Tabby",
            age: "3.5 years",
            personality: ["Playful", "Affectionate"],
            imageUrl: "/cat8.jpg",
            type: "cat",
          },

          // Snakes (2)
          {
            id: "snake1",
            name: "Slither",
            breed: "Corn Snake",
            age: "2 years",
            personality: ["Calm", "Shy"],
            imageUrl: "/snake.jpg",
            type: "snake",
          },
          {
            id: "snake2",
            name: "Fang",
            breed: "Ball Python",
            age: "3 years",
            personality: ["Independent", "Calm"],
            imageUrl: "/snake2.jpg",
            type: "snake",
          },

          // Bunnies (5)
          {
            id: "bunny1",
            name: "Thumper",
            breed: "Mini Lop",
            age: "1 year",
            personality: ["Friendly", "Playful"],
            imageUrl: "/.jpg",
            type: "bunny",
          },
          {
            id: "bunny2",
            name: "Snowball",
            breed: "Angora",
            age: "1.5 years",
            personality: ["Shy", "Affectionate"],
            imageUrl: "/bunny2.jpg",
            type: "bunny",
          },
          {
            id: "bunny3",
            name: "Fluffy",
            breed: "Lionhead",
            age: "2 years",
            personality: ["Energetic", "Playful"],
            imageUrl: "/bunny3.jpg",
            type: "bunny",
          },
          {
            id: "bunny4",
            name: "Clover",
            breed: "Dutch",
            age: "2.2 years",
            personality: ["Independent", "Calm"],
            imageUrl: "/bunny4.jpg",
            type: "bunny",
          },
          {
            id: "bunny5",
            name: "Binky",
            breed: "Rex",
            age: "1.8 years",
            personality: ["Loyal", "Friendly"],
            imageUrl: "/bunny5.jpg",
            type: "bunny",
          },

          // Ducks (3)
          {
            id: "duck1",
            name: "Quackers",
            breed: "Parrot",
            age: "4 years",
            personality: ["Talkative and bright"],
            imageUrl: "/duck.jpeg",
            type: "duck",
          },
          {
            id: "duck2",
            name: "Feathers",
            breed: "Mallard",
            age: "2 years",
            personality: ["Friendly", "Playful"],
            imageUrl: "/duck2.jpg",
            type: "duck",
          },
          {
            id: "duck3",
            name: "Daffy",
            breed: "Pekin",
            age: "3 years",
            personality: ["Calm", "Affectionate"],
            imageUrl: "/duck3.jpg",
            type: "duck",
          },

          // Chicks (2)
          {
            id: "chick1",
            name: "Sunny",
            breed: "Silkie",
            age: "0.5 years",
            personality: ["Energetic", "Friendly"],
            imageUrl: "/chick1.jpg",
            type: "chick",
          },
          {
            id: "chick2",
            name: "Peep",
            breed: "Bantam",
            age: "0.4 years",
            personality: ["Shy", "Playful"],
            imageUrl: "/chick2.jpg",
            type: "chick",
          },
        ];
        setPets([...petsData, ...hardcodedPets]);
      } catch (error) {
        console.error("Error fetching pets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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
  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "pets"),
          where("adopted", "==", false)
         
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const petsData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            personality: doc.data().personality || [],
          }));
          setPets(petsData);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error fetching pets:", error);
        setLoading(false);
      }
    };

    fetchPets();
  }, [user]);

  const handleUpdateImage = (e, petId) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
  
    reader.onloadend = async () => {
      const base64String = reader.result;
  
      try {
        // 1. Save to Firestore
        const petDocRef = doc(db, "pets", petId);
        await updateDoc(petDocRef, { imageUrl: base64String });
  
       
        setPets((prevPets) =>
          prevPets.map((pet) =>
            pet.id === petId ? { ...pet, imageUrl: base64String } : pet
          )
        );
  
        console.log("Image updated and saved as Base64.");
      } catch (error) {
        console.error("Error saving image:", error);
      }
    };
  
    reader.readAsDataURL(file);
  };
  

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
        {/* Search bar */}
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
              <h1>{type}</h1>
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
                          color: likedPets.includes(pet.id) ? "red" : "#888",
                        }}
                        onClick={() => toggleLike(pet.id)}
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
    </div>
  );
}
  export default PetsList;