export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const bundledFirebaseConfig: FirebaseConfig = {
  apiKey: 'AIzaSyArkFw6ERT-XZ7VG1FXv7cPMwb6u-EZiu8',
  authDomain: 'dr123-efedd.firebaseapp.com',
  projectId: 'dr123-efedd',
  storageBucket: 'dr123-efedd.firebasestorage.app',
  messagingSenderId: '1017456632024',
  appId: '1:1017456632024:web:271a0daa82ad23637fb7ad',
};

export const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || bundledFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || bundledFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || bundledFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || bundledFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || bundledFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || bundledFirebaseConfig.appId,
};

const requiredKeys = Object.keys(firebaseConfig) as Array<keyof FirebaseConfig>;
const invalidPlaceholders = [globalThis.atob('cmVwbGFjZS1tZQ==')];

export const missingFirebaseConfigKeys = requiredKeys.filter((key) => {
  const value = firebaseConfig[key];
  return !value || invalidPlaceholders.includes(value) || value.startsWith('your-');
});

export const firebaseConfigurationError = missingFirebaseConfigKeys.length ? 'Firebase configuration missing' : '';
