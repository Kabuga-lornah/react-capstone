import React, { createContext, useState, useEffect } from "react";
import { getAccessToken, listWishlist } from "../../services/api";

export const PetPouchContext = createContext();

export const PetPouchProvider = ({ user, children }) => {
  const [petPouchCount, setPetPouchCount] = useState(0);

  const fetchPetPouchCount = async () => {
    if (!user || !getAccessToken()) {
      setPetPouchCount(0);
      return;
    }

    try {
      const response = await listWishlist();
      const wishlistItems = Array.isArray(response) ? response : response?.results || [];
      setPetPouchCount(wishlistItems.length);
    } catch (error) {
      console.error("Error fetching pet pouch count:", error);
      setPetPouchCount(0);
    }
  };

  useEffect(() => {
    fetchPetPouchCount();
  }, [user]);

  const updatePetPouchCount = () => {
    fetchPetPouchCount();
  };

  return (
    <PetPouchContext.Provider value={{ petPouchCount, updatePetPouchCount }}>
      {children}
    </PetPouchContext.Provider>
  );
};
