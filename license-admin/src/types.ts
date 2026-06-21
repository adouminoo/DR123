export type LicenseType = 'trial' | 'full';
export type LicenseStatus = 'unused' | 'active' | 'expired' | 'revoked';

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
