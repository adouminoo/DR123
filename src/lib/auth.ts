import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type AppUser = User;

export function watchAuth(callback: (user: AppUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithPassword(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function registerWithActivationCode(name: string, email: string, password: string, activationCode: string) {
  const code = activationCode.trim().toUpperCase();
  if (!code) throw new Error('Activation code is required.');

  const codeRef = doc(db, 'activationCodes', code);
  const codeSnap = await getDoc(codeRef);
  if (!codeSnap.exists() || codeSnap.data().usedBy) {
    throw new Error('Activation code is invalid or already used.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() });
  }

  try {
    await runTransaction(db, async (transaction) => {
      const freshCode = await transaction.get(codeRef);
      if (!freshCode.exists() || freshCode.data().usedBy) {
        throw new Error('Activation code is invalid or already used.');
      }
      transaction.update(codeRef, {
        usedBy: credential.user.uid,
        usedByEmail: credential.user.email,
        usedAt: new Date().toISOString(),
      });
      transaction.set(doc(db, 'users', credential.user.uid), {
        name: name.trim(),
        email: credential.user.email,
        activationCode: code,
        createdAt: new Date().toISOString(),
      });
    });
  } catch (error) {
    await signOut(auth);
    throw error;
  }

  return credential.user;
}

export async function logout() {
  await signOut(auth);
}

export async function changeCurrentPassword(password: string) {
  if (!auth.currentUser) throw new Error('You must be logged in to change your password.');
  await updatePassword(auth.currentUser, password);
}
