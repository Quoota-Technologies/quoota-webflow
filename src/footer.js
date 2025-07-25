// Import the functions you need from the SDKs you need
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAjhXUDPtv7CPgvgBaWAaI-k0icz9BgJtY",
  authDomain: "quoota-eec07.firebaseapp.com",
  projectId: "quoota-eec07",
  storageBucket: "quoota-eec07.appspot.com",
  messagingSenderId: "118744732167",
  appId: "1:118744732167:web:3634eea174c812589410a2",
  measurementId: "G-F50XZY07BV",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Exponer variables globalmente para que otros scripts puedan acceder
window.firebaseApp = app;
window.firebaseAnalytics = analytics;
window.auth = auth;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signOut = signOut;

// Opcional: Log para confirmar que Firebase está disponible
console.log("Firebase inicializado y disponible globalmente");
