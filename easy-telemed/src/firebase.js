// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getAuth} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBXJL7-VtPsy8vAUysgR9aaGzI5mPXRPSo",
  authDomain: "telemedicine-auth-d96f6.firebaseapp.com",
  projectId: "telemedicine-auth-d96f6",
  storageBucket: "telemedicine-auth-d96f6.firebasestorage.app",
  messagingSenderId: "917039775921",
  appId: "1:917039775921:web:ca5068a3fe3df16a1c6290",
  measurementId: "G-4NSGD2J9EL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export default app;