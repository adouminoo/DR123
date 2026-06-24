import { useEffect, useMemo, useRef, useState } from 'react';
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
  CheckCircle2,
  Database,
  Download,
  KeyRound,
  Languages,
  LockKeyhole,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Sun,
  Trash2,
  Upload,
  Users,
  WalletCards,
} from 'lucide-react';
import { changeCurrentPassword, loginWithPassword, logout, registerWithLicenseKey, watchAuth, type AppUser } from './lib/auth';
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
  prepareBackupImport,
  type PreparedBackupImport,
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
import { checkRegisteredLicenseForUser, type LicenseRecord } from './lib/license';
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

function AuthVisual({ variant }: { variant: 'account' | 'license' }) {
  const isLicense = variant === 'license';

  return (
    <section className={`auth-visual ${isLicense ? 'auth-visual-license' : ''}`}>
      <div className="auth-visual-topline">
        <div className="auth-mark">DR123</div>
        <span>{isLicense ? 'License security layer' : 'Clinic command workspace'}</span>
      </div>
      <div className="auth-hero-copy">
        <p className="auth-kicker">{isLicense ? 'Protected registration' : 'Premium clinic operations'}</p>
        <h2>{isLicense ? 'Verify access before the workspace opens.' : 'A secure command center for modern clinics.'}</h2>
        <p>{isLicense ? 'License status, device trust, and account access are presented as one calm enterprise-grade gateway.' : 'A polished DR123 entry experience built around trust, patient data confidence, and daily clinic control.'}</p>
      </div>
      <div className="auth-art" aria-hidden="true">
        <div className="auth-art-grid" />
        <div className="auth-security-core">
          {isLicense ? <KeyRound className="h-9 w-9" /> : <ShieldCheck className="h-9 w-9" />}
        </div>
        <div className="auth-fragment auth-fragment-a">
          <span />
          <strong>{isLicense ? 'License key' : 'Today queue'}</strong>
          <i />
          <i />
        </div>
        <div className="auth-fragment auth-fragment-b">
          <span />
          <strong>{isLicense ? 'Device binding' : 'Patient timeline'}</strong>
          <i />
          <i />
          <i />
        </div>
        <div className="auth-fragment auth-fragment-c">
          <span />
          <strong>{isLicense ? 'Access granted' : 'Audit ready'}</strong>
          <i />
          <i />
        </div>
      </div>
      <div className="auth-proof-row">
        <span><ShieldCheck className="h-4 w-4" /> Encrypted access</span>
        <span><LockKeyhole className="h-4 w-4" /> Private workspace</span>
      </div>
    </section>
  );
}

function Login({
  t,
  authError,
  onClearAuthError,
  onRegistrationComplete,
  onRegistrationPending,
}: {
  t: Record<string, string>;
  authError: string;
  onClearAuthError: () => void;
  onRegistrationComplete: (user: AppUser) => void;
  onRegistrationPending: (pending: boolean) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    onClearAuthError();
    const isRegistering = mode === 'register';
    try {
      if (isRegistering) {
        onRegistrationPending(true);
        const registeredUser = await registerWithLicenseKey(name, email, password, licenseKey);
        onRegistrationComplete(registeredUser);
      } else {
        await loginWithPassword(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify account.');
    } finally {
      if (isRegistering) onRegistrationPending(false);
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <AuthVisual variant={mode === 'register' ? 'license' : 'account'} />
      <form onSubmit={submit} className="auth-card">
        <div>
          <p className="auth-eyebrow">{t.singleDoctor}</p>
          <div className="auth-brand-row mt-4">
            <img src={APP_LOGO} alt={`${APP_NAME} logo`} className="auth-logo" />
            <div>
              <h1 className="auth-title">{APP_NAME}</h1>
              <p className="text-sm font-medium text-slate-300">DR123 account access</p>
            </div>
          </div>
          <p className="auth-copy">Existing users can login with email and password. New users register once with a valid license key.</p>
          <div className="auth-trust">
            <span><ShieldCheck className="h-4 w-4 text-cyan-200" /> Licensed workspace</span>
            <span><LockKeyhole className="h-4 w-4 text-cyan-200" /> Protected account access</span>
          </div>
        </div>
        <div className="auth-tabs">
          <button type="button" className={`auth-tab ${mode === 'login' ? 'auth-tab-active' : ''}`} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={`auth-tab ${mode === 'register' ? 'auth-tab-active' : ''}`} onClick={() => setMode('register')}>Register</button>
        </div>
        {mode === 'register' && (
          <>
            <label className="auth-label">Name</label>
            <input className="input mt-2 mb-3" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
          </>
        )}
        <label className="auth-label">Email</label>
        <input className="input mt-2 mb-3" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoFocus />
        <label className="auth-label">{t.password}</label>
        <input className="input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        {mode === 'register' && (
          <>
            <label className="auth-label">License key</label>
            <div className="auth-license-field">
              <KeyRound className="h-4 w-4 text-cyan-200" />
              <input className="input uppercase tracking-wide" value={licenseKey} onChange={(event) => setLicenseKey(event.target.value)} autoComplete="one-time-code" />
            </div>
          </>
        )}
        {error && <p className="auth-alert">{error}</p>}
        <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? t.checking : mode === 'register' ? 'Create account' : t.login}</button>
        <p className="auth-footer-note">Need access? Contact your DR123 license owner.</p>
      </form>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon: Icon, detail, tone = 'default', featured = false }: { label: string; value: string; icon: typeof Activity; detail?: string; tone?: 'default' | 'success' | 'warning' | 'neutral'; featured?: boolean }) {
  const toneClass = {
    default: 'metric-icon',
    success: 'metric-icon metric-icon-success',
    warning: 'metric-icon metric-icon-warning',
    neutral: 'metric-icon metric-icon-neutral',
  }[tone];

  return (
    <div className={`metric-card ${featured ? 'metric-card-featured' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <span className={toneClass}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-normal text-slate-950 dark:text-white">{value}</p>
      {detail && <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
}

function LicenseStatusPanel({ license, onRefresh }: { license: LicenseRecord | null; onRefresh?: () => void }) {
  const statusClass = license?.status === 'active' ? 'badge-success' : license?.status === 'revoked' ? 'badge-danger' : 'badge-warning';
  const expiry = license?.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Lifetime';

  return (
    <aside className="license-panel">
      <div className="panel-heading">
        <div>
          <h3 className="section-title">License status</h3>
          <p className="section-subtitle">Current clinic access and device binding.</p>
        </div>
        {license && <span className={statusClass}>{license.status}</span>}
      </div>
      {license ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="license-row"><span>Type</span><b>{license.type === 'full' ? 'Full lifetime' : 'Trial'}</b></div>
          <div className="license-row"><span>Expires</span><b>{expiry}</b></div>
          <div className="license-row"><span>Clinic</span><b>{license.clinicName || 'Not set'}</b></div>
          <div className="license-row"><span>Contact</span><b>{license.contactPhone || 'Not set'}</b></div>
          <div className="license-row"><span>Last checked</span><b>{license.lastCheckedAt ? new Date(license.lastCheckedAt).toLocaleString() : 'Just now'}</b></div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">{license.key}</div>
        </div>
      ) : (
        <p className="empty-state mt-4">License details are unavailable.</p>
      )}
      {onRefresh && <button className="btn-secondary mt-4 w-full" onClick={onRefresh}>Refresh license</button>}
    </aside>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('dr123_language') as Language) || 'en');
  const t = translations[language];
  const rtl = language === 'ar';
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const registrationPendingRef = useRef(false);
  const [authError, setAuthError] = useState('');
  const [license, setLicense] = useState<LicenseRecord | null>(null);
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
  const [pendingImport, setPendingImport] = useState<PreparedBackupImport | null>(null);
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

  async function openAppForUser(nextUser: AppUser) {
    try {
      setAuthError('');
      const activeLicense = await checkRegisteredLicenseForUser(nextUser.uid);
      setLicense(activeLicense);
      setUser(nextUser);
      setActiveUserId(nextUser.uid);
      await load();
    } catch (err) {
      setLicense(null);
      setUser(null);
      setActiveUserId('');
      setAuthError(err instanceof Error ? err.message : 'License validation failed.');
      await logout();
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('dr123_theme', dark ? 'dark' : 'light');
    localStorage.setItem('dr123_language', language);
  }, [dark, language, rtl]);

  useEffect(() => {
    return watchAuth((nextUser) => {
      setAuthReady(true);
      if (nextUser && registrationPendingRef.current) {
        return;
      }
      if (nextUser) {
        void openAppForUser(nextUser);
      } else {
        setUser(null);
        setLicense(null);
        setActiveUserId('');
      }
    });
  }, []);

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
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const preview = prepareBackupImport(parsed);
      setPendingImport(preview);
      setMessage(`Backup ready: ${preview.totalRecords} records found. Review before importing.`);
    } catch (err) {
      setPendingImport(null);
      setMessage(err instanceof Error ? err.message : 'Backup file could not be read.');
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    await importBackup(pendingImport.backup);
    setPendingImport(null);
    setMessage(`Imported ${pendingImport.totalRecords} backup records.`);
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

  if (!authReady) return <main className="auth-shell"><div className="auth-card text-center">{t.checking}</div></main>;
  if (!user) {
    return (
      <Login
        t={t}
        authError={authError}
        onClearAuthError={() => setAuthError('')}
        onRegistrationPending={(pending) => {
          registrationPendingRef.current = pending;
        }}
        onRegistrationComplete={(registeredUser) => {
          registrationPendingRef.current = false;
          setAuthReady(true);
          void openAppForUser(registeredUser);
        }}
      />
    );
  }

  const navGroups: Array<{ label: string; items: Array<[Tab, typeof Activity, string]> }> = [
    { label: 'Command', items: [['dashboard', Activity, t.dashboard], ['calendar', CalendarDays, t.calendar], ['waiting', Users, t.waiting]] },
    { label: 'Clinic data', items: [['patients', Users, t.patients], ['services', Stethoscope, t.services]] },
    { label: 'Business', items: [['revenue', WalletCards, t.revenue], ['stats', Activity, t.stats]] },
    { label: 'System', items: [['backup', Database, t.backup], ['recycle', Archive, t.recycle], ['audit', Database, t.audit], ['settings', Settings, t.settings]] },
  ];
  const nav = navGroups.flatMap((group) => group.items);
  const todayAppointments = appointments.filter((item) => item.date === todayIso()).sort((a, b) => a.time.localeCompare(b.time));
  const upcomingDashboardAppointments = appointments.filter((item) => dateInRange(item.date, 7)).slice(0, 8);
  const outstandingDashboardAppointments = appointments.filter((item) => !item.paid && item.revenueAmount > 0).slice(0, 8);

  return (
    <div className="app-page" dir={rtl ? 'rtl' : 'ltr'}>
      <aside className={`app-sidebar ${rtl ? 'right-0 border-l' : 'left-0 border-r'}`}>
        <div className="flex items-center gap-3">
          <img src={APP_LOGO} alt={`${APP_NAME} logo`} className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1.5 shadow-soft" />
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-normal">{APP_NAME}</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">DR123</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{t.clinicManagement}</p>
        <nav className="mt-6 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.items.map(([key, Icon, label]) => (
                  <button key={key} onClick={() => setTab(key)} className={`nav-item ${tab === key ? 'nav-item-active' : ''}`}>
                    <Icon className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <p className="absolute bottom-4 left-4 right-4 text-center text-xs text-slate-400 dark:text-slate-500">{FOOTER_CREDIT}</p>
      </aside>

      <div className={rtl ? 'lg:pr-64' : 'lg:pl-64'}>
        <header className="app-header">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">{t.singleDoctor}</p>
              <h2 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white">{nav.find(([key]) => key === tab)?.[2]}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-full flex-1 sm:min-w-64">
                <Search className={`absolute top-3 h-4 w-4 text-slate-400 ${rtl ? 'right-3' : 'left-3'}`} />
                <input className={`input ${rtl ? 'pr-9' : 'pl-9'}`} placeholder={t.search} value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <label className="relative">
                <Languages className={`pointer-events-none absolute top-3 h-4 w-4 text-slate-400 ${rtl ? 'right-3' : 'left-3'}`} />
                <select className={`input w-auto min-w-36 ${rtl ? 'pr-9' : 'pl-9'}`} value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t.language}>
                <option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option>
                </select>
              </label>
              <button className="btn-secondary" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              <button className="btn-secondary" onClick={() => logout()}><LogOut className="h-4 w-4" />{t.logout}</button>
            </div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {nav.map(([key, Icon, label]) => <button key={key} className={`btn shrink-0 ${tab === key ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'}`} onClick={() => setTab(key)}><Icon className="h-4 w-4" />{label}</button>)}
          </nav>
        </header>

        <main className="space-y-6 p-4 md:p-6 xl:p-8">
          {message && <button className="surface w-full p-3 text-left text-sm font-medium text-brand-700 dark:text-blue-300" onClick={() => setMessage('')}>{message}</button>}
          {draftPrompt && <div className="surface flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><span>{t.restoreDraft}</span><div className="flex gap-2"><button className="btn-primary" onClick={restoreDraft}>{t.restore}</button><button className="btn-secondary" onClick={() => { localStorage.removeItem('dr123_appointment_draft'); setDraftPrompt(false); }}>{t.discard}</button></div></div>}

          {tab === 'dashboard' && (
            <>
              <section className="dashboard-hero">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-300">{t.dashboard}</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 dark:text-white">Clinic command center</h3>
                  <p className="section-subtitle">Today's revenue, patient flow, and follow-up work in one focused view.</p>
                </div>
                <div className="dashboard-hero-meta">
                  <span>{new Date().toLocaleDateString()}</span>
                  <span>{todayAppointments.length} {t.todaysQueue}</span>
                </div>
              </section>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label={t.todayRevenue} value={formatMad(revenue.today)} icon={WalletCards} detail="Paid today" tone="success" featured />
                <StatCard label={t.weekRevenue} value={formatMad(revenue.week)} icon={WalletCards} detail="Current week" />
                <StatCard label={t.monthRevenue} value={formatMad(revenue.month)} icon={WalletCards} detail="Current month" />
                <StatCard label={t.outstanding} value={formatMad(revenue.outstanding)} icon={WalletCards} detail="Open balance" tone="warning" />
                <StatCard label={t.patients} value={String(patients.length)} icon={Users} detail="Active records" tone="neutral" />
              </section>
              <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <div className="space-y-4">
                  <QuickAdd t={t} quickInput={quickInput} setQuickInput={setQuickInput} onSubmit={quickCreateAppointment} onBackup={createBackup} lastBackup={lastBackup} />
                  <TodayQueue t={t} appointments={todayAppointments} onStatus={updateAppointmentStatus} />
                </div>
                <RecentPatients t={t} recentPatients={recentPatients} patients={patients} openPatient={(patient) => { openPatient(patient); setTab('patients'); }} />
              </section>
              <section className="grid gap-4 xl:grid-cols-2">
                <div className="dashboard-panel"><div className="panel-heading"><div><h3 className="section-title">{t.upcoming}</h3><p className="section-subtitle">Next 7 days</p></div><span className="badge-info">{upcomingDashboardAppointments.length}</span></div><AppointmentList t={t} appointments={upcomingDashboardAppointments} onEdit={editAppointment} onDelete={deleteAppointment} onCopy={copyReminder} whatsappLink={whatsappLink} /></div>
                <div className="dashboard-panel"><div className="panel-heading"><div><h3 className="section-title">{t.outstandingPayments}</h3><p className="section-subtitle">Payments needing follow-up</p></div><span className="badge-warning">{outstandingDashboardAppointments.length}</span></div><AppointmentList t={t} appointments={outstandingDashboardAppointments} onEdit={editAppointment} onDelete={deleteAppointment} onCopy={copyReminder} whatsappLink={whatsappLink} /></div>
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
              <button className="card p-5 text-left font-semibold transition hover:-translate-y-0.5 hover:shadow-lift" onClick={exportJson}><Download className="mb-3 h-5 w-5 text-brand-600" />{t.exportJson}</button>
              <button className="card p-5 text-left font-semibold transition hover:-translate-y-0.5 hover:shadow-lift" onClick={exportCsv}><Download className="mb-3 h-5 w-5 text-brand-600" />{t.exportCsv}</button>
              <button className="card p-5 text-left font-semibold transition hover:-translate-y-0.5 hover:shadow-lift" onClick={() => exportExcel(backup)}><Download className="mb-3 h-5 w-5 text-brand-600" />{t.exportExcel}</button>
              <label className="card cursor-pointer p-5 text-left font-semibold transition hover:-translate-y-0.5 hover:shadow-lift"><Upload className="mb-3 h-5 w-5 text-brand-600" />{t.importBackup}<input className="hidden" type="file" accept="application/json" onChange={(event) => { handleImport(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
              <button className="btn-primary md:col-span-2" onClick={seedData}>{t.loadSample}</button>
              {lastBackup && <button className="btn-secondary md:col-span-2" onClick={() => downloadFile(`backup-${lastBackup.at.slice(0, 10)}.json`, lastBackup.content, 'application/json')}>{t.downloadBackup}</button>}
              {pendingImport && (
                <section className="backup-preview md:col-span-2 xl:col-span-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">Import preview</p>
                    <h3 className="section-title mt-1">{pendingImport.totalRecords} records ready to import</h3>
                    <p className="section-subtitle">Review the backup contents before writing them to this clinic account.</p>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {pendingImport.summary.filter((item) => item.count > 0).map((item) => (
                      <div key={item.key} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/50">
                        <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                        <b className="float-right text-slate-950 dark:text-white">{item.count}</b>
                      </div>
                    ))}
                  </div>
                  {pendingImport.warnings.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {pendingImport.warnings.map((warning) => <p key={warning} className="badge-warning">{warning}</p>)}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={confirmImport}>Import backup</button>
                    <button className="btn-secondary" onClick={() => setPendingImport(null)}>Cancel</button>
                  </div>
                </section>
              )}
            </section>
          )}

          {tab === 'recycle' && <RecycleBin t={t} query={query} items={deletedItems} onRestore={async (item) => { await restoreItem(item.collectionName, item.id, item.entity, item.entityId); await load(); }} onDelete={async (item) => { await permanentlyDelete(item.collectionName, item.id, item.entity, item.entityId); await load(); }} />}

          {tab === 'audit' && <AuditTable auditLogs={auditLogs} />}

          {tab === 'settings' && (
            <section className="grid max-w-5xl gap-4 lg:grid-cols-[1fr_360px]">
              <div className="card p-5">
                <h3 className="section-title">{t.adminPassword}</h3>
                <p className="section-subtitle">Update the password for the signed-in clinic account.</p>
                <form className="mt-4 space-y-3" onSubmit={changePassword}><input className="input" name="password" type="password" placeholder={t.password} /><button className="btn-primary">{t.updatePassword}</button></form>
              </div>
              <LicenseStatusPanel license={license} onRefresh={user ? () => openAppForUser(user) : undefined} />
            </section>
          )}

          {query && !['patients', 'recycle'].includes(tab) && <section className="card p-4"><h3 className="section-title">{t.searchResults}</h3><AppointmentList t={t} appointments={filteredAppointments} onEdit={editAppointment} onDelete={deleteAppointment} onCopy={copyReminder} whatsappLink={whatsappLink} /></section>}
          <footer className="pb-2 pt-4 text-center text-xs text-slate-500 dark:text-slate-500 lg:hidden">{FOOTER_CREDIT}</footer>
        </main>
      </div>
    </div>
  );
}

function QuickAdd({ t, quickInput, setQuickInput, onSubmit, onBackup, lastBackup }: { t: Record<string, string>; quickInput: string; setQuickInput: (value: string) => void; onSubmit: (event: React.FormEvent) => void; onBackup: () => void; lastBackup: { at: string; content: string } | null }) {
  return (
    <div className="command-panel">
      <div className="panel-heading">
        <div>
          <h3 className="section-title">{t.quickAdd}</h3>
          <p className="section-subtitle">Create fast appointments without leaving the command center.</p>
        </div>
        <span className="badge-info">{t.create}</span>
      </div>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form className="flex flex-1 flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
          <label className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Appointment request<input className="input mt-2" value={quickInput} onChange={(event) => setQuickInput(event.target.value)} placeholder={t.quickPlaceholder} /></label>
          <button className="btn-primary self-end">{t.create}</button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button className="btn-secondary" onClick={onBackup}><Download className="h-4 w-4" />{t.createBackup}</button>
          <span className="backup-pill">{lastBackup ? `${t.lastBackupDate}: ${new Date(lastBackup.at).toLocaleDateString()} · ${t.lastBackupTime}: ${new Date(lastBackup.at).toLocaleTimeString()}` : t.noBackup}</span>
        </div>
      </div>
    </div>
  );
}

function TodayQueue({ t, appointments, onStatus }: { t: Record<string, string>; appointments: Appointment[]; onStatus: (appointment: Appointment, status: AppointmentStatus) => void }) {
  const activeCount = appointments.filter((item) => !['Completed', 'Cancelled', 'No Show'].includes(item.status)).length;

  return (
    <div className="dashboard-panel">
      <div className="panel-heading">
        <div>
          <h3 className="section-title">{t.todaysQueue}</h3>
          <p className="section-subtitle">{activeCount} active today</p>
        </div>
        <span className="badge-info">{appointments.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {appointments.length === 0 && <p className="empty-state empty-state-polished mt-3"><CalendarDays className="h-5 w-5" />No appointments scheduled today.</p>}
        {appointments.map((item) => <div key={item.id} className="queue-row"><div className="queue-time">{item.time}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-950 dark:text-white">{item.patientName}</span><span className="badge-info">{tStatus(item.status, t)}</span></div><p className="mt-1 truncate text-sm text-slate-500">{item.serviceName || item.treatmentPerformed || t.noTreatmentYet}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => onStatus(item, 'Arrived')}>{t.arrived}</button><button className="btn-secondary" onClick={() => onStatus(item, 'In Consultation')}>{t.inConsultation}</button><button className="btn-secondary" onClick={() => onStatus(item, 'Completed')}>{t.completed}</button></div></div>)}
      </div>
    </div>
  );
}

function RecentPatients({ t, recentPatients, patients, openPatient }: { t: Record<string, string>; recentPatients: RecentPatient[]; patients: Patient[]; openPatient: (patient: Patient) => void }) {
  return (
    <div className="dashboard-panel h-full">
      <div className="panel-heading">
        <div>
          <h3 className="section-title">{t.recentPatients}</h3>
          <p className="section-subtitle">Recently opened records</p>
        </div>
        <span className="badge-info">{recentPatients.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {recentPatients.map((recent) => {
          const patient = patients.find((item) => item.patientId === recent.patientId);
          return <button key={recent.patientId} className="recent-patient-row" onClick={() => patient && openPatient(patient)}><span className="patient-avatar">{recent.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><b className="block truncate text-slate-950 dark:text-white">{recent.name}</b><span className="text-slate-500">{new Date(recent.openedAt).toLocaleString()}</span></span></button>;
        })}
        {recentPatients.length === 0 && <p className="empty-state empty-state-polished"><Users className="h-5 w-5" />{t.noData}</p>}
      </div>
    </div>
  );
}

function PatientForm({ t, form, setForm, editing, onSubmit, onReset }: { t: Record<string, string>; form: Patient; setForm: (form: Patient) => void; editing: boolean; onSubmit: (event: React.FormEvent) => void; onReset: () => void }) {
  return (
    <form className="card space-y-3 p-4" onSubmit={onSubmit}>
      <h3 className="section-title">{editing ? t.editPatient : t.newPatient}</h3>
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
      <h3 className="section-title">{editing ? `${t.editAppointment} ${form.appointmentId}` : t.newAppointment}</h3>
      <select className="input" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value, patientName: patients.find((p) => p.patientId === e.target.value)?.name || form.patientName })} required><option value="">{t.selectPatient}</option>{patients.map((patient) => <option key={patient.id} value={patient.patientId}>{patient.patientId} - {patient.name}</option>)}</select>
      <select className="input" value={form.serviceId || ''} onChange={(e) => selectService(e.target.value)}><option value="">{t.serviceDropdown}</option>{services.filter((service) => service.active).map((service) => <option key={service.id} value={service.id}>{service.category} - {service.name}</option>)}</select>
      <div className="grid grid-cols-2 gap-3"><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /><input className="input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required /></div>
      <div className="grid grid-cols-2 gap-3"><select className="input" value={durationOptions.includes(form.duration) ? form.duration : 0} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) || form.duration })}>{durationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes ? `${minutes}m` : t.custom}</option>)}</select><input className="input" type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></div>
      <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AppointmentStatus })}>{statuses.map((status) => <option key={status} value={status}>{tStatus(status, t)}</option>)}</select>
      <input className="input" placeholder={t.treatment} value={form.treatmentPerformed} onChange={(e) => setForm({ ...form, treatmentPerformed: e.target.value })} />
      <div className="grid grid-cols-2 gap-3"><input className="input" type="number" min="0" placeholder="Revenue DH" value={form.revenueAmount || ''} onChange={(e) => setForm({ ...form, revenueAmount: Number(e.target.value) })} /><select className="input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></div>
      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium dark:border-slate-800 dark:bg-slate-950"><input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} />{t.paid}</label>
      <textarea className="input min-h-20" placeholder={t.notes} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <p className="text-xs text-slate-500">{t.draftSaved}</p>
      <div className="flex gap-2"><button className="btn-primary">{t.save}</button><button type="button" className="btn-secondary" onClick={onReset}>{t.clear}</button></div>
    </form>
  );
}

function PatientsTable({ t, patients, appointments, onOpen, onDelete }: { t: Record<string, string>; patients: Patient[]; appointments: Appointment[]; onOpen: (patient: Patient) => void; onDelete: (patient: Patient) => void }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>{t.patient}</th><th>{t.phone}</th><th>{t.history}</th><th></th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.id}><td><b className="text-slate-950 dark:text-white">{patient.patientId}</b><br />{patient.name}<PatientAlerts t={t} patient={patient} appointments={appointments} /></td><td>{patient.phone}<br /><span className="text-slate-500">{patient.age} {t.age}, {patient.gender}</span></td><td><span className="badge-info">{appointments.filter((item) => item.patientId === patient.patientId).length} {t.calendar}</span><br /><span className="mt-2 inline-block max-w-md text-slate-500">{appointments.filter((item) => item.patientId === patient.patientId).map((item) => item.treatmentPerformed).filter(Boolean).join(', ') || t.noTreatments}</span></td><td className="text-right"><div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => onOpen(patient)}>{t.edit}</button><button className="btn-secondary" onClick={() => onDelete(patient)}>{t.delete}</button></div></td></tr>)}</tbody></table></div>;
}

function PatientAlerts({ t, patient, appointments }: { t: Record<string, string>; patient: Patient; appointments: Appointment[] }) {
  const history = appointments.filter((item) => item.patientId === patient.patientId);
  const alerts = [
    history.length <= 1 && t.firstVisit,
    history.some((item) => !item.paid && item.revenueAmount > 0) && t.unpaidBalance,
    history.filter((item) => item.status === 'No Show').length >= 3 && t.noShowThree,
    history.some((item) => new Date(`${item.date}T${item.time}`) > new Date() && !['Cancelled', 'No Show'].includes(item.status)) && t.upcomingAppointment,
  ].filter(Boolean);
  return <div className="mt-2 flex flex-wrap gap-1">{alerts.map((alert) => <span key={String(alert)} className="badge-warning">! {alert}</span>)}</div>;
}

function PatientProfile({ t, patient, appointments, notes, onNote, onDeleteNote }: { t: Record<string, string>; patient: Patient; appointments: Appointment[]; notes: TimelineNote[]; onNote: (text: string, existing?: TimelineNote) => void; onDeleteNote: (note: TimelineNote) => void }) {
  const [noteText, setNoteText] = useState('');
  const [editing, setEditing] = useState<TimelineNote | undefined>();
  return <div className="card p-4"><h3 className="section-title">{t.patientProfile}: {patient.name}</h3><PatientAlerts t={t} patient={patient} appointments={appointments} /><p className="section-subtitle">{patient.medicalNotes || t.noData}</p><h4 className="mt-5 font-semibold">{t.medicalTimeline}</h4><form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); onNote(noteText, editing); setNoteText(''); setEditing(undefined); }}><input className="input" value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder={t.notes} /><button className="btn-primary">{editing ? t.save : t.addNote}</button></form><div className="mt-4 space-y-3">{notes.length === 0 && <p className="empty-state">{t.noData}</p>}{notes.map((note) => <div key={note.id} className="rounded-md border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40"><div className="flex justify-between gap-3"><p><span className="font-semibold text-slate-700 dark:text-slate-200">{new Date(note.createdAt).toLocaleDateString()}</span> - {note.text}</p><div className="flex gap-2"><button className="text-brand-600" onClick={() => { setEditing(note); setNoteText(note.text); }}>{t.edit}</button><button className="text-red-600" onClick={() => onDeleteNote(note)}>{t.delete}</button></div></div></div>)}</div></div>;
}

function ServicesPage({ t, services, categories, serviceForm, setServiceForm, editing, onSubmit, onReset, onEdit, onDelete, categoryName, setCategoryName, onCategorySubmit, onCategoryDelete }: { t: Record<string, string>; services: Service[]; categories: ServiceCategory[]; serviceForm: Service; setServiceForm: (service: Service) => void; editing: boolean; onSubmit: (event: React.FormEvent) => void; onReset: () => void; onEdit: (service: Service) => void; onDelete: (service: Service) => void; categoryName: string; setCategoryName: (value: string) => void; onCategorySubmit: (event: React.FormEvent) => void; onCategoryDelete: (category: ServiceCategory) => void }) {
  return <section className="grid gap-4 xl:grid-cols-[360px_1fr]"><div className="space-y-4"><form className="card space-y-3 p-4" onSubmit={onSubmit}><h3 className="section-title">{editing ? t.edit : t.newService}</h3><input className="input" placeholder={t.name} value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required /><select className="input" value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} required><option value="">{t.category}</option>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</select><input className="input" type="number" placeholder={t.defaultDuration} value={serviceForm.defaultDuration} onChange={(e) => setServiceForm({ ...serviceForm, defaultDuration: Number(e.target.value) })} /><input className="input" type="number" placeholder={t.defaultPrice} value={serviceForm.defaultPrice} onChange={(e) => setServiceForm({ ...serviceForm, defaultPrice: Number(e.target.value) })} /><textarea className="input min-h-20" placeholder={t.description} value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /><label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium dark:border-slate-800 dark:bg-slate-950"><input type="checkbox" checked={serviceForm.active} onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })} />{serviceForm.active ? t.active : t.inactive}</label><div className="flex gap-2"><button className="btn-primary">{t.save}</button><button className="btn-secondary" type="button" onClick={onReset}>{t.clear}</button></div></form><div className="card p-4"><form className="flex gap-2" onSubmit={onCategorySubmit}><input className="input" placeholder={t.category} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} /><button className="btn-primary">{t.create}</button></form><div className="mt-3 space-y-2">{categories.map((category) => <div key={category.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/50"><span>{category.name}</span><button className="text-red-600" type="button" onClick={() => onCategoryDelete(category)}>{t.delete}</button></div>)}</div></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>{t.services}</th><th>{t.category}</th><th>{t.defaultDuration}</th><th>{t.defaultPrice}</th><th></th></tr></thead><tbody>{services.map((service) => <tr key={service.id}><td><b className="text-slate-950 dark:text-white">{service.name}</b><br /><span className="text-slate-500">{service.description}</span></td><td><span className="badge-info">{service.category}</span></td><td>{service.defaultDuration}m</td><td>{formatMad(service.defaultPrice)}</td><td><div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => onEdit(service)}>{t.edit}</button><button className="btn-secondary" onClick={() => onDelete(service)}>{t.delete}</button></div></td></tr>)}</tbody></table></div></section>;
}

function AppointmentList({ t, appointments, onEdit, onDelete, onCopy, whatsappLink }: { t: Record<string, string>; appointments: Appointment[]; onEdit: (item: Appointment) => void; onDelete: (item: Appointment) => void; onCopy: (item: Appointment) => void; whatsappLink: (item: Appointment) => string }) {
  if (!appointments.length) return <p className="empty-state empty-state-polished mt-3"><CheckCircle2 className="h-5 w-5" />{t.noAppointments}</p>;
  return <div className="mt-3 space-y-2">{appointments.map((item) => <div key={item.id} className="appointment-row"><div className="appointment-date"><b>{item.time}</b><span>{item.date}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950 dark:text-white">{item.appointmentId} - {item.patientName}</p><span className={item.paid ? 'badge-success' : 'badge-warning'}>{item.paid ? t.paid : t.unpaid}</span><span className="badge-info">{tStatus(item.status, t)}</span></div><p className="mt-1 truncate text-sm text-slate-500">{item.duration}m | {item.serviceName || item.treatmentPerformed || t.noTreatmentYet} | {formatMad(item.revenueAmount)}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => onCopy(item)}>{t.copyReminder}</button><a className="btn-secondary" href={whatsappLink(item)} target="_blank" rel="noreferrer">WhatsApp</a><button className="btn-secondary" onClick={() => onEdit(item)}>{t.edit}</button><button className="btn-secondary" onClick={() => onDelete(item)}>{t.delete}</button></div></div>)}</div>;
}

function WaitingRoom({ t, appointments, onMove }: { t: Record<string, string>; appointments: Appointment[]; onMove: (appointment: Appointment, status: AppointmentStatus) => void }) {
  const lanes: AppointmentStatus[] = ['Confirmed', 'Arrived', 'Waiting', 'In Consultation', 'Completed'];
  const [dragged, setDragged] = useState<Appointment | null>(null);
  return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{lanes.map((lane) => <div key={lane} className="card min-h-80 p-3" onDragOver={(e) => e.preventDefault()} onDrop={() => dragged && onMove(dragged, lane)}><h3 className="mb-3 flex items-center justify-between font-semibold"><span>{tStatus(lane, t)}</span><span className="badge-info">{appointments.filter((item) => item.status === lane).length}</span></h3>{appointments.filter((item) => item.status === lane).map((item) => <div key={item.id} draggable onDragStart={() => setDragged(item)} className="mb-3 cursor-grab rounded-md border border-slate-200 bg-slate-50 p-3 text-sm shadow-soft transition hover:border-brand-200 dark:border-slate-700 dark:bg-slate-800"><p className="font-semibold text-slate-950 dark:text-white">{item.patientName}</p><p className="text-slate-500">{item.time} - {item.serviceName || item.treatmentPerformed || t.noTreatmentYet}</p></div>)}</div>)}</section>;
}

function RevenuePage({ t, revenue, appointments }: { t: Record<string, string>; revenue: Record<string, number>; appointments: Appointment[] }) {
  return <section className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Today" value={formatMad(revenue.today)} icon={WalletCards} /><StatCard label="Week" value={formatMad(revenue.week)} icon={WalletCards} /><StatCard label="Month" value={formatMad(revenue.month)} icon={WalletCards} /><StatCard label="Year" value={formatMad(revenue.year)} icon={WalletCards} /><StatCard label={t.outstanding} value={formatMad(revenue.outstanding)} icon={WalletCards} /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Patient</th><th>{t.services}</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>{appointments.filter((item) => item.revenueAmount > 0).map((item) => <tr key={item.id}><td>{item.date}</td><td>{item.patientName}</td><td>{item.serviceName || item.treatmentPerformed}</td><td className="font-semibold text-slate-950 dark:text-white">{formatMad(item.revenueAmount)}</td><td>{item.paymentMethod}</td><td><span className={item.paid ? 'badge-success' : 'badge-warning'}>{item.paid ? t.paid : t.unpaid}</span></td></tr>)}</tbody></table></div></section>;
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
  return <div className="card p-4"><h3 className="section-title">{title}</h3><div className="mt-4 space-y-3">{rows.length === 0 && <p className="empty-state">No data yet.</p>}{rows.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate">{label}</span><span className="font-semibold">{money ? formatMad(value) : value}</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${(value / max) * 100}%` }} /></div></div>)}</div></div>;
}

function RecycleBin({ t, query, items, onRestore, onDelete }: { t: Record<string, string>; query: string; items: DeletedItem[]; onRestore: (item: DeletedItem) => void; onDelete: (item: DeletedItem) => void }) {
  const filtered = items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()) || item.entityId.toLowerCase().includes(query.toLowerCase()));
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>{t.recycle}</th><th>{t.deletedDate}</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={`${item.collectionName}-${item.id}`}><td><b className="text-slate-950 dark:text-white">{item.entityId}</b><br />{item.label}</td><td>{item.deletedAt ? new Date(item.deletedAt).toLocaleString() : ''}</td><td><div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => onRestore(item)}>{t.restore}</button><button className="btn-danger" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" />{t.permanentDelete}</button></div></td></tr>)}</tbody></table></div>;
}

function AuditTable({ auditLogs }: { auditLogs: AuditLog[] }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log.id}><td>{new Date(log.createdAt).toLocaleString()}</td><td><span className="badge-info">{log.action}</span></td><td>{log.entityId}</td><td>{log.details}</td></tr>)}</tbody></table></div>;
}
