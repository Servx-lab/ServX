import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  type Auth,
} from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

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

const app = initializeApp(firebaseConfig);

const isBrowser = typeof window !== "undefined" && typeof navigator !== "undefined";
const isDev = typeof import.meta !== "undefined" ? import.meta.env.DEV : false;
const isOnline = isBrowser ? navigator.onLine : true;
const shouldUseMemoryPersistence = !isOnline || isDev;

let authInstance: Auth;
try {
  const persistence = shouldUseMemoryPersistence ? inMemoryPersistence : browserLocalPersistence;
  authInstance = initializeAuth(app, isBrowser
    ? {
        persistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      }
    : {
        persistence,
      });
} catch {
  // If already initialized by another import path, reuse the existing instance.
  authInstance = getAuth(app);
}

export const auth = authInstance;

export let analytics: Analytics | null = null;
const analyticsEnabledByEnv =
  typeof import.meta !== "undefined"
    ? String(import.meta.env.VITE_ENABLE_ANALYTICS || "").toLowerCase() === "true"
    : false;
const shouldInitializeAnalytics = isBrowser && isOnline && !isDev && analyticsEnabledByEnv;

if (shouldInitializeAnalytics) {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      analytics = null;
    });
}

export default app;
