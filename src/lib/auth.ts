import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { activateLicenseForUser } from './license';

export type AppUser = User;

export function watchAuth(callback: (user: AppUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithPassword(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function registerWithLicenseKey(name: string, email: string, password: string, licenseKey: string) {
  if (!licenseKey.trim()) throw new Error('Enter a license key.');

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }
    await activateLicenseForUser(licenseKey, {
      uid: credential.user.uid,
      name: name.trim(),
      email: credential.user.email,
    });
  } catch (error) {
    await deleteUser(credential.user).catch(() => undefined);
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
