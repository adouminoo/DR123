import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import frLocale from '@fullcalendar/core/locales/fr';
import arLocale from '@fullcalendar/core/locales/ar';
import { deleteDoc, setDoc } from 'firebase/firestore';
import {
  Activity,
  Archive,
  CalendarDays,
  Database,
  Download,
  Languages,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Stethoscope,
  Sun,
  Trash2,
  Upload,
  Users,
  WalletCards,
} from 'lucide-react';
import { changeCurrentPassword, loginWithPassword, logout, registerWithActivationCode, watchAuth, type AppUser } from './lib/auth';
import { clearSavedLicense, getSavedLicenseKey, validateLicenseKey, type LicenseRecord } from './lib/license';
import {
  addPayment,
  createAudit,
  deleteTimelineNote,
  downloadFile,
  durationOptions,
  exportBackup,
  exportExcel,
  formatMad,
  getCollection,
  getSettingsBackup,
  importBackup,
  makeAppointmentId,
  makePatientId,
  nowIso,
  overlaps,
  paymentMethods,
  permanentlyDelete,
  purgeOldDeleted,
  restoreItem,
  scopedDoc,
  setActiveUserId,
  softDelete,
  statuses,
  toCsv,
  toDateTime,
  todayIso,
  upsertAppointment,
  upsertPatient,
  upsertService,
  upsertServiceCategory,
  upsertTimelineNote,
} from './lib/clinic';
import { sampleAppointments, samplePatients, samplePayments, sampleServices, sampleServiceCategories, sampleTreatments } from './data/sampleData';
import type {
  Appointment,
  AppointmentStatus,
  AuditLog,
  ClinicBackup,
  Patient,
  Payment,
  PaymentMethod,
  Service,
  ServiceCategory,
  TimelineNote,
  Treatment,
} from './types/clinic';

type Tab = 'dashboard' | 'calendar' | 'patients' | 'services' | 'waiting' | 'revenue' | 'stats' | 'backup' | 'recycle' | 'audit' | 'settings';
type Language = 'en' | 'fr' | 'ar';
type RecentPatient = { patientId: string; name: string; openedAt: string };
type DeletedItem = { collectionName: string; id: string; label: string; entityId: string; entity: AuditLog['entity']; deletedAt?: string };

const APP_NAME = 'Top Management You';
const APP_LOGO = `${import.meta.env.BASE_URL}toplinkyou-logo.png`;
const FOOTER_CREDIT = 'Made by toplinkyou 2026';

const emptyPatient: Patient = {
  id: '',
  patientId: '',
  name: '',
  phone: '',
  age: 0,
  gender: 'Female',
  address: '',
  medicalNotes: '',
  createdAt: '',
  updatedAt: '',
};

const emptyAppointment: Appointment = {
  id: '',
  appointmentId: '',
  patientId: '',
  patientName: '',
  serviceId: '',
  serviceName: '',
  serviceCategory: '',
  date: todayIso(),
  time: '09:00',
  duration: 30,
  status: 'Scheduled',
  notes: '',
  treatmentPerformed: '',
  revenueAmount: 0,
  paid: false,
  paymentMethod: 'Cash',
  createdAt: '',
  updatedAt: '',
};

const emptyService: Service = {
  id: '',
  name: '',
  category: '',
  defaultDuration: 30,
  defaultPrice: 0,
  description: '',
  active: true,
  createdAt: '',
  updatedAt: '',
};

const translations = {
  en: {
    singleDoctor: 'Single-doctor dashboard',
    loginHelp: 'Login with the clinic password. First run creates the default password: admin123.',
    password: 'Password',
    login: 'Login',
    checking: 'Checking...',
    invalidPassword: 'Invalid password.',
    dashboard: 'Dashboard',
    calendar: 'Calendar',
    patients: 'Patients',
    services: 'Services',
    waiting: 'Waiting',
    revenue: 'Revenue',
    stats: 'Stats',
    backup: 'Backups',
    recycle: 'Recycle Bin',
    audit: 'Audit',
    settings: 'Settings',
    search: 'Search ID, patient, phone, appointment...',
    logout: 'Logout',
    todayRevenue: 'Today revenue',
    weekRevenue: 'Week revenue',
    monthRevenue: 'Month revenue',
    outstanding: 'Outstanding',
    todaysQueue: "Today's Queue",
    recentPatients: 'Recently Opened Patients',
    upcoming: 'Upcoming appointments',
    outstandingPayments: 'Outstanding payments',
    quickAdd: 'Quick appointment',
    quickPlaceholder: 'Adam 15:00 or Sarah tomorrow 10:30',
    create: 'Create',
    createBackup: 'Create Backup',
    downloadBackup: 'Download Backup',
    lastBackupDate: 'Last Backup Date',
    lastBackupTime: 'Last Backup Time',
    noBackup: 'No backup yet',
    arrived: 'Arrived',
    inConsultation: 'In Consultation',
    completed: 'Completed',
    newPatient: 'New patient',
    editPatient: 'Edit patient',
    patientProfile: 'Patient profile',
    medicalTimeline: 'Medical Timeline',
    addNote: 'Add note',
    edit: 'Edit',
    delete: 'Delete',
    restore: 'Restore',
    discard: 'Discard',
    save: 'Save',
    clear: 'Clear',
    noAppointments: 'No appointments.',
    noData: 'No data yet.',
    restoreDraft: 'Restore unsaved appointment?',
    draftSaved: 'Draft auto-saved',
    serviceDropdown: 'Service',
    newAppointment: 'New appointment',
    editAppointment: 'Edit appointment',
    treatment: 'Treatment performed',
    paid: 'Paid',
    unpaid: 'Unpaid',
    notes: 'Notes',
    revenueByService: 'Revenue by Service',
    requestedServices: 'Most Requested Services',
    appointmentsByMonth: 'Appointments by month',
    revenueByMonth: 'Revenue by month',
    commonTreatments: 'Most common treatments',
    noShowRate: 'No-show rate',
    newReturning: 'New vs returning',
    active: 'Active',
    inactive: 'Inactive',
    category: 'Category',
    categories: 'Categories',
    defaultDuration: 'Default Duration',
    defaultPrice: 'Default Price',
    description: 'Description',
    loadSample: 'Load sample test data',
    exportJson: 'Export JSON',
    exportCsv: 'Export CSV',
    exportExcel: 'Export Excel',
    importBackup: 'Import backup',
    deletedDate: 'Deletion date',
    permanentDelete: 'Permanently delete',
    firstVisit: 'First Visit',
    unpaidBalance: 'Unpaid Balance',
    noShowThree: 'No-Show 3+ Times',
    upcomingAppointment: 'Upcoming Appointment',
    language: 'Language',
    adminPassword: 'Admin password',
    updatePassword: 'Update password',
    name: 'Name',
    phone: 'Phone',
    age: 'Age',
    gender: 'Gender',
    address: 'Address',
    history: 'History',
    patient: 'Patient',
    date: 'Date',
    amount: 'Amount',
    method: 'Method',
    status: 'Status',
    noTreatments: 'No treatments',
    selectPatient: 'Select patient',
    custom: 'Custom',
    copyReminder: 'Copy reminder',
    searchResults: 'Search results',
    clinicManagement: 'Clinic management',
    noTreatmentYet: 'No treatment yet',
    newService: 'New service',
    deleteCategory: 'Delete category',
    statusScheduled: 'Scheduled',
    statusConfirmed: 'Confirmed',
    statusArrived: 'Arrived',
    statusWaiting: 'Waiting',
    statusInConsultation: 'In Consultation',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    statusNoShow: 'No Show',
  },
  fr: {
    singleDoctor: 'Tableau de bord médecin unique',
    loginHelp: 'Connectez-vous avec le mot de passe de la clinique. Au premier lancement, le mot de passe est admin123.',
    password: 'Mot de passe',
    login: 'Connexion',
    checking: 'Vérification...',
    invalidPassword: 'Mot de passe invalide.',
    dashboard: 'Tableau',
    calendar: 'Calendrier',
    patients: 'Patients',
    services: 'Services',
    waiting: 'Attente',
    revenue: 'Revenus',
    stats: 'Stats',
    backup: 'Sauvegardes',
    recycle: 'Corbeille',
    audit: 'Audit',
    settings: 'Paramètres',
    search: 'Rechercher ID, patient, téléphone, rendez-vous...',
    logout: 'Déconnexion',
    todayRevenue: "Revenu aujourd'hui",
    weekRevenue: 'Revenu semaine',
    monthRevenue: 'Revenu mois',
    outstanding: 'Impayés',
    todaysQueue: "File d'aujourd'hui",
    recentPatients: 'Patients récemment ouverts',
    upcoming: 'Rendez-vous à venir',
    outstandingPayments: 'Paiements impayés',
    quickAdd: 'Rendez-vous rapide',
    quickPlaceholder: 'Adam 15:00 ou Sarah demain 10:30',
    create: 'Créer',
    createBackup: 'Créer sauvegarde',
    downloadBackup: 'Télécharger sauvegarde',
    lastBackupDate: 'Dernière date',
    lastBackupTime: 'Dernière heure',
    noBackup: 'Aucune sauvegarde',
    arrived: 'Arrivé',
    inConsultation: 'En consultation',
    completed: 'Terminé',
    newPatient: 'Nouveau patient',
    editPatient: 'Modifier patient',
    patientProfile: 'Profil patient',
    medicalTimeline: 'Chronologie médicale',
    addNote: 'Ajouter note',
    edit: 'Modifier',
    delete: 'Supprimer',
    restore: 'Restaurer',
    discard: 'Ignorer',
    save: 'Enregistrer',
    clear: 'Effacer',
    noAppointments: 'Aucun rendez-vous.',
    noData: 'Aucune donnée.',
    restoreDraft: 'Restaurer le brouillon non enregistré ?',
    draftSaved: 'Brouillon enregistré',
    serviceDropdown: 'Service',
    newAppointment: 'Nouveau rendez-vous',
    editAppointment: 'Modifier rendez-vous',
    treatment: 'Traitement effectué',
    paid: 'Payé',
    unpaid: 'Non payé',
    notes: 'Notes',
    revenueByService: 'Revenu par service',
    requestedServices: 'Services les plus demandés',
    appointmentsByMonth: 'Rendez-vous par mois',
    revenueByMonth: 'Revenu par mois',
    commonTreatments: 'Traitements fréquents',
    noShowRate: "Taux d'absence",
    newReturning: 'Nouveaux vs récurrents',
    active: 'Actif',
    inactive: 'Inactif',
    category: 'Catégorie',
    categories: 'Catégories',
    defaultDuration: 'Durée par défaut',
    defaultPrice: 'Prix par défaut',
    description: 'Description',
    loadSample: 'Charger données test',
    exportJson: 'Exporter JSON',
    exportCsv: 'Exporter CSV',
    exportExcel: 'Exporter Excel',
    importBackup: 'Importer sauvegarde',
    deletedDate: 'Date de suppression',
    permanentDelete: 'Supprimer définitivement',
    firstVisit: 'Première visite',
    unpaidBalance: 'Solde impayé',
    noShowThree: 'Absence 3+ fois',
    upcomingAppointment: 'Rendez-vous à venir',
    language: 'Langue',
    adminPassword: 'Mot de passe admin',
    updatePassword: 'Mettre à jour',
    name: 'Nom',
    phone: 'Téléphone',
    age: 'Âge',
    gender: 'Genre',
    address: 'Adresse',
    history: 'Historique',
    patient: 'Patient',
    date: 'Date',
    amount: 'Montant',
    method: 'Méthode',
    status: 'Statut',
    noTreatments: 'Aucun traitement',
    selectPatient: 'Sélectionner patient',
    custom: 'Personnalisé',
    copyReminder: 'Copier rappel',
    searchResults: 'Résultats de recherche',
    clinicManagement: 'Gestion clinique',
    noTreatmentYet: 'Aucun traitement',
    newService: 'Nouveau service',
    deleteCategory: 'Supprimer catégorie',
    statusScheduled: 'Planifié',
    statusConfirmed: 'Confirmé',
    statusArrived: 'Arrivé',
    statusWaiting: 'En attente',
    statusInConsultation: 'En consultation',
    statusCompleted: 'Terminé',
    statusCancelled: 'Annulé',
    statusNoShow: 'Absent',
  },
  ar: {
    singleDoctor: 'لوحة طبيب واحد',
    loginHelp: 'سجل الدخول بكلمة مرور العيادة. عند أول تشغيل تكون كلمة المرور admin123.',
    password: 'كلمة المرور',
    login: 'دخول',
    checking: 'جار التحقق...',
    invalidPassword: 'كلمة المرور غير صحيحة.',
    dashboard: 'الرئيسية',
    calendar: 'التقويم',
    patients: 'المرضى',
    services: 'الخدمات',
    waiting: 'الانتظار',
    revenue: 'المداخيل',
    stats: 'الإحصائيات',
    backup: 'النسخ',
    recycle: 'سلة المحذوفات',
    audit: 'السجل',
    settings: 'الإعدادات',
    search: 'ابحث بالمعرف أو الاسم أو الهاتف أو الموعد...',
    logout: 'خروج',
    todayRevenue: 'مداخيل اليوم',
    weekRevenue: 'مداخيل الأسبوع',
    monthRevenue: 'مداخيل الشهر',
    outstanding: 'المبالغ غير المؤداة',
    todaysQueue: 'قائمة اليوم',
    recentPatients: 'المرضى المفتوحون مؤخرا',
    upcoming: 'المواعيد القادمة',
    outstandingPayments: 'مدفوعات غير مؤداة',
    quickAdd: 'موعد سريع',
    quickPlaceholder: 'Adam 15:00 أو Sarah tomorrow 10:30',
    create: 'إنشاء',
    createBackup: 'إنشاء نسخة',
    downloadBackup: 'تنزيل النسخة',
    lastBackupDate: 'تاريخ آخر نسخة',
    lastBackupTime: 'وقت آخر نسخة',
    noBackup: 'لا توجد نسخة',
    arrived: 'وصل',
    inConsultation: 'في الاستشارة',
    completed: 'مكتمل',
    newPatient: 'مريض جديد',
    editPatient: 'تعديل المريض',
    patientProfile: 'ملف المريض',
    medicalTimeline: 'الخط الزمني الطبي',
    addNote: 'إضافة ملاحظة',
    edit: 'تعديل',
    delete: 'حذف',
    restore: 'استرجاع',
    discard: 'تجاهل',
    save: 'حفظ',
    clear: 'مسح',
    noAppointments: 'لا توجد مواعيد.',
    noData: 'لا توجد بيانات.',
    restoreDraft: 'استرجاع مسودة موعد غير محفوظة؟',
    draftSaved: 'تم حفظ المسودة',
    serviceDropdown: 'الخدمة',
    newAppointment: 'موعد جديد',
    editAppointment: 'تعديل الموعد',
    treatment: 'العلاج المنجز',
    paid: 'مدفوع',
    unpaid: 'غير مدفوع',
    notes: 'ملاحظات',
    revenueByService: 'المداخيل حسب الخدمة',
    requestedServices: 'الخدمات الأكثر طلبا',
    appointmentsByMonth: 'المواعيد حسب الشهر',
    revenueByMonth: 'المداخيل حسب الشهر',
    commonTreatments: 'العلاجات الشائعة',
    noShowRate: 'نسبة الغياب',
    newReturning: 'جدد مقابل عائدين',
    active: 'نشط',
    inactive: 'غير نشط',
    category: 'الفئة',
    categories: 'الفئات',
    defaultDuration: 'المدة الافتراضية',
    defaultPrice: 'السعر الافتراضي',
    description: 'الوصف',
    loadSample: 'تحميل بيانات تجريبية',
    exportJson: 'تصدير JSON',
    exportCsv: 'تصدير CSV',
    exportExcel: 'تصدير Excel',
    importBackup: 'استيراد نسخة',
    deletedDate: 'تاريخ الحذف',
    permanentDelete: 'حذف نهائي',
    firstVisit: 'زيارة أولى',
    unpaidBalance: 'رصيد غير مؤدى',
    noShowThree: 'غياب 3 مرات أو أكثر',
    upcomingAppointment: 'موعد قادم',
    language: 'اللغة',
    adminPassword: 'كلمة مرور المدير',
    updatePassword: 'تحديث كلمة المرور',
    name: 'الاسم',
    phone: 'الهاتف',
    age: 'العمر',
    gender: 'الجنس',
    address: 'العنوان',
    history: 'السجل',
    patient: 'المريض',
    date: 'التاريخ',
    amount: 'المبلغ',
    method: 'طريقة الدفع',
    status: 'الحالة',
    noTreatments: 'لا توجد علاجات',
    selectPatient: 'اختر المريض',
    custom: 'مخصص',
    copyReminder: 'نسخ التذكير',
    searchResults: 'نتائج البحث',
    clinicManagement: 'إدارة العيادة',
    noTreatmentYet: 'لا يوجد علاج بعد',
    newService: 'خدمة جديدة',
    deleteCategory: 'حذف الفئة',
    statusScheduled: 'مجدول',
    statusConfirmed: 'مؤكد',
    statusArrived: 'وصل',
    statusWaiting: 'في الانتظار',
    statusInConsultation: 'في الاستشارة',
    statusCompleted: 'مكتمل',
    statusCancelled: 'ملغى',
    statusNoShow: 'لم يحضر',
  },
} satisfies Record<Language, Record<string, string>>;

function tStatus(status: AppointmentStatus, t: Record<string, string>) {
  return {
    Scheduled: t.statusScheduled,
    Confirmed: t.statusConfirmed,
    Arrived: t.statusArrived,
    Waiting: t.statusWaiting,
    'In Consultation': t.statusInConsultation,
    Completed: t.statusCompleted,
    Cancelled: t.statusCancelled,
    'No Show': t.statusNoShow,
  }[status];
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function dateInRange(date: string, days: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const value = new Date(`${date}T00:00`);
  return value >= start && value < end;
}

function isTomorrowToken(token: string) {
  return ['tomorrow', 'demain', 'غدا'].includes(token.toLowerCase());
}

function eventColor(status: AppointmentStatus) {
  return {
    Scheduled: '#2563eb',
    Confirmed: '#7c3aed',
    Arrived: '#0891b2',
    Waiting: '#f59e0b',
    'In Consultation': '#0d9488',
    Completed: '#16a34a',
    Cancelled: '#dc2626',
    'No Show': '#64748b',
  }[status];
}

function Login({ t }: { t: Record<string, string> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'register') {
        await registerWithActivationCode(name, email, password, activationCode);
      } else {
        await loginWithPassword(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">{t.singleDoctor}</p>
          <div className="mt-4 flex items-center gap-3">
            <img src={APP_LOGO} alt={`${APP_NAME} logo`} className="h-16 w-16 rounded-full object-contain bg-white p-1" />
            <h1 className="text-3xl font-bold">{APP_NAME}</h1>
          </div>
          <p className="mt-2 text-sm text-slate-300">Login to your account, or register once with an activation code from the clinic owner.</p>
        </div>
        <div className="mb-5 grid grid-cols-2 rounded-md bg-slate-800 p-1 text-sm">
          <button type="button" className={`rounded px-3 py-2 ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-300'}`} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={`rounded px-3 py-2 ${mode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-300'}`} onClick={() => setMode('register')}>Register</button>
        </div>
        {mode === 'register' && (
          <>
            <label className="text-sm font-medium">Name</label>
            <input className="input mt-2 mb-3" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
          </>
        )}
        <label className="text-sm font-medium">Email</label>
        <input className="input mt-2 mb-3" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoFocus />
        <label className="text-sm font-medium">{t.password}</label>
        <input className="input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        {mode === 'register' && (
          <>
            <label className="mt-3 block text-sm font-medium">Activation code</label>
            <input className="input mt-2 uppercase" value={activationCode} onChange={(event) => setActivationCode(event.target.value)} autoComplete="one-time-code" />
          </>
        )}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <button className="btn-primary mt-5 w-full" disabled={loading}>{loading ? t.checking : mode === 'register' ? 'Create account' : t.login}</button>
      </form>
    </main>
  );
}

function LicenseGate({ onValid }: { onValid: (license: LicenseRecord) => void }) {
  const [licenseKey, setLicenseKey] = useState(getSavedLicenseKey());
  const [checking, setChecking] = useState(Boolean(getSavedLicenseKey()));
  const [error, setError] = useState('');

  async function validate(key = licenseKey) {
    setChecking(true);
    setError('');
    try {
      onValid(await validateLicenseKey(key));
    } catch (err) {
      clearSavedLicense();
      setError(err instanceof Error ? err.message : 'License validation failed.');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    const saved = getSavedLicenseKey();
    if (saved) validate(saved);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <form onSubmit={(event) => { event.preventDefault(); validate(); }} className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">License required</p>
          <div className="mt-4 flex items-center gap-3">
            <img src={APP_LOGO} alt={`${APP_NAME} logo`} className="h-16 w-16 rounded-full object-contain bg-white p-1" />
            <h1 className="text-3xl font-bold">{APP_NAME}</h1>
          </div>
          <p className="mt-2 text-sm text-slate-300">Enter your DR123 license key to continue to account login.</p>
        </div>
        <label className="text-sm font-medium">License key</label>
        <input className="input mt-2 uppercase" value={licenseKey} onChange={(event) => setLicenseKey(event.target.value)} autoFocus />
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <button className="btn-primary mt-5 w-full" disabled={checking}>{checking ? 'Checking...' : 'Continue'}</button>
      </form>
    </main>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <Icon className="h-5 w-5 text-brand-600" />
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('dr123_language') as Language) || 'en');
  const t = translations[language];
  const rtl = language === 'ar';
  const [validLicense, setValidLicense] = useState<LicenseRecord | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('dr123_theme') === 'dark');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [query, setQuery] = useState('');
  const [patientsRaw, setPatientsRaw] = useState<Patient[]>([]);
  const [appointmentsRaw, setAppointmentsRaw] = useState<Appointment[]>([]);
  const [servicesRaw, setServicesRaw] = useState<Service[]>([]);
  const [treatmentsRaw, setTreatmentsRaw] = useState<Treatment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [timelineNotes, setTimelineNotes] = useState<TimelineNote[]>([]);
  const [settingsBackup, setSettingsBackup] = useState<Record<string, unknown>[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [patientForm, setPatientForm] = useState<Patient>(emptyPatient);
  const [appointmentForm, setAppointmentForm] = useState<Appointment>(emptyAppointment);
  const [serviceForm, setServiceForm] = useState<Service>(emptyService);
  const [categoryName, setCategoryName] = useState('');
  const [editingPatient, setEditingPatient] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(false);
  const [editingService, setEditingService] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>(() => JSON.parse(localStorage.getItem('dr123_recent_patients') || '[]'));
  const [message, setMessage] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [draftPrompt, setDraftPrompt] = useState(false);
  const [lastBackup, setLastBackup] = useState<{ at: string; content: string } | null>(() => {
    const saved = localStorage.getItem('dr123_last_backup');
    return saved ? JSON.parse(saved) : null;
  });

  const patients = useMemo(() => patientsRaw.filter((item) => !item.deleted), [patientsRaw]);
  const appointments = useMemo(() => appointmentsRaw.filter((item) => !item.deleted), [appointmentsRaw]);
  const services = useMemo(() => servicesRaw.filter((item) => !item.deleted), [servicesRaw]);
  const treatments = useMemo(() => treatmentsRaw.filter((item) => !item.deleted), [treatmentsRaw]);

  async function load() {
    const [patientRows, appointmentRows, paymentRows, treatmentRows, serviceRows, categoryRows, noteRows, auditRows, settingRows] = await Promise.all([
      getCollection<Patient>('patients'),
      getCollection<Appointment>('appointments'),
      getCollection<Payment>('payments'),
      getCollection<Treatment>('treatments'),
      getCollection<Service>('services'),
      getCollection<ServiceCategory>('service_categories'),
      getCollection<TimelineNote>('note_timeline'),
      getCollection<AuditLog>('audit_logs'),
      getSettingsBackup(),
    ]);
    setPatientsRaw(patientRows.sort((a, b) => a.patientId.localeCompare(b.patientId)));
    setAppointmentsRaw(appointmentRows.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)));
    setPayments(paymentRows.sort((a, b) => b.date.localeCompare(a.date)));
    setTreatmentsRaw(treatmentRows);
    setServicesRaw(serviceRows.sort((a, b) => a.name.localeCompare(b.name)));
    setCategories(categoryRows.sort((a, b) => a.name.localeCompare(b.name)));
    setTimelineNotes(noteRows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setAuditLogs(auditRows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setSettingsBackup(settingRows);
    await purgeOldDeleted([
      ...patientRows.map((item) => ({ collectionName: 'patients', id: item.id, deletedAt: item.deletedAt, entity: 'patient' as const, entityId: item.patientId })),
      ...appointmentRows.map((item) => ({ collectionName: 'appointments', id: item.id, deletedAt: item.deletedAt, entity: 'appointment' as const, entityId: item.appointmentId })),
      ...serviceRows.map((item) => ({ collectionName: 'services', id: item.id, deletedAt: item.deletedAt, entity: 'service' as const, entityId: item.name })),
      ...treatmentRows.map((item) => ({ collectionName: 'treatments', id: item.id, deletedAt: item.deletedAt, entity: 'treatment' as const, entityId: item.name })),
    ]);
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('dr123_theme', dark ? 'dark' : 'light');
    localStorage.setItem('dr123_language', language);
  }, [dark, language, rtl]);

  useEffect(() => {
    if (!validLicense) {
      setUser(null);
      setAuthReady(false);
      return;
    }

    return watchAuth((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        setActiveUserId(nextUser.uid);
        load().catch((err) => setMessage(err.message));
      } else {
        setActiveUserId('');
      }
    });
  }, [validLicense]);

  useEffect(() => {
    const draft = localStorage.getItem('dr123_appointment_draft');
    if (draft) setDraftPrompt(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    const payload = JSON.stringify({ savedAt: nowIso(), editing: editingAppointment, form: appointmentForm });
    localStorage.setItem('dr123_appointment_draft', payload);
    const timer = window.setInterval(() => localStorage.setItem('dr123_appointment_draft', payload), 4000);
    return () => window.clearInterval(timer);
  }, [appointmentForm, editingAppointment, user]);

  const selectedPatient = patients.find((item) => item.patientId === selectedPatientId);
  const backup: ClinicBackup = useMemo(
    () => ({ exportedAt: nowIso(), patients: patientsRaw, appointments: appointmentsRaw, payments, treatments: treatmentsRaw, services: servicesRaw, serviceCategories: categories, settings: settingsBackup, timelineNotes, auditLogs }),
    [patientsRaw, appointmentsRaw, payments, treatmentsRaw, servicesRaw, categories, settingsBackup, timelineNotes, auditLogs],
  );

  const filteredPatients = useMemo(() => {
    const term = query.toLowerCase();
    return patients.filter((patient) => [patient.patientId, patient.name, patient.phone].some((value) => value.toLowerCase().includes(term)));
  }, [patients, query]);

  const filteredAppointments = useMemo(() => {
    const term = query.toLowerCase();
    return appointments.filter((appointment) => [appointment.appointmentId, appointment.patientId, appointment.patientName, appointment.serviceName || ''].some((value) => value.toLowerCase().includes(term)));
  }, [appointments, query]);

  const revenue = useMemo(() => {
    const paidAppointments = appointments.filter((item) => item.paid);
    const sum = (rows: Appointment[]) => rows.reduce((total, item) => total + Number(item.revenueAmount || 0), 0);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const today = todayIso();
    return {
      today: sum(paidAppointments.filter((item) => item.date === today)),
      week: sum(paidAppointments.filter((item) => toDateTime(item.date, item.time) >= startOfWeek)),
      month: sum(paidAppointments.filter((item) => item.date.slice(0, 7) === today.slice(0, 7))),
      year: sum(paidAppointments.filter((item) => item.date.slice(0, 4) === today.slice(0, 4))),
      outstanding: sum(appointments.filter((item) => !item.paid && item.revenueAmount > 0)),
    };
  }, [appointments]);

  const events: EventInput[] = appointments.map((appointment) => ({
    id: appointment.id,
    title: `${appointment.patientName} - ${tStatus(appointment.status, t)}`,
    start: `${appointment.date}T${appointment.time}`,
    end: new Date(toDateTime(appointment.date, appointment.time).getTime() + appointment.duration * 60000).toISOString(),
    backgroundColor: eventColor(appointment.status),
    borderColor: eventColor(appointment.status),
    extendedProps: appointment,
  }));

  const deletedItems: DeletedItem[] = useMemo(() => [
    ...patientsRaw.filter((item) => item.deleted).map((item) => ({ collectionName: 'patients', id: item.id, label: item.name, entityId: item.patientId, entity: 'patient' as const, deletedAt: item.deletedAt })),
    ...appointmentsRaw.filter((item) => item.deleted).map((item) => ({ collectionName: 'appointments', id: item.id, label: `${item.appointmentId} ${item.patientName}`, entityId: item.appointmentId, entity: 'appointment' as const, deletedAt: item.deletedAt })),
    ...servicesRaw.filter((item) => item.deleted).map((item) => ({ collectionName: 'services', id: item.id, label: item.name, entityId: item.name, entity: 'service' as const, deletedAt: item.deletedAt })),
    ...treatmentsRaw.filter((item) => item.deleted).map((item) => ({ collectionName: 'treatments', id: item.id, label: item.name, entityId: item.name, entity: 'treatment' as const, deletedAt: item.deletedAt })),
  ], [patientsRaw, appointmentsRaw, servicesRaw, treatmentsRaw]);

  function resetPatientForm() {
    setPatientForm(emptyPatient);
    setEditingPatient(false);
  }

  function resetAppointmentForm(date = todayIso(), time = '09:00') {
    setAppointmentForm({ ...emptyAppointment, date, time });
    setEditingAppointment(false);
    localStorage.removeItem('dr123_appointment_draft');
    setDraftPrompt(false);
  }

  function resetServiceForm() {
    setServiceForm(emptyService);
    setEditingService(false);
  }

  function openPatient(patient: Patient) {
    setSelectedPatientId(patient.patientId);
    setPatientForm(patient);
    setEditingPatient(true);
    const next = [{ patientId: patient.patientId, name: patient.name, openedAt: nowIso() }, ...recentPatients.filter((item) => item.patientId !== patient.patientId)].slice(0, 8);
    setRecentPatients(next);
    localStorage.setItem('dr123_recent_patients', JSON.stringify(next));
  }

  async function savePatient(event: React.FormEvent) {
    event.preventDefault();
    const stamp = nowIso();
    const isNew = !patientForm.id;
    const patient: Patient = { ...patientForm, id: patientForm.id || crypto.randomUUID(), patientId: patientForm.patientId || makePatientId(patientsRaw.length), age: Number(patientForm.age || 0), createdAt: patientForm.createdAt || stamp, updatedAt: stamp, deleted: false };
    await upsertPatient(patient, isNew);
    openPatient(patient);
    await load();
  }

  async function saveAppointment(event?: React.FormEvent) {
    event?.preventDefault();
    const patient = patients.find((item) => item.patientId === appointmentForm.patientId);
    const stamp = nowIso();
    const isNew = !appointmentForm.id;
    const appointment: Appointment = {
      ...appointmentForm,
      id: appointmentForm.id || crypto.randomUUID(),
      appointmentId: appointmentForm.appointmentId || makeAppointmentId(appointmentsRaw.length),
      patientName: patient?.name || appointmentForm.patientName,
      duration: Number(appointmentForm.duration || 30),
      revenueAmount: Number(appointmentForm.revenueAmount || 0),
      createdAt: appointmentForm.createdAt || stamp,
      updatedAt: stamp,
      deleted: false,
    };
    if (overlaps(appointment, appointments)) {
      setMessage('Appointment overlaps another active appointment.');
      return;
    }
    await upsertAppointment(appointment, isNew);
    if (appointment.paid && appointment.revenueAmount > 0) {
      await addPayment({ id: `payment-${appointment.id}`, appointmentId: appointment.appointmentId, patientId: appointment.patientId, patientName: appointment.patientName, amount: appointment.revenueAmount, method: appointment.paymentMethod, paid: true, date: appointment.date, notes: 'Generated from appointment payment status.', createdAt: nowIso() });
    }
    resetAppointmentForm();
    await load();
  }

  async function saveService(event: React.FormEvent) {
    event.preventDefault();
    const stamp = nowIso();
    const isNew = !serviceForm.id;
    await upsertService({ ...serviceForm, id: serviceForm.id || crypto.randomUUID(), defaultDuration: Number(serviceForm.defaultDuration || 30), defaultPrice: Number(serviceForm.defaultPrice || 0), createdAt: serviceForm.createdAt || stamp, updatedAt: stamp, deleted: false }, isNew);
    resetServiceForm();
    await load();
  }

  async function saveCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    const stamp = nowIso();
    await upsertServiceCategory({ id: crypto.randomUUID(), name: categoryName.trim(), description: '', createdAt: stamp, updatedAt: stamp }, true);
    setCategoryName('');
    await load();
  }

  async function deleteCategory(category: ServiceCategory) {
    if (!confirm(`${t.deleteCategory}: ${category.name}?`)) return;
    await deleteDoc(scopedDoc('service_categories', category.id));
    await createAudit('Service category deleted', 'service', category.id, category.name);
    await load();
  }

  async function deleteAppointment(appointment: Appointment) {
    if (!confirm(`Delete ${appointment.appointmentId}?`)) return;
    await softDelete('appointments', appointment.id, appointment.appointmentId, 'appointment', appointment.patientName);
    await load();
  }

  function editAppointment(appointment: Appointment) {
    setAppointmentForm(appointment);
    setEditingAppointment(true);
    setTab('calendar');
  }

  function onDateClick(arg: DateClickArg) {
    const [date, timePart] = arg.dateStr.split('T');
    resetAppointmentForm(date, timePart?.slice(0, 5) || '09:00');
  }

  async function onEventDrop(arg: EventDropArg) {
    const appointment = appointments.find((item) => item.id === arg.event.id);
    if (!appointment || !arg.event.start) return;
    const nextDate = arg.event.start.toISOString().slice(0, 10);
    const nextTime = arg.event.start.toTimeString().slice(0, 5);
    const updated = { ...appointment, date: nextDate, time: nextTime };
    if (overlaps(updated, appointments)) {
      arg.revert();
      setMessage('Move blocked because it overlaps another appointment.');
      return;
    }
    await upsertAppointment(updated, false);
    await load();
  }

  function onEventClick(arg: EventClickArg) {
    const appointment = appointments.find((item) => item.id === arg.event.id);
    if (appointment) editAppointment(appointment);
  }

  function copyReminder(appointment: Appointment) {
    const text = `Bonjour ${appointment.patientName}, rappel de votre rendez-vous DR123 le ${appointment.date} a ${appointment.time}. Merci.`;
    navigator.clipboard.writeText(text);
    setMessage('Reminder copied.');
  }

  function whatsappLink(appointment: Appointment) {
    const patient = patients.find((item) => item.patientId === appointment.patientId);
    const phone = (patient?.phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(`Bonjour ${appointment.patientName}, rappel de votre rendez-vous DR123 le ${appointment.date} a ${appointment.time}. Merci.`);
    return `https://wa.me/${phone}?text=${text}`;
  }

  async function updateAppointmentStatus(appointment: Appointment, status: AppointmentStatus) {
    await upsertAppointment({ ...appointment, status, updatedAt: nowIso() }, false);
    await load();
  }

  async function quickCreateAppointment(event: React.FormEvent) {
    event.preventDefault();
    const parts = quickInput.trim().split(/\s+/);
    const timeIndex = parts.findIndex((part) => /^\d{1,2}:\d{2}$/.test(part));
    if (timeIndex < 0) {
      setMessage('Use a format like Adam 15:00 or Sarah tomorrow 10:30.');
      return;
    }
    const time = parts[timeIndex].padStart(5, '0');
    const tomorrow = parts.some(isTomorrowToken);
    const date = new Date();
    if (tomorrow) date.setDate(date.getDate() + 1);
    const name = parts.filter((_, index) => index !== timeIndex && !isTomorrowToken(parts[index])).join(' ');
    const patient = patients.find((item) => item.name.toLowerCase().includes(name.toLowerCase()));
    const draft = { ...emptyAppointment, id: crypto.randomUUID(), appointmentId: makeAppointmentId(appointmentsRaw.length), patientId: patient?.patientId || '', patientName: patient?.name || name, date: date.toISOString().slice(0, 10), time, duration: 30, status: 'Scheduled' as const, createdAt: nowIso(), updatedAt: nowIso() };
    if (!patient) {
      setAppointmentForm(draft);
      setEditingAppointment(false);
      setTab('calendar');
      setMessage('Patient not found. Complete the appointment editor.');
      return;
    }
    if (overlaps(draft, appointments)) {
      setMessage('Quick appointment overlaps another active appointment.');
      return;
    }
    await upsertAppointment(draft, true);
    setQuickInput('');
    await load();
  }

  async function seedData() {
    await Promise.all([
      ...samplePatients.map((item) => setDoc(scopedDoc('patients', item.id), item)),
      ...sampleAppointments.map((item) => setDoc(scopedDoc('appointments', item.id), item)),
      ...samplePayments.map((item) => setDoc(scopedDoc('payments', item.id), item)),
      ...sampleTreatments.map((item) => setDoc(scopedDoc('treatments', item.id), item)),
      ...sampleServices.map((item) => setDoc(scopedDoc('services', item.id), item)),
      ...sampleServiceCategories.map((item) => setDoc(scopedDoc('service_categories', item.id), item)),
    ]);
    await createAudit('Sample data loaded', 'settings', 'sample-data', 'Loaded demo patients, appointments, payments, treatments, services, and categories.');
    await load();
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') || '');
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    await changeCurrentPassword(password);
    await createAudit('Settings changed', 'settings', 'account-password', 'Account password updated.');
    event.currentTarget.reset();
    setMessage('Password updated.');
    await load();
  }

  async function createBackup() {
    const content = await exportBackup(backup);
    const at = nowIso();
    const next = { at, content };
    setLastBackup(next);
    localStorage.setItem('dr123_last_backup', JSON.stringify(next));
    downloadFile(`backup-${todayIso()}.json`, content, 'application/json');
    await createAudit('Backup exported', 'backup', `backup-${Date.now()}`, 'Daily JSON backup exported.');
    await load();
  }

  async function exportJson() {
    await createBackup();
  }

  function exportCsv() {
    downloadFile(`dr123-appointments-${todayIso()}.csv`, toCsv(appointments as unknown as Record<string, unknown>[]), 'text/csv');
  }

  async function handleImport(file?: File) {
    if (!file) return;
    const parsed = JSON.parse(await file.text()) as ClinicBackup;
    await importBackup(parsed);
    await load();
  }

  async function addOrEditNote(text: string, existing?: TimelineNote) {
    if (!selectedPatient || !text.trim()) return;
    const stamp = nowIso();
    await upsertTimelineNote({ id: existing?.id || crypto.randomUUID(), patientId: selectedPatient.patientId, text: text.trim(), createdAt: existing?.createdAt || stamp, updatedAt: stamp }, !existing);
    await load();
  }

  function restoreDraft() {
    const draft = localStorage.getItem('dr123_appointment_draft');
    if (!draft) return;
    const parsed = JSON.parse(draft) as { editing: boolean; form: Appointment };
    setAppointmentForm(parsed.form);
    setEditingAppointment(parsed.editing);
    setDraftPrompt(false);
    setTab('calendar');
  }

  if (!validLicense) return <LicenseGate onValid={setValidLicense} />;
  if (!authReady) return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">{t.checking}</main>;
  if (!user) return <Login t={t} />;

  const nav = [
    ['dashboard', Activity, t.dashboard],
    ['calendar', CalendarDays, t.calendar],
    ['patients', Users, t.patients],
    ['services', Stethoscope, t.services],
    ['waiting', Users, t.waiting],
    ['revenue', WalletCards, t.revenue],
    ['stats', Activity, t.stats],
    ['backup', Database, t.backup],
    ['recycle', Archive, t.recycle],
    ['audit', Database, t.audit],
    ['settings', Settings, t.settings],
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100" dir={rtl ? 'rtl' : 'ltr'}>
      <aside className={`fixed inset-y-0 z-20 hidden w-64 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block ${rtl ? 'right-0 border-l' : 'left-0 border-r'}`}>
        <div className="flex items-center gap-3">
          <img src={APP_LOGO} alt={`${APP_NAME} logo`} className="h-12 w-12 rounded-full object-contain bg-white p-1" />
          <h1 className="text-xl font-bold leading-tight">{APP_NAME}</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.clinicManagement}</p>
        <nav className="mt-6 space-y-1">
          {nav.map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium ${tab === key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>
        <p className="absolute bottom-4 left-4 right-4 text-center text-xs text-slate-400 dark:text-slate-500">{FOOTER_CREDIT}</p>
      </aside>

      <div className={rtl ? 'lg:pr-64' : 'lg:pl-64'}>
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-600">{t.singleDoctor}</p>
              <h2 className="text-xl font-bold">{nav.find(([key]) => key === tab)?.[2]}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-64 flex-1">
                <Search className={`absolute top-2.5 h-4 w-4 text-slate-400 ${rtl ? 'right-3' : 'left-3'}`} />
                <input className={`input ${rtl ? 'pr-9' : 'pl-9'}`} placeholder={t.search} value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <select className="input w-auto" value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t.language}>
                <option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option>
              </select>
              <button className="btn-secondary" onClick={() => setDark(!dark)}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              <button className="btn-secondary" onClick={() => logout()}><LogOut className="h-4 w-4" />{t.logout}</button>
            </div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {nav.map(([key, Icon, label]) => <button key={key} className={`btn ${tab === key ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`} onClick={() => setTab(key)}><Icon className="h-4 w-4" />{label}</button>)}
          </nav>
        </header>

        <main className="space-y-6 p-4 md:p-6">
          {message && <button className="card w-full p-3 text-left text-sm text-brand-700 dark:text-blue-300" onClick={() => setMessage('')}>{message}</button>}
          {draftPrompt && <div className="card flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><span>{t.restoreDraft}</span><div className="flex gap-2"><button className="btn-primary" onClick={restoreDraft}>{t.restore}</button><button className="btn-secondary" onClick={() => { localStorage.removeItem('dr123_appointment_draft'); setDraftPrompt(false); }}>{t.discard}</button></div></div>}

          {tab === 'dashboard' && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label={t.todayRevenue} value={formatMad(revenue.today)} icon={WalletCards} />
                <StatCard label={t.weekRevenue} value={formatMad(revenue.week)} icon={WalletCards} />
                <StatCard label={t.monthRevenue} value={formatMad(revenue.month)} icon={WalletCards} />
                <StatCard label={t.outstanding} value={formatMad(revenue.outstanding)} icon={WalletCards} />
                <StatCard label={t.patients} value={String(patients.length)} icon={Users} />
              </section>
              <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
                <div className="space-y-4">
                  <QuickAdd t={t} quickInput={quickInput} setQuickInput={setQuickInput} onSubmit={quickCreateAppointment} onBackup={createBackup} lastBackup={lastBackup} />
                  <TodayQueue t={t} appointments={appointments.filter((item) => item.date === todayIso()).sort((a, b) => a.time.localeCompare(b.time))} onStatus={updateAppointmentStatus} />
                </div>
                <RecentPatients t={t} recentPatients={recentPatients} patients={patients} openPatient={(patient) => { openPatient(patient); setTab('patients'); }} />
              </section>
              <section className="grid gap-4 xl:grid-cols-2">
                <div className="card p-4"><h3 className="font-semibold">{t.upcoming}</h3><AppointmentList t={t} appointments={appointments.filter((item) => dateInRange(item.date, 7)).slice(0, 8)} onEdit={editAppointment} onDelete={deleteAppointment} onCopy={copyReminder} whatsappLink={whatsappLink} /></div>
                <div className="card p-4"><h3 className="font-semibold">{t.outstandingPayments}</h3><AppointmentList t={t} appointments={appointments.filter((item) => !item.paid && item.revenueAmount > 0).slice(0, 8)} onEdit={editAppointment} onDelete={deleteAppointment} onCopy={copyReminder} whatsappLink={whatsappLink} /></div>
              </section>
            </>
          )}

          {tab === 'calendar' && (
            <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
              <div className="card p-3">
                <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} locales={[frLocale, arLocale]} locale={language} initialView="timeGridWeek" headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }} editable selectable events={events} dateClick={onDateClick} eventClick={onEventClick} eventDrop={onEventDrop} height="auto" direction={rtl ? 'rtl' : 'ltr'} />
              </div>
              <AppointmentForm t={t} form={appointmentForm} setForm={setAppointmentForm} patients={patients} services={services} editing={editingAppointment} onSubmit={saveAppointment} onReset={() => resetAppointmentForm()} />
            </section>
          )}

          {tab === 'patients' && (
            <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <PatientForm t={t} form={patientForm} setForm={setPatientForm} editing={editingPatient} onSubmit={savePatient} onReset={resetPatientForm} />
              <div className="space-y-4">
                <PatientsTable t={t} patients={filteredPatients} appointments={appointments} onOpen={openPatient} onDelete={async (patient) => { await softDelete('patients', patient.id, patient.patientId, 'patient', patient.name); await load(); }} />
                {selectedPatient && <PatientProfile t={t} patient={selectedPatient} appointments={appointments} notes={timelineNotes.filter((note) => note.patientId === selectedPatient.patientId)} onNote={addOrEditNote} onDeleteNote={async (note) => { await deleteTimelineNote(note); await load(); }} />}
              </div>
            </section>
          )}

          {tab === 'services' && <ServicesPage t={t} services={services} categories={categories} serviceForm={serviceForm} setServiceForm={setServiceForm} editing={editingService} onSubmit={saveService} onReset={resetServiceForm} onEdit={(service) => { setServiceForm(service); setEditingService(true); }} onDelete={async (service) => { await softDelete('services', service.id, service.name, 'service', service.name); await load(); }} categoryName={categoryName} setCategoryName={setCategoryName} onCategorySubmit={saveCategory} onCategoryDelete={deleteCategory} />}

          {tab === 'waiting' && <WaitingRoom t={t} appointments={appointments.filter((item) => item.date === todayIso())} onMove={updateAppointmentStatus} />}

          {tab === 'revenue' && <RevenuePage t={t} revenue={revenue} appointments={appointments} />}

          {tab === 'stats' && <Stats t={t} appointments={appointments} patients={patients} />}

          {tab === 'backup' && (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <button className="card p-5 text-left" onClick={exportJson}><Download className="mb-3 h-5 w-5 text-brand-600" />{t.exportJson}</button>
              <button className="card p-5 text-left" onClick={exportCsv}><Download className="mb-3 h-5 w-5 text-brand-600" />{t.exportCsv}</button>
              <button className="card p-5 text-left" onClick={() => exportExcel(backup)}><Download className="mb-3 h-5 w-5 text-brand-600" />{t.exportExcel}</button>
              <label className="card cursor-pointer p-5 text-left"><Upload className="mb-3 h-5 w-5 text-brand-600" />{t.importBackup}<input className="hidden" type="file" accept="application/json" onChange={(event) => handleImport(event.target.files?.[0])} /></label>
              <button className="btn-primary md:col-span-2" onClick={seedData}>{t.loadSample}</button>
              {lastBackup && <button className="btn-secondary md:col-span-2" onClick={() => downloadFile(`backup-${lastBackup.at.slice(0, 10)}.json`, lastBackup.content, 'application/json')}>{t.downloadBackup}</button>}
            </section>
          )}

          {tab === 'recycle' && <RecycleBin t={t} query={query} items={deletedItems} onRestore={async (item) => { await restoreItem(item.collectionName, item.id, item.entity, item.entityId); await load(); }} onDelete={async (item) => { await permanentlyDelete(item.collectionName, item.id, item.entity, item.entityId); await load(); }} />}

          {tab === 'audit' && <AuditTable auditLogs={auditLogs} />}

          {tab === 'settings' && (
            <section className="card max-w-xl p-5">
              <h3 className="text-lg font-semibold">{t.adminPassword}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Stored as SHA-256 at settings/adminPasswordHash.</p>
              <form className="mt-4 space-y-3" onSubmit={changePassword}><input className="input" name="password" type="password" placeholder={t.password} /><button className="btn-primary">{t.updatePassword}</button></form>
            </section>
          )}

          {query && !['patients', 'recycle'].includes(tab) && <section className="card p-4"><h3 className="font-semibold">{t.searchResults}</h3><AppointmentList t={t} appointments={filteredAppointments} onEdit={editAppointment} onDelete={deleteAppointment} onCopy={copyReminder} whatsappLink={whatsappLink} /></section>}
          <footer className="pb-2 pt-4 text-center text-xs text-slate-500 dark:text-slate-500 lg:hidden">{FOOTER_CREDIT}</footer>
        </main>
      </div>
    </div>
  );
}

function QuickAdd({ t, quickInput, setQuickInput, onSubmit, onBackup, lastBackup }: { t: Record<string, string>; quickInput: string; setQuickInput: (value: string) => void; onSubmit: (event: React.FormEvent) => void; onBackup: () => void; lastBackup: { at: string; content: string } | null }) {
  return (
    <div className="card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form className="flex flex-1 flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
          <label className="flex-1 text-sm font-medium">{t.quickAdd}<input className="input mt-1" value={quickInput} onChange={(event) => setQuickInput(event.target.value)} placeholder={t.quickPlaceholder} /></label>
          <button className="btn-primary self-end">{t.create}</button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button className="btn-secondary" onClick={onBackup}><Download className="h-4 w-4" />{t.createBackup}</button>
          <span className="text-slate-500">{lastBackup ? `${t.lastBackupDate}: ${new Date(lastBackup.at).toLocaleDateString()} · ${t.lastBackupTime}: ${new Date(lastBackup.at).toLocaleTimeString()}` : t.noBackup}</span>
        </div>
      </div>
    </div>
  );
}

function TodayQueue({ t, appointments, onStatus }: { t: Record<string, string>; appointments: Appointment[]; onStatus: (appointment: Appointment, status: AppointmentStatus) => void }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold">{t.todaysQueue}</h3>
      <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
        {appointments.length === 0 && <p className="py-3 text-sm text-slate-500">{t.noAppointments}</p>}
        {appointments.map((item) => <div key={item.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"><div><b>{item.time}</b> {item.patientName}<p className="text-sm text-slate-500">{tStatus(item.status, t)}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => onStatus(item, 'Arrived')}>{t.arrived}</button><button className="btn-secondary" onClick={() => onStatus(item, 'In Consultation')}>{t.inConsultation}</button><button className="btn-secondary" onClick={() => onStatus(item, 'Completed')}>{t.completed}</button></div></div>)}
      </div>
    </div>
  );
}

function RecentPatients({ t, recentPatients, patients, openPatient }: { t: Record<string, string>; recentPatients: RecentPatient[]; patients: Patient[]; openPatient: (patient: Patient) => void }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold">{t.recentPatients}</h3>
      <div className="mt-3 space-y-2">
        {recentPatients.map((recent) => {
          const patient = patients.find((item) => item.patientId === recent.patientId);
          return <button key={recent.patientId} className="w-full rounded-md border border-slate-200 p-3 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800" onClick={() => patient && openPatient(patient)}><b>{recent.name}</b><br /><span className="text-slate-500">{new Date(recent.openedAt).toLocaleString()}</span></button>;
        })}
        {recentPatients.length === 0 && <p className="text-sm text-slate-500">{t.noData}</p>}
      </div>
    </div>
  );
}

function PatientForm({ t, form, setForm, editing, onSubmit, onReset }: { t: Record<string, string>; form: Patient; setForm: (form: Patient) => void; editing: boolean; onSubmit: (event: React.FormEvent) => void; onReset: () => void }) {
  return (
    <form className="card space-y-3 p-4" onSubmit={onSubmit}>
      <h3 className="font-semibold">{editing ? t.editPatient : t.newPatient}</h3>
      <input className="input" placeholder={t.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <input className="input" placeholder={t.phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
      <div className="grid grid-cols-2 gap-3"><input className="input" type="number" placeholder={t.age} value={form.age || ''} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} /><select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Patient['gender'] })}><option>Female</option><option>Male</option><option>Other</option></select></div>
      <input className="input" placeholder={t.address} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <textarea className="input min-h-24" placeholder="Medical notes" value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} />
      <div className="flex gap-2"><button className="btn-primary"><Plus className="h-4 w-4" />{t.save}</button><button type="button" className="btn-secondary" onClick={onReset}>{t.clear}</button></div>
    </form>
  );
}

function AppointmentForm({ t, form, setForm, patients, services, editing, onSubmit, onReset }: { t: Record<string, string>; form: Appointment; setForm: (form: Appointment) => void; patients: Patient[]; services: Service[]; editing: boolean; onSubmit: (event: React.FormEvent) => void; onReset: () => void }) {
  function selectService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    setForm({ ...form, serviceId, serviceName: service?.name || '', serviceCategory: service?.category || '', duration: service?.defaultDuration || form.duration, revenueAmount: service?.defaultPrice || form.revenueAmount, treatmentPerformed: service?.name || form.treatmentPerformed });
  }
  return (
    <form className="card space-y-3 p-4" onSubmit={onSubmit}>
      <h3 className="font-semibold">{editing ? `${t.editAppointment} ${form.appointmentId}` : t.newAppointment}</h3>
      <select className="input" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value, patientName: patients.find((p) => p.patientId === e.target.value)?.name || form.patientName })} required><option value="">{t.selectPatient}</option>{patients.map((patient) => <option key={patient.id} value={patient.patientId}>{patient.patientId} - {patient.name}</option>)}</select>
      <select className="input" value={form.serviceId || ''} onChange={(e) => selectService(e.target.value)}><option value="">{t.serviceDropdown}</option>{services.filter((service) => service.active).map((service) => <option key={service.id} value={service.id}>{service.category} - {service.name}</option>)}</select>
      <div className="grid grid-cols-2 gap-3"><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /><input className="input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required /></div>
      <div className="grid grid-cols-2 gap-3"><select className="input" value={durationOptions.includes(form.duration) ? form.duration : 0} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) || form.duration })}>{durationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes ? `${minutes}m` : t.custom}</option>)}</select><input className="input" type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></div>
      <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AppointmentStatus })}>{statuses.map((status) => <option key={status} value={status}>{tStatus(status, t)}</option>)}</select>
      <input className="input" placeholder={t.treatment} value={form.treatmentPerformed} onChange={(e) => setForm({ ...form, treatmentPerformed: e.target.value })} />
      <div className="grid grid-cols-2 gap-3"><input className="input" type="number" min="0" placeholder="Revenue DH" value={form.revenueAmount || ''} onChange={(e) => setForm({ ...form, revenueAmount: Number(e.target.value) })} /><select className="input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} />{t.paid}</label>
      <textarea className="input min-h-20" placeholder={t.notes} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <p className="text-xs text-slate-500">{t.draftSaved}</p>
      <div className="flex gap-2"><button className="btn-primary">{t.save}</button><button type="button" className="btn-secondary" onClick={onReset}>{t.clear}</button></div>
    </form>
  );
}

function PatientsTable({ t, patients, appointments, onOpen, onDelete }: { t: Record<string, string>; patients: Patient[]; appointments: Appointment[]; onOpen: (patient: Patient) => void; onDelete: (patient: Patient) => void }) {
  return <div className="card overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400"><tr><th className="p-3">{t.patient}</th><th className="p-3">{t.phone}</th><th className="p-3">{t.history}</th><th className="p-3"></th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3"><b>{patient.patientId}</b><br />{patient.name}<PatientAlerts t={t} patient={patient} appointments={appointments} /></td><td className="p-3">{patient.phone}<br /><span className="text-slate-500">{patient.age} {t.age}, {patient.gender}</span></td><td className="p-3">{appointments.filter((item) => item.patientId === patient.patientId).length} {t.calendar}<br /><span className="text-slate-500">{appointments.filter((item) => item.patientId === patient.patientId).map((item) => item.treatmentPerformed).filter(Boolean).join(', ') || t.noTreatments}</span></td><td className="p-3 text-right"><div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => onOpen(patient)}>{t.edit}</button><button className="btn-secondary" onClick={() => onDelete(patient)}>{t.delete}</button></div></td></tr>)}</tbody></table></div>;
}

function PatientAlerts({ t, patient, appointments }: { t: Record<string, string>; patient: Patient; appointments: Appointment[] }) {
  const history = appointments.filter((item) => item.patientId === patient.patientId);
  const alerts = [
    history.length <= 1 && t.firstVisit,
    history.some((item) => !item.paid && item.revenueAmount > 0) && t.unpaidBalance,
    history.filter((item) => item.status === 'No Show').length >= 3 && t.noShowThree,
    history.some((item) => new Date(`${item.date}T${item.time}`) > new Date() && !['Cancelled', 'No Show'].includes(item.status)) && t.upcomingAppointment,
  ].filter(Boolean);
  return <div className="mt-2 flex flex-wrap gap-1">{alerts.map((alert) => <span key={String(alert)} className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">! {alert}</span>)}</div>;
}

function PatientProfile({ t, patient, appointments, notes, onNote, onDeleteNote }: { t: Record<string, string>; patient: Patient; appointments: Appointment[]; notes: TimelineNote[]; onNote: (text: string, existing?: TimelineNote) => void; onDeleteNote: (note: TimelineNote) => void }) {
  const [noteText, setNoteText] = useState('');
  const [editing, setEditing] = useState<TimelineNote | undefined>();
  return <div className="card p-4"><h3 className="font-semibold">{t.patientProfile}: {patient.name}</h3><PatientAlerts t={t} patient={patient} appointments={appointments} /><p className="mt-3 text-sm text-slate-500">{patient.medicalNotes}</p><h4 className="mt-5 font-semibold">{t.medicalTimeline}</h4><form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); onNote(noteText, editing); setNoteText(''); setEditing(undefined); }}><input className="input" value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder={t.notes} /><button className="btn-primary">{editing ? t.save : t.addNote}</button></form><div className="mt-4 space-y-3">{notes.map((note) => <div key={note.id} className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="flex justify-between gap-3"><p>{new Date(note.createdAt).toLocaleDateString()} - {note.text}</p><div className="flex gap-2"><button className="text-brand-600" onClick={() => { setEditing(note); setNoteText(note.text); }}>{t.edit}</button><button className="text-red-600" onClick={() => onDeleteNote(note)}>{t.delete}</button></div></div></div>)}</div></div>;
}

function ServicesPage({ t, services, categories, serviceForm, setServiceForm, editing, onSubmit, onReset, onEdit, onDelete, categoryName, setCategoryName, onCategorySubmit, onCategoryDelete }: { t: Record<string, string>; services: Service[]; categories: ServiceCategory[]; serviceForm: Service; setServiceForm: (service: Service) => void; editing: boolean; onSubmit: (event: React.FormEvent) => void; onReset: () => void; onEdit: (service: Service) => void; onDelete: (service: Service) => void; categoryName: string; setCategoryName: (value: string) => void; onCategorySubmit: (event: React.FormEvent) => void; onCategoryDelete: (category: ServiceCategory) => void }) {
  return <section className="grid gap-4 xl:grid-cols-[360px_1fr]"><div className="space-y-4"><form className="card space-y-3 p-4" onSubmit={onSubmit}><h3 className="font-semibold">{editing ? t.edit : t.newService}</h3><input className="input" placeholder={t.name} value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required /><select className="input" value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} required><option value="">{t.category}</option>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</select><input className="input" type="number" placeholder={t.defaultDuration} value={serviceForm.defaultDuration} onChange={(e) => setServiceForm({ ...serviceForm, defaultDuration: Number(e.target.value) })} /><input className="input" type="number" placeholder={t.defaultPrice} value={serviceForm.defaultPrice} onChange={(e) => setServiceForm({ ...serviceForm, defaultPrice: Number(e.target.value) })} /><textarea className="input min-h-20" placeholder={t.description} value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={serviceForm.active} onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })} />{serviceForm.active ? t.active : t.inactive}</label><div className="flex gap-2"><button className="btn-primary">{t.save}</button><button className="btn-secondary" type="button" onClick={onReset}>{t.clear}</button></div></form><div className="card p-4"><form className="flex gap-2" onSubmit={onCategorySubmit}><input className="input" placeholder={t.category} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} /><button className="btn-primary">{t.create}</button></form><div className="mt-3 space-y-2">{categories.map((category) => <div key={category.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"><span>{category.name}</span><button className="text-red-600" type="button" onClick={() => onCategoryDelete(category)}>{t.delete}</button></div>)}</div></div></div><div className="card overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400"><tr><th className="p-3">{t.services}</th><th className="p-3">{t.category}</th><th className="p-3">{t.defaultDuration}</th><th className="p-3">{t.defaultPrice}</th><th className="p-3"></th></tr></thead><tbody>{services.map((service) => <tr key={service.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3"><b>{service.name}</b><br /><span className="text-slate-500">{service.description}</span></td><td className="p-3">{service.category}</td><td className="p-3">{service.defaultDuration}m</td><td className="p-3">{formatMad(service.defaultPrice)}</td><td className="p-3"><div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => onEdit(service)}>{t.edit}</button><button className="btn-secondary" onClick={() => onDelete(service)}>{t.delete}</button></div></td></tr>)}</tbody></table></div></section>;
}

function AppointmentList({ t, appointments, onEdit, onDelete, onCopy, whatsappLink }: { t: Record<string, string>; appointments: Appointment[]; onEdit: (item: Appointment) => void; onDelete: (item: Appointment) => void; onCopy: (item: Appointment) => void; whatsappLink: (item: Appointment) => string }) {
  if (!appointments.length) return <p className="mt-3 text-sm text-slate-500">{t.noAppointments}</p>;
  return <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{appointments.map((item) => <div key={item.id} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{item.appointmentId} - {item.patientName}</p><p className="text-sm text-slate-500">{item.date} {item.time} - {item.duration}m - {tStatus(item.status, t)} - {item.serviceName || item.treatmentPerformed} - {formatMad(item.revenueAmount)} - {item.paid ? t.paid : t.unpaid}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => onCopy(item)}>{t.copyReminder}</button><a className="btn-secondary" href={whatsappLink(item)} target="_blank" rel="noreferrer">WhatsApp</a><button className="btn-secondary" onClick={() => onEdit(item)}>{t.edit}</button><button className="btn-secondary" onClick={() => onDelete(item)}>{t.delete}</button></div></div>)}</div>;
}

function WaitingRoom({ t, appointments, onMove }: { t: Record<string, string>; appointments: Appointment[]; onMove: (appointment: Appointment, status: AppointmentStatus) => void }) {
  const lanes: AppointmentStatus[] = ['Confirmed', 'Arrived', 'Waiting', 'In Consultation', 'Completed'];
  const [dragged, setDragged] = useState<Appointment | null>(null);
  return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{lanes.map((lane) => <div key={lane} className="card min-h-80 p-3" onDragOver={(e) => e.preventDefault()} onDrop={() => dragged && onMove(dragged, lane)}><h3 className="mb-3 font-semibold">{tStatus(lane, t)}</h3>{appointments.filter((item) => item.status === lane).map((item) => <div key={item.id} draggable onDragStart={() => setDragged(item)} className="mb-3 cursor-grab rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"><p className="font-semibold">{item.patientName}</p><p className="text-slate-500">{item.time} - {item.serviceName || item.treatmentPerformed || t.noTreatmentYet}</p></div>)}</div>)}</section>;
}

function RevenuePage({ t, revenue, appointments }: { t: Record<string, string>; revenue: Record<string, number>; appointments: Appointment[] }) {
  return <section className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Today" value={formatMad(revenue.today)} icon={WalletCards} /><StatCard label="Week" value={formatMad(revenue.week)} icon={WalletCards} /><StatCard label="Month" value={formatMad(revenue.month)} icon={WalletCards} /><StatCard label="Year" value={formatMad(revenue.year)} icon={WalletCards} /><StatCard label={t.outstanding} value={formatMad(revenue.outstanding)} icon={WalletCards} /></div><div className="card overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Patient</th><th className="p-3">{t.services}</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Status</th></tr></thead><tbody>{appointments.filter((item) => item.revenueAmount > 0).map((item) => <tr key={item.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3">{item.date}</td><td className="p-3">{item.patientName}</td><td className="p-3">{item.serviceName || item.treatmentPerformed}</td><td className="p-3">{formatMad(item.revenueAmount)}</td><td className="p-3">{item.paymentMethod}</td><td className="p-3">{item.paid ? t.paid : t.unpaid}</td></tr>)}</tbody></table></div></section>;
}

function Stats({ t, appointments, patients }: { t: Record<string, string>; appointments: Appointment[]; patients: Patient[] }) {
  const appointmentsByMonth = Object.entries(appointments.reduce<Record<string, number>>((acc, item) => ({ ...acc, [monthKey(item.date)]: (acc[monthKey(item.date)] || 0) + 1 }), {}));
  const revenueByMonth = Object.entries(appointments.reduce<Record<string, number>>((acc, item) => ({ ...acc, [monthKey(item.date)]: (acc[monthKey(item.date)] || 0) + (item.paid ? item.revenueAmount : 0) }), {}));
  const treatments = Object.entries(appointments.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.treatmentPerformed || 'Unspecified']: (acc[item.treatmentPerformed || 'Unspecified'] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const revenueByService = Object.entries(appointments.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.serviceName || item.treatmentPerformed || 'Unspecified']: (acc[item.serviceName || item.treatmentPerformed || 'Unspecified'] || 0) + (item.paid ? item.revenueAmount : 0) }), {})).sort((a, b) => b[1] - a[1]);
  const requestedServices = Object.entries(appointments.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.serviceName || item.treatmentPerformed || 'Unspecified']: (acc[item.serviceName || item.treatmentPerformed || 'Unspecified'] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const noShowRate = appointments.length ? Math.round((appointments.filter((item) => item.status === 'No Show').length / appointments.length) * 100) : 0;
  const returning = new Set(appointments.map((item) => item.patientId)).size;
  return <section className="grid gap-4 xl:grid-cols-2"><StatCard label={t.noShowRate} value={`${noShowRate}%`} icon={Activity} /><StatCard label={t.newReturning} value={`${patients.length} / ${returning}`} icon={Users} /><Chart title={t.appointmentsByMonth} rows={appointmentsByMonth.map(([label, value]) => [label, value])} /><Chart title={t.revenueByMonth} rows={revenueByMonth.map(([label, value]) => [label, value])} money /><Chart title={t.commonTreatments} rows={treatments.slice(0, 8).map(([label, value]) => [label, value])} /><Chart title={t.revenueByService} rows={revenueByService.map(([label, value]) => [label, value])} money /><Chart title={t.requestedServices} rows={requestedServices.map(([label, value]) => [label, value])} /></section>;
}

function Chart({ title, rows, money = false }: { title: string; rows: [string, number][]; money?: boolean }) {
  const max = Math.max(1, ...rows.map(([, value]) => value));
  return <div className="card p-4"><h3 className="font-semibold">{title}</h3><div className="mt-4 space-y-3">{rows.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}{rows.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-sm"><span>{label}</span><span>{money ? formatMad(value) : value}</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${(value / max) * 100}%` }} /></div></div>)}</div></div>;
}

function RecycleBin({ t, query, items, onRestore, onDelete }: { t: Record<string, string>; query: string; items: DeletedItem[]; onRestore: (item: DeletedItem) => void; onDelete: (item: DeletedItem) => void }) {
  const filtered = items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()) || item.entityId.toLowerCase().includes(query.toLowerCase()));
  return <div className="card overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400"><tr><th className="p-3">{t.recycle}</th><th className="p-3">{t.deletedDate}</th><th className="p-3"></th></tr></thead><tbody>{filtered.map((item) => <tr key={`${item.collectionName}-${item.id}`} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3"><b>{item.entityId}</b><br />{item.label}</td><td className="p-3">{item.deletedAt ? new Date(item.deletedAt).toLocaleString() : ''}</td><td className="p-3"><div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => onRestore(item)}>{t.restore}</button><button className="btn-secondary" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" />{t.permanentDelete}</button></div></td></tr>)}</tbody></table></div>;
}

function AuditTable({ auditLogs }: { auditLogs: AuditLog[] }) {
  return <div className="card overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400"><tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Details</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3">{new Date(log.createdAt).toLocaleString()}</td><td className="p-3">{log.action}</td><td className="p-3">{log.entityId}</td><td className="p-3">{log.details}</td></tr>)}</tbody></table></div>;
}
