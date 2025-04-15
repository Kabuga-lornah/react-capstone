import React, { useState, useEffect, useContext } from "react";
import { db, app } from "./firebaseconfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Timestamp } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import { PetPouchContext } from './PetPouchContext';

const PetPouch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [visitDate, setVisitDate] = useState(new Date());
  const [showAdoptionForm, setShowAdoptionForm] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updatePetPouchCount } = useContext(PetPouchContext);

  // SMS function defined at component level
  const sendSMS = async (phoneNumber, petName, visitDate) => {
    try {
      const response = await fetch(
        "https://us-central1-pet-store-9a4bc.cloudfunctions.net/sendAdoptionSMS",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber,
            message: `Your adoption request for ${petName} is confirmed! Visit date: ${visitDate.toLocaleDateString()}.`,
          }),
        }
      );

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("SMS failed:", error.message);
      return false;
    }
  };

  useEffect(() => {
    const fetchPetPouch = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const q = query(
          collection(db, "petPouch"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);

        const petsData = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const petPouchData = {
              id: doc.id,
              petId: doc.data().petId || doc.id,
              rehomerId: doc.data().rehomerId || "unknown",
              ...doc.data(),
            };

            // Fetch the pet from the "pets" collection
            try {
              const petRef = doc(db, "pets", petPouchData.petId);
              const petDoc = await getDoc(petRef);
            

              if (petDoc.exists()) {
                const petData = petDoc.data();
                // Use the rehomerId from the "pets" collection
                return {
                  ...petPouchData,
                  rehomerId: petData.rehomerId || "unknown", // Override with value from "pets"
                };
              } else {
                console.warn(
                  `Pet document ${petPouchData.petId} doesn't exist in pets collection`
                );
                return petPouchData; // Return original data if pet not found
              }
            } catch (error) {
              console.error("Error fetching pet document:", error);
              return petPouchData; // Return original data on error
            }
          })
        );

        setPets(petsData);
      } catch (error) {
        console.error("Error fetching pet pouch:", error);
        setConfirmationMessage({
          title: "Error",
          body: "Failed to load your pet pouch. Please try again.",
          isError: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPetPouch();
  }, [user]);

  const handleRemovePet = async (petId, petPouchId) => {
    try {
      // Get the petPouch document to confirm petId (optional if you already have petId)
      const petPouchDoc = await getDoc(doc(db, "petPouch", petPouchId));
      if (!petPouchDoc.exists()) {
        throw new Error("Pet pouch document not found");
      }

      const petIdFromDoc = petPouchDoc.data().petId;

      // Update the pet's adopted status to false in the pets collection
      await updateDoc(doc(db, "pets", petIdFromDoc), {
        adopted: false,
      });

      // Remove the pet from petPouch collection
      await deleteDoc(doc(db, "petPouch", petPouchId));

      // Update local pets state by removing the pet with matching petPouchId
      setPets((prevPets) => prevPets.filter((pet) => pet.id !== petPouchId));


      // Refresh the pet pouch count in navbar by calling context updater
      updatePetPouchCount();

      setConfirmationMessage({
        title: "Success",
        body: "Pet removed from your pouch and made available for adoption again.",
        isError: false,
      });
    } catch (error) {
      console.error("Error removing pet:", error);
      setConfirmationMessage({
        title: "Error",
        body: "Failed to remove pet. Please try again.",
        isError: true,
      });
    }
  };

  const handleAdoptClick = (pet) => {
    setSelectedPet(pet);
    setShowAdoptionForm(true);
    setPhoneNumber(""); // optional: reset phone input
    setVisitDate(new Date()); // optional: reset date
  };
  
  const handleSubmitAdoption = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!phoneNumber || !visitDate) {
      setConfirmationMessage({
        title: "Missing Information",
        body: "Please provide your phone number and select a visit date",
        isError: true,
      });
      setIsSubmitting(false);
      return;
    }

    try {
      let rehomerId = selectedPet.rehomerId;
      let petId = selectedPet.petId || selectedPet.id;

      if (!rehomerId || rehomerId.trim() === "" || rehomerId === "unknown") {
        try {
          const petRef = doc(db, "pets", petId);
          const petDoc = await getDoc(petRef);

          if (petDoc.exists()) {
            rehomerId = petDoc.data().rehomerId;
          } else {
            console.warn(
              `Pet document ${petId} doesn't exist in pets collection`
            );

            if (!rehomerId) {
              throw new Error(
                "We couldn't verify the pet's shelter information."
              );
            }
          }
        } catch (error) {
          console.error("Error verifying pet document:", error);
          if (!rehomerId) {
            throw new Error(
              "We encountered an error verifying the pet information."
            );
          }
        }
      }

      const adoptionData = {
        petId: petId,
        originalPetId: selectedPet.petId || selectedPet.id,
        petName: selectedPet.name,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || "Anonymous User",
        phoneNumber: phoneNumber,
        visitDate: Timestamp.fromDate(visitDate),
        status: "pending",
        createdAt: Timestamp.now(),
        rehomerId: rehomerId,
        petImageUrl: selectedPet.imageUrl || "/default-pet.jpg",
        message: `I'm interested in adopting ${selectedPet.name}!`,
      };

      const requestRef = await addDoc(
        collection(db, "adoptionRequests"),
        adoptionData
      );

      await updateDoc(doc(db, "adoptionRequests", requestRef.id), {
        requestId: requestRef.id,
      });

      await deleteDoc(doc(db, "petPouch", selectedPet.id));
     setPets((prevPets) => prevPets.filter((pet) => pet.id !== selectedPet.id));


      try {
        await sendSMS(phoneNumber, selectedPet.name, visitDate);
      } catch (smsError) {
        console.warn("SMS failed to send:", smsError);
      }

      setConfirmationMessage({
        title: `Adoption Request Submitted!`,
        body: `Your request to adopt ${selectedPet.name} has been sent to the shelter.`,
        requestId: requestRef.id,
        isError: false,
      });

      setPhoneNumber("");
      setVisitDate(new Date());
      setShowAdoptionForm(false);
      setSelectedPet(null);
    } catch (error) {
      console.error("Error submitting adoption request:", error);
      setConfirmationMessage({
        title: "Submission Error",
        body:
          error.message ||
          "Failed to submit adoption request. Please try again.",
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Please log in to view your Pet Pouch</h2>
        <button
          onClick={() => navigate("/login")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#FFA500",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }
  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "20px" }}>Your Pet Pouch</h1>

      {confirmationMessage && (
        <div
          style={{
            backgroundColor: confirmationMessage.isError
              ? "#ffebee"
              : "#e6f7e6",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "20px",
            border: confirmationMessage.isError
              ? "1px solid #ffcdd2"
              : "1px solid #a0d8a0",
            color: confirmationMessage.isError ? "#c62828" : "#2e7d32",
          }}
        >
          <h3 style={{ marginTop: 0 }}>{confirmationMessage.title}</h3>
          <p>{confirmationMessage.body}</p>
          {confirmationMessage.requestId && (
            <p style={{ fontSize: "0.9rem", marginBottom: 0 }}>
              Request ID: {confirmationMessage.requestId}
            </p>
          )}
        </div>
      )}

      {showAdoptionForm && selectedPet && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "10px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Adopt {selectedPet.name}</h2>
            <form onSubmit={handleSubmitAdoption}>
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Phone Number:
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder="Enter your phone number"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "16px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Select Home Visit Date:
                </label>
                <div style={{ marginBottom: "10px" }}>
                  <Calendar
                    onChange={setVisitDate}
                    value={visitDate}
                    minDate={new Date()}
                  />
                </div>
                <p style={{ margin: "5px 0", fontSize: "0.9rem" }}>
                  Selected: {visitDate.toLocaleDateString()}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAdoptionForm(false)}
                  disabled={isSubmitting}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#f5f5f5",
                    color: "#333",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: isSubmitting ? "#cccccc" : "#FFA500",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    flex: 1,
                  }}
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading your pets...</p>
        </div>
      ) : pets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
            Your pet pouch is empty.
          </p>
          <button
            onClick={() => navigate("/pets")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#FFA500",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Browse Pets to Adopt
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "25px",
            marginTop: "20px",
          }}
        >
          {pets.map((pet) => (
            <div
              key={pet.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "20px",
                position: "relative",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "200px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  borderRadius: "8px",
                  marginBottom: "15px",
                  backgroundColor: "#f5f5f5",
                }}
              >
                <img
                  src={pet.imageUrl || "/default-pet.jpg"}
                  alt={pet.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: "1.4rem" }}>
                {pet.name}
              </h3>
              <p style={{ margin: "5px 0" }}>
                <strong>Breed:</strong> {pet.breed}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Age:</strong> {pet.age}
              </p>
              {pet.matchPercentage && (
                <p style={{ margin: "5px 0" }}>
                  <strong>Match:</strong> {pet.matchPercentage}%
                </p>
              )}
              <div style={{ margin: "10px 0" }}>
                {pet.personality?.map((trait, index) => (
                  <span
                    key={index}
                    style={{
                      display: "inline-block",
                      backgroundColor: "#f5f5f5",
                      color: "#333",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      marginRight: "5px",
                      marginBottom: "5px",
                      border: "1px solid #ddd",
                    }}
                  >
                    {trait}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => handleRemovePet(pet.petId, pet.id)}
                  style={{
                    backgroundColor: "#f5f5f5",
                    color: "#333",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginTop: "15px",
                    flex: 1,
                    transition: "background-color 0.3s",
                    ":hover": {
                      backgroundColor: "#e0e0e0",
                    },
                  }}
                >
                  Remove
                </button>
                <button
                  onClick={() => handleAdoptClick(pet)}
                  style={{
                    backgroundColor: "#FFA500",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginTop: "15px",
                    flex: 1,
                    transition: "background-color 0.3s",
                    ":hover": {
                      backgroundColor: "#e69500",
                    },
                  }}
                >
                  Adopt
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PetPouch;
