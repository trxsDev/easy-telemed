// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "telemedicine-auth-d96f6.firebasestorage.app",
  messagingSenderId: "917039775921",
  appId: "1:917039775921:web:ca5068a3fe3df16a1c6290",
  measurementId: "G-4NSGD2J9EL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics only works in the browser environment; guard in case of future SSR
let analytics; // eslint-disable-line
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app); // eslint-disable-line @typescript-eslint/no-unused-vars
  }
} catch (e) {
  // Silently ignore analytics errors (e.g., if not supported)
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;