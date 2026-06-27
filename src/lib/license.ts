import { doc, getDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export type LicenseStatus = 'unused' | 'active' | 'expired' | 'revoked';
export type LicenseType = 'trial' | 'full';

export type LicenseRecord = {
  id: string;
  key: string;
  type: LicenseType;
  status: LicenseStatus;
  createdAt: string;
  activatedAt: string;
  expiresAt: string;
  clinicName: string;
  contactPhone: string;
  deviceId?: string;
  ownerUid?: string;
  ownerEmail?: string | null;
  lastCheckedAt: string;
};

const LICENSE_KEY_STORAGE = 'tmy_license_key';
const LEGACY_LICENSE_KEY_STORAGE = 'dr123_license_key';

function normalizeLicenseKey(key: string) {
  return key.trim().toUpperCase();
}

function isExpired(expiresAt: string) {
  return Boolean(expiresAt) && new Date(expiresAt).getTime() <= Date.now();
}

export function getSavedLicenseKey() {
  return localStorage.getItem(LICENSE_KEY_STORAGE) || localStorage.getItem(LEGACY_LICENSE_KEY_STORAGE) || '';
}

export function clearSavedLicense() {
  localStorage.removeItem(LICENSE_KEY_STORAGE);
  localStorage.removeItem(LEGACY_LICENSE_KEY_STORAGE);
}

function licenseFromSnapshot(id: string, data: unknown): LicenseRecord {
  return { ...(data as LicenseRecord), id };
}

function assertUsableLicense(license: LicenseRecord, uid?: string) {
  if (license.status === 'revoked') throw new Error('License key has been revoked.');
  if (license.status === 'expired' || isExpired(license.expiresAt)) {
    throw new Error('License key has expired.');
  }
  if (license.status !== 'active') {
    throw new Error('License key is not active.');
  }
  if (uid && license.ownerUid && license.ownerUid !== uid) {
    throw new Error('License key is already registered to another account.');
  }
}

export async function activateLicenseForUser(input: string, user: { uid: string; name: string; email: string | null }): Promise<LicenseRecord> {
  const key = normalizeLicenseKey(input);
  if (!key) throw new Error('Enter a license key.');

  const ref = doc(db, 'licenses', key);
  const userRef = doc(db, 'users', user.uid);

  const license = await runTransaction(db, async (transaction) => {
    const fresh = await transaction.get(ref);
    if (!fresh.exists()) throw new Error('License key is invalid.');
    const data = fresh.data() as LicenseRecord;
    if (data.status === 'revoked') throw new Error('License key has been revoked.');
    if (data.status === 'expired' || isExpired(data.expiresAt)) {
      throw new Error('License key has expired.');
    }
    if (data.ownerUid && data.ownerUid !== user.uid) {
      throw new Error('License key is already registered to another account.');
    }
    if (data.status === 'active' && !data.ownerUid) {
      throw new Error('License key is already registered to an account.');
    }

    const now = new Date().toISOString();
    const nextLicense = {
      ...data,
      id: fresh.id,
      key: data.key || key,
      status: data.status === 'unused' ? 'active' : data.status,
      activatedAt: data.activatedAt || now,
      ownerUid: user.uid,
      ownerEmail: user.email,
      lastCheckedAt: now,
    } as LicenseRecord;

    transaction.update(ref, {
      status: nextLicense.status,
      activatedAt: nextLicense.activatedAt,
      ownerUid: user.uid,
      ownerEmail: user.email,
      lastCheckedAt: now,
    });
    transaction.set(userRef, {
      name: user.name,
      email: user.email,
      licenseKey: nextLicense.key,
      licenseId: nextLicense.id,
      createdAt: now,
    });

    return nextLicense;
  });

  try {
    localStorage.setItem(LICENSE_KEY_STORAGE, key);
  } catch {
    // Local persistence is helpful but should not invalidate a committed registration.
  }

  return license;
}

export async function checkRegisteredLicenseForUser(uid: string): Promise<LicenseRecord> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) throw new Error('License registration missing.');

  const userData = userSnap.data() as { licenseKey?: string; licenseId?: string; activationCode?: string };
  const key = normalizeLicenseKey(userData.licenseKey || userData.licenseId || userData.activationCode || getSavedLicenseKey());
  if (!key) throw new Error('License registration missing.');

  const ref = doc(db, 'licenses', key);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('License key is invalid.');

  const license = licenseFromSnapshot(snap.id, snap.data());
  if (license.status !== 'expired' && isExpired(license.expiresAt)) {
    await updateDoc(ref, { status: 'expired', lastCheckedAt: new Date().toISOString() });
    throw new Error('License key has expired.');
  }

  assertUsableLicense(license, uid);
  await updateDoc(ref, { lastCheckedAt: new Date().toISOString() });
  localStorage.setItem(LICENSE_KEY_STORAGE, key);
  return license;
}

export async function validateLicenseKey(input: string): Promise<LicenseRecord> {
  const key = normalizeLicenseKey(input);
  if (!key) throw new Error('Enter a license key.');

  const ref = doc(db, 'licenses', key);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('License key is invalid.');

  const license = { id: snap.id, ...snap.data() } as LicenseRecord;
  if (license.status === 'revoked') throw new Error('License key has been revoked.');
  if (license.status === 'expired' || isExpired(license.expiresAt)) {
    await updateDoc(ref, { status: 'expired', lastCheckedAt: new Date().toISOString() });
    throw new Error('License key has expired.');
  }
  return license;
}
