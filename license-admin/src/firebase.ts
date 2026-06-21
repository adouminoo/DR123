import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, firebaseConfigurationError, missingFirebaseConfigKeys } from './firebaseConfig';

export { firebaseConfig, firebaseConfigurationError, missingFirebaseConfigKeys };

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
