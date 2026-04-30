// src/components/pages/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebaseconfig"; // Ensure the path to firebaseconfig.js is correct
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseconfig"; // Ensure the path to firebaseconfig.js is correct

// Create AuthContext
const AuthContext = createContext();

// AuthProvider Component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Handle Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData({
              ...userDoc.data(),
              isRehomer: userDoc.data().isRehomer || false, // Handle missing isRehomer field
            });
          } else {
            setUserData(null);
          }
          setCurrentUser(user);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    // Clean up subscription
    return unsubscribe;
  }, []);

  // Context value
  const value = {
    user: currentUser,
    userData,
    loading,
    isRehomer: () => userData?.isRehomer === true, // Helper function for rehomer
    isRegularUser: () => !userData?.isRehomer, // Helper function for regular user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} {/* Render children only after loading */}
    </AuthContext.Provider>
  );
};

// useAuth Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};