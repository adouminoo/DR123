# Top Management You

Top Management You is a complete single-doctor clinic management web app built with React, Vite, TypeScript, TailwindCSS, Firebase Firestore, FullCalendar, and GitHub Pages deployment.

## Features

- Firebase Auth email/password account login and logout
- License-key registration for new clinic accounts
- Per-account clinic data under `users/{uid}`
- English, French, and Arabic UI translations
- Arabic automatically switches the app to RTL layout
- Dark mode and responsive mobile/desktop layout
- Dashboard with MAD/DH revenue cards
- Today's Queue dashboard widget with Arrived, In Consultation, and Completed quick actions
- Recently Opened Patients widget stored locally
- Patient alert badges for first visit, unpaid balance, no-show history, and upcoming appointments
- Day, week, and month FullCalendar views
- Appointment create, edit, delete, drag and drop
- Soft deletion with Recycle Bin restore and permanent delete
- Overlap prevention for active appointments
- Appointment durations: 15, 30, 45, 60, 90, 120, or custom
- Quick appointment input, such as `Adam 15:00` or `Sarah tomorrow 10:30`
- Appointment auto-save drafts in `localStorage` with restore/discard prompt
- Patients with IDs, medical notes, appointment history, and treatment history
- Patient medical timeline notes with add, edit, delete, and timestamps
- Services and customizable service categories
- Service selection during appointment creation with automatic duration and price fill
- Waiting room Kanban board
- Manual revenue and paid/unpaid tracking
- Cash, card, transfer, and other payment methods
- WhatsApp reminder copy/open buttons
- Search by patient ID, patient name, phone, and appointment ID
- Statistics for appointments by month, revenue by month, common treatments, no-show rate, new vs returning patients, revenue by service, and most requested services
- JSON, CSV, Excel export and JSON import
- Daily backup generator using `backup-YYYY-MM-DD.json`
- Audit log for appointments, patients, payments, settings, backups, services, and notes
- Sample test data loader

## Firestore Project

Project ID:

```txt
dr123-efedd
```

Copy `.env.example` to `.env.local` and fill in the Firebase web app values from Firebase Console:

```bash
cp .env.example .env.local
```

Required variables:

```txt
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=dr123-efedd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dr123-efedd
VITE_FIREBASE_STORAGE_BUCKET=dr123-efedd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

The public DR123 app opens directly to Login/Register. Existing users sign in with Firebase Authentication email/password accounts.

New users register with name, email, password, and a valid DR123 license key. Valid license keys are created only in the private `license-admin` desktop app and stored in `licenses/{key}`. During registration, DR123 creates the Firebase Auth user, activates/binds the license, and creates the user document in one Firestore transaction. If license registration fails, the temporary Auth user is deleted.

## Build

```bash
npm run build
npm run preview
```

## Firestore Schema

Collections used by the app:

```txt
admins/{uid}
licenses/{key}
users/{uid}
users/{uid}/patients/{id}
users/{uid}/appointments/{id}
users/{uid}/payments/{id}
users/{uid}/treatments/{id}
users/{uid}/services/{id}
users/{uid}/service_categories/{id}
users/{uid}/note_timeline/{id}
users/{uid}/audit_logs/{id}
users/{uid}/settings/{id}

licenses/{key}
  id: string
  key: string
  type: trial | full
  status: unused | active | expired | revoked
  createdAt: ISO string
  activatedAt: ISO string
  expiresAt: ISO string
  clinicName: string
  contactPhone: string
  deviceId: string
  lastCheckedAt: ISO string

admins/{uid}
  Create one document whose id is the Firebase Auth uid of the owner account.

users/{uid}/patients/{id}
  id: string
  patientId: PAT-0001
  name: string
  phone: string
  age: number
  gender: Female | Male | Other
  address: string
  medicalNotes: string
  createdAt: ISO string
  updatedAt: ISO string
  deleted?: boolean
  deletedAt?: ISO string

appointments/{id}
  id: string
  appointmentId: APT-2026-0001
  patientId: PAT-0001
  patientName: string
  serviceId?: string
  serviceName?: string
  serviceCategory?: string
  date: YYYY-MM-DD
  time: HH:mm
  duration: minutes
  status: Scheduled | Confirmed | Arrived | Waiting | In Consultation | Completed | Cancelled | No Show
  notes: string
  treatmentPerformed: string
  revenueAmount: number
  paid: boolean
  paymentMethod: Cash | Card | Transfer | Other
  createdAt: ISO string
  updatedAt: ISO string
  deleted?: boolean
  deletedAt?: ISO string

treatments/{id}
  id: string
  name: string
  defaultPrice: number
  notes: string
  deleted?: boolean
  deletedAt?: ISO string

services/{id}
  id: string
  name: string
  category: string
  defaultDuration: minutes
  defaultPrice: number
  description: string
  active: boolean
  createdAt: ISO string
  updatedAt: ISO string
  deleted?: boolean
  deletedAt?: ISO string

service_categories/{id}
  id: string
  name: string
  description: string
  createdAt: ISO string
  updatedAt: ISO string

note_timeline/{id}
  id: string
  patientId: PAT-0001
  text: string
  createdAt: ISO string
  updatedAt: ISO string

payments/{id}
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  amount: number
  method: Cash | Card | Transfer | Other
  paid: boolean
  date: YYYY-MM-DD
  notes: string
  createdAt: ISO string

audit_logs/{id}
  id: string
  action: string
  entity: appointment | patient | payment | settings | backup | service | treatment | note
  entityId: string
  details: string
  createdAt: ISO string
```

## Firestore Migrations

Existing documents continue to work. New optional fields are added as records are edited:

- `deleted` and `deletedAt` on patients, appointments, services, and treatments
- `serviceId`, `serviceName`, and `serviceCategory` on appointments

The app filters `deleted: true` records out of calendar, dashboard, search, statistics, and waiting room. Deleted records older than 30 days are permanently purged when the app loads.

## Firestore Rules

Deploy included rules:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Important: enable the Email/Password provider in Firebase Authentication before deploying. The included rules isolate each user's clinic data under `users/{uid}`, allow public validation of specific `licenses/{key}` documents, and allow license administration only for Firebase users listed in `admins/{uid}`.

To grant owner access to the private desktop admin app:

1. Create or choose your owner Firebase Auth account.
2. Copy that account's Firebase Auth `uid`.
3. In Firestore, create `admins/{uid}` using that uid as the document id.

The public customer app contains only license validation code. License generation and management live only in `license-admin`.

## DR123 License Admin

`license-admin` is a separate private React + Vite + TypeScript + Electron desktop app for the app owner. It connects to the same `dr123-efedd` Firebase project and manages the top-level `licenses` collection.

The desktop app bundles the DR123 Firebase web configuration in `license-admin/src/firebaseConfig.ts` so packaged `.exe` builds do not depend on shell environment variables being present at runtime. `VITE_FIREBASE_*` variables are still supported as build-time overrides. If any required config value is missing, the app shows `Firebase configuration missing` before attempting Firebase Auth.

Features:

- Firebase Auth owner login
- Generate 3-day, 7-day, and 14-day trial keys
- Generate full lifetime keys
- Bulk generate keys
- Copy keys to clipboard
- Export visible keys to CSV
- View, search, revoke, extend, and reset device binding
- Status counters for active, unused, expired, and revoked licenses

Build a Windows installer:

```powershell
cd license-admin
npm install
$env:VITE_FIREBASE_API_KEY="AIzaSyArkFw6ERT-XZ7VG1FXv7cPMwb6u-EZiu8"
$env:VITE_FIREBASE_AUTH_DOMAIN="dr123-efedd.firebaseapp.com"
$env:VITE_FIREBASE_PROJECT_ID="dr123-efedd"
$env:VITE_FIREBASE_STORAGE_BUCKET="dr123-efedd.firebasestorage.app"
$env:VITE_FIREBASE_MESSAGING_SENDER_ID="1017456632024"
$env:VITE_FIREBASE_APP_ID="1:1017456632024:web:271a0daa82ad23637fb7ad"
npm run dist:win
```

The Windows `.exe` installer is created under:

```txt
license-admin/release/
```

For local desktop development:

```bash
cd license-admin
npm install
npm run dev
```

## Sample Test Data

Use the `Load sample test data` button in Backups, or import `public/sample-backup.json`.

The in-app seed includes:

- 3 patients
- 3 appointments
- 1 payment
- 3 treatments
- 4 services
- 3 service categories

## Backup Format

Daily backups include:

- Patients
- Appointments
- Treatments
- Services
- Service categories
- Payments
- Settings
- Audit logs
- Notes timeline entries

Backups created by the dashboard `Create Backup` button are named like:

```txt
backup-2026-06-13.json
```

## GitHub Pages Deployment

1. Create a GitHub repository named `DR123` or update the `/DR123/` base path in `package.json` scripts to match your repo name.
2. Add repository secrets or environment variables for the Vite Firebase values if you do not commit `.env.local`.
3. Push to `main`.
4. In GitHub repo settings, enable Pages with source `GitHub Actions`.
5. The included workflow `.github/workflows/pages.yml` builds and deploys `dist`.

Create these GitHub repository secrets before deploying:

```txt
VITE_FIREBASE_API_KEY=AIzaSyArkFw6ERT-XZ7VG1FXv7cPMwb6u-EZiu8
VITE_FIREBASE_AUTH_DOMAIN=dr123-efedd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dr123-efedd
VITE_FIREBASE_STORAGE_BUCKET=dr123-efedd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1017456632024
VITE_FIREBASE_APP_ID=1:1017456632024:web:271a0daa82ad23637fb7ad
```

The deployed site must be served from the GitHub Actions artifact, not from the source branch root. If the live HTML contains `/src/main.tsx`, GitHub Pages is serving the unbuilt repository source instead of the Vite output. Set **Settings -> Pages -> Build and deployment -> Source** to **GitHub Actions**.

The Pages build is verified by:

```bash
npm run build:pages
npm run verify:pages
```

The verifier checks that `dist/index.html` references `/DR123/assets/...`, does not contain `/src/main.tsx`, does not contain unresolved `%BASE_URL%`, includes `toplinkyou-logo.png`, and that the compiled JavaScript contains the required Firebase build-time values instead of fallback placeholders.

Manual deploy with `gh-pages`:

```bash
npm run deploy
```

## Currency

All revenue is formatted as Moroccan dirham using `MAD`; UI labels also use DH.
