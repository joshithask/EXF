// firebase.js
// This file connects the app to Firebase Firestore (our NoSQL database).
//
// HOW TO GET THESE VALUES (one time only):
// 1. Go to https://console.firebase.google.com and create a project.
// 2. Click "Build" -> "Firestore Database" -> "Create database" (choose test mode).
// 3. Click the gear icon -> "Project settings" -> "Your apps" -> add a Web app (</>).
// 4. Copy the config values it shows you and paste them below.

import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);

// "long polling" helps Firestore work reliably inside Expo Go on phones.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
