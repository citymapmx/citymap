import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA7VL3wbXJ5epdmzhGVqbVm-zKUWD00cEo",
  authDomain: "citymap-mx.firebaseapp.com",
  projectId: "citymap-mx",
  storageBucket: "citymap-mx.firebasestorage.app",
  messagingSenderId: "769139703867",
  appId: "1:769139703867:web:41c64a2f83bc04d88f5c1e",
  measurementId: "G-65RXYRL06C"
};

// Singleton: avoid re-initializing in HMR
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export { app, getMessaging, getToken, onMessage };
