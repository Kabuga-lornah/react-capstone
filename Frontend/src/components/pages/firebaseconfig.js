import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAYf9Snk285AS4pumdf81WYpAtgXAFG8GQ",
  authDomain: "pet-store-9a4bc.firebaseapp.com",
  projectId: "pet-store-9a4bc",
  storageBucket: "pet-store-9a4bc.firebasestorage.app",
  messagingSenderId: "337908469086",
  appId: "1:337908469086:web:eff0dd960a79fc0c5313cf",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export everything you need
export { app, auth, db, storage };