import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { Logger } from './Logger';

// Firebase configuration using Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Identify missing configuration keys
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value || value.trim() === '')
  .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase()}`);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let isInitialized = false;

if (missingKeys.length > 0) {
  Logger.warn(`Firebase credentials missing: ${missingKeys.join(', ')}`);
} else {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    isInitialized = true;
    Logger.info("Firebase SDK initialized successfully.");
  } catch (error: any) {
    Logger.error("Failed to initialize Firebase SDK:", error);
  }
}

export { app, auth, firebaseConfig, missingKeys, isInitialized };
