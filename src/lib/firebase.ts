// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqnG5B4LUOlfb9_D_7y2j2zDNnMNd-Dlo",
  authDomain: "orizon-lab.firebaseapp.com",
  projectId: "orizon-lab",
  storageBucket: "orizon-lab.firebasestorage.app",
  messagingSenderId: "50681054193",
  appId: "1:50681054193:web:d40f9c9b8581ce30207a50",
  measurementId: "G-YRFWCDZ591"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

export default app;
