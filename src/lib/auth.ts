import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SESSION_KEY = 'dr123_session';
const DEFAULT_PASSWORD = 'admin123';

export async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function ensureAdminPassword(): Promise<string> {
  const ref = doc(db, 'settings', 'adminPasswordHash');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return String(snap.data().hash || '');
  }

  const hash = await sha256(DEFAULT_PASSWORD);
  await setDoc(ref, {
    hash,
    updatedAt: new Date().toISOString(),
    note: 'Default password is admin123. Change it in Settings immediately.',
  });
  return hash;
}

export async function verifyPassword(password: string): Promise<boolean> {
  const storedHash = await ensureAdminPassword();
  const inputHash = await sha256(password);
  return inputHash === storedHash;
}

export function rememberSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, at: new Date().toISOString() }));
}

export function hasSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}').loggedIn === true;
  } catch {
    return false;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
