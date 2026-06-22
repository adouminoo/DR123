import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyArkFw6ERT-XZ7VG1FXv7cPMwb6u-EZiu8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dr123-efedd.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dr123-efedd',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dr123-efedd.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1017456632024',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1017456632024:web:271a0daa82ad23637fb7ad',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
