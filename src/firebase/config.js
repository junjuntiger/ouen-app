import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyArF48HXdKcPg91oeIO-Tlk2UyDN-ua3Y8",
  authDomain: "owenweb-54f51.firebaseapp.com",
  projectId: "owenweb-54f51",
  storageBucket: "owenweb-54f51.firebasestorage.app",
  messagingSenderId: "139703842397",
  appId: "1:139703842397:web:55ba25671542a45fb77fb4",
  measurementId: "G-5T2SGLPXKB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
