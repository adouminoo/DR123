import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'replace-me',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dr123-efedd.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dr123-efedd',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dr123-efedd.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'replace-me',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'replace-me',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
