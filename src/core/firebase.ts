import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function getFirebaseEnvConfig(): FirebaseConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDYMFmzuGtR9gRp6D2nToW8GxI8QgCHAmk',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dondeestan-9d0b1.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dondeestan-9d0b1',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dondeestan-9d0b1.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '342345210578',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:342345210578:web:6309eb67eedd3fea32eb0b',
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseEnvConfig();
  return Boolean(config.apiKey && config.projectId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseServices(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!app) {
    const config = getFirebaseEnvConfig();
    const existingApps = getApps();
    app = existingApps.length > 0 ? existingApps[0] : initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
  }

  return {
    app,
    auth: auth as Auth,
    db: db as Firestore,
  };
}

