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
  deviceId: string;
  lastCheckedAt: string;
};

const LICENSE_KEY_STORAGE = 'dr123_license_key';
const DEVICE_ID_STORAGE = 'dr123_device_id';

function normalizeLicenseKey(key: string) {
  return key.trim().toUpperCase();
}

function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_STORAGE);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_STORAGE, next);
  return next;
}

function isExpired(expiresAt: string) {
  return Boolean(expiresAt) && new Date(expiresAt).getTime() <= Date.now();
}

export function getSavedLicenseKey() {
  return localStorage.getItem(LICENSE_KEY_STORAGE) || '';
}

export function clearSavedLicense() {
  localStorage.removeItem(LICENSE_KEY_STORAGE);
}

function licenseFromSnapshot(id: string, data: unknown): LicenseRecord {
  return { ...(data as LicenseRecord), id };
}

function assertUsableLicense(license: LicenseRecord, deviceId: string) {
  if (license.status === 'revoked') throw new Error('License key has been revoked.');
  if (license.status === 'expired' || isExpired(license.expiresAt)) {
    throw new Error('License key has expired.');
  }
  if (license.status !== 'active') {
    throw new Error('License key is not active.');
  }
  if (license.deviceId && license.deviceId !== deviceId) {
    throw new Error('License key is already active on another device.');
  }
}

export async function activateLicenseForUser(input: string, user: { uid: string; name: string; email: string | null }): Promise<LicenseRecord> {
  const key = normalizeLicenseKey(input);
  if (!key) throw new Error('Enter a license key.');

  const deviceId = getDeviceId();
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
    if (data.deviceId && data.deviceId !== deviceId) {
      throw new Error('License key is already active on another device.');
    }

    const now = new Date().toISOString();
    const nextLicense = {
      ...data,
      id: fresh.id,
      key: data.key || key,
      status: data.status === 'unused' ? 'active' : data.status,
      activatedAt: data.activatedAt || now,
      deviceId,
      lastCheckedAt: now,
    } as LicenseRecord;

    transaction.update(ref, {
      status: nextLicense.status,
      activatedAt: nextLicense.activatedAt,
      deviceId,
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

  const userData = userSnap.data() as { licenseKey?: string; licenseId?: string };
  const key = normalizeLicenseKey(userData.licenseKey || userData.licenseId || getSavedLicenseKey());
  if (!key) throw new Error('License registration missing.');

  const deviceId = getDeviceId();
  const ref = doc(db, 'licenses', key);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('License key is invalid.');

  const license = licenseFromSnapshot(snap.id, snap.data());
  if (license.status !== 'expired' && isExpired(license.expiresAt)) {
    await updateDoc(ref, { status: 'expired', lastCheckedAt: new Date().toISOString() });
    throw new Error('License key has expired.');
  }

  assertUsableLicense(license, deviceId);
  await updateDoc(ref, { lastCheckedAt: new Date().toISOString() });
  localStorage.setItem(LICENSE_KEY_STORAGE, key);
  return license;
}

export async function validateLicenseKey(input: string): Promise<LicenseRecord> {
  const key = normalizeLicenseKey(input);
  if (!key) throw new Error('Enter a license key.');

  const deviceId = getDeviceId();
  const ref = doc(db, 'licenses', key);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('License key is invalid.');

  const license = { id: snap.id, ...snap.data() } as LicenseRecord;
  if (license.status === 'revoked') throw new Error('License key has been revoked.');
  if (license.status === 'expired' || isExpired(license.expiresAt)) {
    await updateDoc(ref, { status: 'expired', lastCheckedAt: new Date().toISOString() });
    throw new Error('License key has expired.');
  }
  if (license.deviceId && license.deviceId !== deviceId) {
    throw new Error('License key is already active on another device.');
  }

  await runTransaction(db, async (transaction) => {
    const fresh = await transaction.get(ref);
    if (!fresh.exists()) throw new Error('License key is invalid.');
    const data = fresh.data() as LicenseRecord;
    if (data.status === 'revoked') throw new Error('License key has been revoked.');
    if (data.status === 'expired' || isExpired(data.expiresAt)) {
      transaction.update(ref, { status: 'expired', lastCheckedAt: new Date().toISOString() });
      throw new Error('License key has expired.');
    }
    if (data.deviceId && data.deviceId !== deviceId) {
      throw new Error('License key is already active on another device.');
    }

    const now = new Date().toISOString();
    transaction.update(ref, {
      status: data.status === 'unused' ? 'active' : data.status,
      activatedAt: data.activatedAt || now,
      deviceId,
      lastCheckedAt: now,
    });
  });

  localStorage.setItem(LICENSE_KEY_STORAGE, key);
  const updated = await getDoc(ref);
  return { id: updated.id, ...updated.data() } as LicenseRecord;
}
