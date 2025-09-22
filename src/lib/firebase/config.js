// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // 1. IMPORT STORAGE

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsh0Zulju4OHP_mws_4LqilWXQIKgDbhs",
  authDomain: "our-wishlist-a3c6a.firebaseapp.com",
  projectId: "our-wishlist-a3c6a",
  storageBucket: "our-wishlist-a3c6a.firebasestorage.app",
  messagingSenderId: "723816178644",
  appId: "1:723816178644:web:c54dd8ff0844032d372c41"
};

// Initialize Firebase
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // 2. INITIALIZE STORAGE

export { app, db, auth, storage }; // 3. EXPORT STORAGE