import React, { createContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebaseconfig'; 

export const PetPouchContext = createContext();

export const PetPouchProvider = ({ user, children }) => {
  const [petPouchCount, setPetPouchCount] = useState(0);

  // Function to fetch pet pouch count from Firestore for the current user
  const fetchPetPouchCount = async () => {
    if (!user) {
      setPetPouchCount(0);
      return;
    }
    const q = query(collection(db, "petPouch"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);
    setPetPouchCount(querySnapshot.size);
  };

  useEffect(() => {
    fetchPetPouchCount();
  }, [user]);

  // Provide a function to refresh count after add/remove
  const updatePetPouchCount = () => {
    fetchPetPouchCount();
  };

  return (
    <PetPouchContext.Provider value={{ petPouchCount, updatePetPouchCount }}>
      {children}
    </PetPouchContext.Provider>
  );
};
