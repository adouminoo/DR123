import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Building2, Copy, Download, KeyRound, LogOut, RotateCcw, Search, ShieldAlert, TimerReset } from 'lucide-react';
import { auth, db, firebaseConfig, firebaseConfigurationError, missingFirebaseConfigKeys } from './firebase';
import type { LicenseRecord, LicenseStatus, LicenseType } from './types';

const statusLabels: LicenseStatus[] = ['unused', 'active', 'expired', 'revoked'];

type CustomerGroup = {
  key: string;
  clinicName: string;
  contactPhone: string;
  licenses: LicenseRecord[];
  active: number;
  trials: number;
  expired: number;
  revoked: number;
};

function nowIso() {
  return new Date().toISOString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function generateKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parts = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(''),
  );
  return `DR123-${parts.join('-')}`;
}

function computedStatus(license: LicenseRecord): LicenseStatus {
  if (license.status === 'revoked') return 'revoked';
  if (license.expiresAt && new Date(license.expiresAt).getTime() <= Date.now()) return 'expired';
  return license.status;
}

function customerKey(license: Pick<LicenseRecord, 'clinicName' | 'contactPhone'>) {
  return `${license.clinicName?.trim() || 'Unassigned workspace'}|${license.contactPhone?.trim() || ''}`;
}

function toCsv(rows: LicenseRecord[]) {
  const headers: Array<keyof LicenseRecord> = [
    'id',
    'key',
    'type',
    'status',
    'createdAt',
    'activatedAt',
    'expiresAt',
    'clinicName',
    'contactPhone',
    'deviceId',
    'lastCheckedAt',
  ];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark"><KeyRound size={34} /></div>
        <h1>DR123 License Admin</h1>
        <p>Owner-only desktop console for creating and managing customer license keys.</p>
        <label>Email</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoFocus />
        <label>Password</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        {error && <div className="error">{error}</div>}
        <button disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </main>
  );
}

function FirebaseConfigError() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark"><ShieldAlert size={34} /></div>
        <h1>Firebase configuration missing</h1>
        <p>DR123 License Admin cannot start because required Firebase configuration values are missing.</p>
        <div className="error">
          Missing: {missingFirebaseConfigKeys.join(', ') || 'unknown'}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LicenseStatus>('all');
  const [type, setType] = useState<LicenseType>('trial');
  const [trialDays, setTrialDays] = useState(7);
  const [bulkCount, setBulkCount] = useState(1);
  const [clinicName, setClinicName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');

  useEffect(() => {
    if (firebaseConfigurationError) return undefined;
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'licenses'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setLoadError('');
      setLicenses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as LicenseRecord));
    }, (error) => {
      setLoadError(`${error.message} Make sure this Firebase user is listed in Firestore admins/${user.uid}.`);
    });
  }, [user]);

  const filtered = useMemo(() => {
    const term = queryText.trim().toLowerCase();
    return licenses
      .map((license) => ({ ...license, status: computedStatus(license) }))
      .filter((license) => statusFilter === 'all' || license.status === statusFilter)
      .filter((license) => !term || [license.key, license.clinicName, license.contactPhone, license.deviceId].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [licenses, queryText, statusFilter]);

  const customerGroups = useMemo<CustomerGroup[]>(() => {
    const groups = new Map<string, LicenseRecord[]>();
    filtered.forEach((license) => {
      const key = customerKey(license);
      groups.set(key, [...(groups.get(key) || []), license]);
    });
    return Array.from(groups.entries())
      .map(([key, rows]) => {
        const [groupName = 'Unassigned workspace', groupPhone = ''] = key.split('|');
        return {
          key,
          clinicName: groupName,
          contactPhone: groupPhone,
          licenses: rows,
          active: rows.filter((license) => license.status === 'active').length,
          trials: rows.filter((license) => license.type === 'trial').length,
          expired: rows.filter((license) => license.status === 'expired').length,
          revoked: rows.filter((license) => license.status === 'revoked').length,
        };
      })
      .sort((a, b) => b.licenses.length - a.licenses.length || a.clinicName.localeCompare(b.clinicName));
  }, [filtered]);

  const visibleLicenses = useMemo(() => (
    customerFilter === 'all' ? filtered : filtered.filter((license) => customerKey(license) === customerFilter)
  ), [customerFilter, filtered]);

  const counts = useMemo(() => statusLabels.reduce<Record<LicenseStatus, number>>((acc, status) => {
    acc[status] = licenses.filter((license) => computedStatus(license) === status).length;
    return acc;
  }, { unused: 0, active: 0, expired: 0, revoked: 0 }), [licenses]);

  async function createLicenses(event: React.FormEvent) {
    event.preventDefault();
    const count = Math.max(1, Math.min(250, Number(bulkCount || 1)));
    const batch = writeBatch(db);
    const created: LicenseRecord[] = [];

    for (let index = 0; index < count; index += 1) {
      let key = generateKey();
      while (created.some((item) => item.key === key)) key = generateKey();
      const createdAt = nowIso();
      const license: LicenseRecord = {
        id: key,
        key,
        type,
        status: 'unused',
        createdAt,
        activatedAt: '',
        expiresAt: type === 'trial' ? addDays(new Date(), trialDays).toISOString() : '',
        clinicName: clinicName.trim(),
        contactPhone: contactPhone.trim(),
        deviceId: '',
        lastCheckedAt: '',
      };
      created.push(license);
      batch.set(doc(db, 'licenses', key), license);
    }

    await batch.commit();
    setMessage(`Generated ${created.length} license key${created.length === 1 ? '' : 's'}.`);
  }

  async function copyKey(key: string) {
    await window.licenseAdmin.copyText(key);
    setMessage(`Copied ${key}`);
  }

  async function exportCsv() {
    const saved = await window.licenseAdmin.saveCsv(`dr123-licenses-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(visibleLicenses));
    if (saved) setMessage(`Exported ${visibleLicenses.length} license${visibleLicenses.length === 1 ? '' : 's'}.`);
  }

  async function revokeLicense(license: LicenseRecord) {
    if (!confirm(`Revoke ${license.key}?`)) return;
    await updateDoc(doc(db, 'licenses', license.id), { status: 'revoked', lastCheckedAt: nowIso() });
  }

  async function extendLicense(license: LicenseRecord) {
    if (license.type === 'full' && !license.expiresAt) {
      setMessage(`${license.key} is already a lifetime license.`);
      return;
    }
    const input = prompt('Extend by how many days?', '7');
    if (!input) return;
    const days = Number(input);
    if (!Number.isFinite(days) || days <= 0) return;
    const base = license.expiresAt && new Date(license.expiresAt).getTime() > Date.now() ? new Date(license.expiresAt) : new Date();
    await updateDoc(doc(db, 'licenses', license.id), {
      status: license.status === 'expired' ? 'active' : license.status,
      expiresAt: addDays(base, days).toISOString(),
      lastCheckedAt: nowIso(),
    });
    setMessage(`Extended ${license.key} by ${days} day${days === 1 ? '' : 's'}.`);
  }

  async function convertTrialToFull(license: LicenseRecord) {
    if (license.type === 'full') {
      setMessage(`${license.key} is already a lifetime license.`);
      return;
    }
    if (!confirm(`Convert ${license.key} to full lifetime access?`)) return;
    await updateDoc(doc(db, 'licenses', license.id), {
      type: 'full',
      status: license.status === 'revoked' ? 'revoked' : 'active',
      expiresAt: '',
      lastCheckedAt: nowIso(),
    });
    setMessage(`Converted ${license.key} to full lifetime access.`);
  }

  async function resetDevice(license: LicenseRecord) {
    if (!confirm(`Reset device binding for ${license.key}?`)) return;
    await updateDoc(doc(db, 'licenses', license.id), { deviceId: '', activatedAt: '', status: 'unused', lastCheckedAt: nowIso() });
  }

  if (firebaseConfigurationError) return <FirebaseConfigError />;
  if (!authReady) return <main className="login-shell">Loading...</main>;
  if (!user) return <Login />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>DR123 License Admin</h1>
          <p>Connected to Firebase project <b>{firebaseConfig.projectId}</b></p>
        </div>
        <button className="ghost" onClick={() => signOut(auth)}><LogOut size={16} /> Sign out</button>
      </header>

      {loadError && <section className="alert"><ShieldAlert size={18} /> {loadError}</section>}
      {message && <section className="notice">{message}</section>}

      <section className="stats-grid">
        {statusLabels.map((status) => (
          <button key={status} className={`stat ${statusFilter === status ? 'selected' : ''}`} onClick={() => setStatusFilter(status)}>
            <span>{status}</span>
            <b>{counts[status]}</b>
          </button>
        ))}
        <button className={`stat ${statusFilter === 'all' ? 'selected' : ''}`} onClick={() => setStatusFilter('all')}>
          <span>all</span>
          <b>{licenses.length}</b>
        </button>
      </section>

      <section className="panel generator">
        <form onSubmit={createLicenses}>
          <div>
            <h2>Generate keys</h2>
            <p>Create trial or lifetime license keys. Trial expiry starts at generation time.</p>
          </div>
          <div className="segmented">
            <button type="button" className={type === 'trial' ? 'selected' : ''} onClick={() => setType('trial')}>Trial</button>
            <button type="button" className={type === 'full' ? 'selected' : ''} onClick={() => setType('full')}>Full lifetime</button>
          </div>
          {type === 'trial' && (
            <select value={trialDays} onChange={(event) => setTrialDays(Number(event.target.value))}>
              <option value={3}>3-day trial</option>
              <option value={7}>7-day trial</option>
              <option value={14}>14-day trial</option>
            </select>
          )}
          <input type="number" min={1} max={250} value={bulkCount} onChange={(event) => setBulkCount(Number(event.target.value))} />
          <input placeholder="Workspace name" value={clinicName} onChange={(event) => setClinicName(event.target.value)} />
          <input placeholder="Contact phone" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
          <button><KeyRound size={16} /> Generate</button>
        </form>
      </section>

      <section className="toolbar">
        <label>
          <Search size={16} />
          <input placeholder="Search key, workspace, phone, device..." value={queryText} onChange={(event) => setQueryText(event.target.value)} />
        </label>
        <button className={customerFilter === 'all' ? 'selected-filter' : ''} onClick={() => setCustomerFilter('all')}><Building2 size={16} /> All customers</button>
        <button onClick={exportCsv}><Download size={16} /> Export CSV</button>
      </section>

      <section className="customers-grid">
        {customerGroups.map((group) => (
          <button key={group.key} className={`customer-card ${customerFilter === group.key ? 'selected' : ''}`} onClick={() => setCustomerFilter(group.key)}>
            <div>
              <span className="customer-icon"><Building2 size={18} /></span>
              <h3>{group.clinicName}</h3>
              <p>{group.contactPhone || 'No phone'} · {group.licenses.length} key{group.licenses.length === 1 ? '' : 's'}</p>
            </div>
            <div className="customer-metrics">
              <span>{group.active} active</span>
              <span>{group.trials} trial</span>
              <span>{group.expired} expired</span>
              {group.revoked > 0 && <span>{group.revoked} revoked</span>}
            </div>
          </button>
        ))}
        {!customerGroups.length && <div className="empty customer-empty">No customers match this filter.</div>}
      </section>

      <section className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Type</th>
              <th>Status</th>
              <th>Workspace</th>
              <th>Expires</th>
              <th>Device</th>
              <th>Last checked</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleLicenses.map((license) => (
              <tr key={license.id}>
                <td><code>{license.key}</code></td>
                <td>{license.type}</td>
                <td><span className={`badge ${license.status}`}>{license.status}</span></td>
                <td>{license.clinicName || '-'}<br /><small>{license.contactPhone}</small></td>
                <td>{license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Lifetime'}</td>
                <td className="device">{license.deviceId || 'Not bound'}</td>
                <td>{license.lastCheckedAt ? new Date(license.lastCheckedAt).toLocaleString() : '-'}</td>
                <td>
                  <div className="actions">
                    <button title="Copy key" onClick={() => copyKey(license.key)}><Copy size={15} /></button>
                    <button title="Extend license" onClick={() => extendLicense(license)}><TimerReset size={15} /></button>
                    {license.type === 'trial' && license.status !== 'revoked' && <button title="Convert trial to full" onClick={() => convertTrialToFull(license)}>Full</button>}
                    <button title="Reset device binding" onClick={() => resetDevice(license)}><RotateCcw size={15} /></button>
                    <button className="danger" onClick={() => revokeLicense(license)}>Revoke</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleLicenses.length && <div className="empty">No licenses found.</div>}
      </section>
    </main>
  );
}
