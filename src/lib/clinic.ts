import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from './firebase';
import type { Appointment, AuditLog, ClinicBackup, Patient, Payment, Service, ServiceCategory, TimelineNote, Treatment } from '../types/clinic';

let activeUserId = '';

type BackupArrayKey = Exclude<keyof ClinicBackup, 'exportedAt'>;

const backupCollections: Array<{ key: BackupArrayKey; label: string; collectionName: string }> = [
  { key: 'patients', label: 'Patients', collectionName: 'patients' },
  { key: 'appointments', label: 'Appointments', collectionName: 'appointments' },
  { key: 'payments', label: 'Payments', collectionName: 'payments' },
  { key: 'treatments', label: 'Treatments', collectionName: 'treatments' },
  { key: 'services', label: 'Services', collectionName: 'services' },
  { key: 'serviceCategories', label: 'Service categories', collectionName: 'service_categories' },
  { key: 'settings', label: 'Settings', collectionName: 'settings' },
  { key: 'timelineNotes', label: 'Timeline notes', collectionName: 'note_timeline' },
  { key: 'auditLogs', label: 'Audit logs', collectionName: 'audit_logs' },
];

export type BackupImportSummary = {
  key: BackupArrayKey;
  label: string;
  count: number;
};

export type PreparedBackupImport = {
  backup: ClinicBackup;
  summary: BackupImportSummary[];
  totalRecords: number;
  warnings: string[];
};

export function setActiveUserId(userId: string) {
  activeUserId = userId;
}

function scopedPath(collectionName: string) {
  if (!activeUserId) throw new Error('You must be logged in before accessing clinic data.');
  return ['users', activeUserId, collectionName] as const;
}

export function scopedCollection(collectionName: string) {
  return collection(db, ...scopedPath(collectionName));
}

export function scopedDoc(collectionName: string, id: string) {
  return doc(db, ...scopedPath(collectionName), id);
}

export const statuses = [
  'Scheduled',
  'Confirmed',
  'Arrived',
  'Waiting',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
] as const;

export const durationOptions = [15, 30, 45, 60, 90, 120, 0];
export const paymentMethods = ['Cash', 'Card', 'Transfer', 'Other'] as const;
export const softDeleteCollections = ['patients', 'appointments', 'services', 'treatments'] as const;

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

export function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}`);
}

export function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function formatMad(amount: number) {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount || 0);
}

export function makePatientId(count: number) {
  return `PAT-${String(count + 1).padStart(4, '0')}`;
}

export function makeAppointmentId(count: number, date = new Date()) {
  return `APT-${date.getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

export function overlaps(
  candidate: Pick<Appointment, 'id' | 'date' | 'time' | 'duration'>,
  appointments: Appointment[],
) {
  const start = toDateTime(candidate.date, candidate.time).getTime();
  const end = start + candidate.duration * 60000;
  return appointments.some((item) => {
    if (item.id === candidate.id || item.date !== candidate.date || ['Cancelled', 'No Show'].includes(item.status)) {
      return false;
    }
    const itemStart = toDateTime(item.date, item.time).getTime();
    const itemEnd = itemStart + item.duration * 60000;
    return start < itemEnd && end > itemStart;
  });
}

export async function getCollection<T>(name: string): Promise<T[]> {
  const snap = await getDocs(scopedCollection(name));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function getSettingsBackup() {
  const snap = await getDocs(scopedCollection('settings'));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function createAudit(action: string, entity: AuditLog['entity'], entityId: string, details: string) {
  await addDoc(scopedCollection('audit_logs'), { action, entity, entityId, details, createdAt: nowIso() });
}

export async function upsertPatient(patient: Patient, isNew: boolean) {
  await setDoc(scopedDoc('patients', patient.id), patient);
  await createAudit(isNew ? 'Patient created' : 'Patient edited', 'patient', patient.patientId, patient.name);
}

export async function upsertAppointment(appointment: Appointment, isNew: boolean) {
  await setDoc(scopedDoc('appointments', appointment.id), appointment);
  await createAudit(
    isNew ? 'Appointment created' : 'Appointment edited',
    'appointment',
    appointment.appointmentId,
    `${appointment.patientName} on ${appointment.date} ${appointment.time}`,
  );
}

function paymentFromAppointment(appointment: Appointment): Payment {
  return {
    id: `payment-${appointment.id}`,
    appointmentId: appointment.appointmentId,
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    amount: appointment.revenueAmount,
    method: appointment.paymentMethod,
    paid: true,
    date: appointment.date,
    notes: 'Generated from appointment payment status.',
    createdAt: nowIso(),
  };
}

export async function upsertAppointmentWithPayment(appointment: Appointment, isNew: boolean) {
  const batch = writeBatch(db);
  batch.set(scopedDoc('appointments', appointment.id), appointment);
  batch.set(scopedDoc('payments', `payment-${appointment.id}`), paymentFromAppointment(appointment));
  await batch.commit();
  await createAudit(
    isNew ? 'Appointment created' : 'Appointment edited',
    'appointment',
    appointment.appointmentId,
    `${appointment.patientName} on ${appointment.date} ${appointment.time}`,
  );
  await createAudit('Payment recorded', 'payment', `payment-${appointment.id}`, `${appointment.patientName} paid ${appointment.revenueAmount} DH`);
}

export async function markAppointmentPaid(appointment: Appointment) {
  await upsertAppointmentWithPayment({ ...appointment, paid: true, updatedAt: nowIso() }, false);
}

export async function removeAppointment(appointment: Appointment) {
  await softDelete('appointments', appointment.id, appointment.appointmentId, 'appointment', appointment.patientName);
  await createAudit('Appointment deleted', 'appointment', appointment.appointmentId, appointment.patientName);
}

export async function upsertService(service: Service, isNew: boolean) {
  await setDoc(scopedDoc('services', service.id), service);
  await createAudit(isNew ? 'Service created' : 'Service edited', 'service', service.id, service.name);
}

export async function upsertServiceCategory(category: ServiceCategory, isNew: boolean) {
  await setDoc(scopedDoc('service_categories', category.id), category);
  await createAudit(isNew ? 'Service category created' : 'Service category edited', 'service', category.id, category.name);
}

export async function upsertTimelineNote(note: TimelineNote, isNew: boolean) {
  await setDoc(scopedDoc('note_timeline', note.id), note);
  await createAudit(isNew ? 'Timeline note created' : 'Timeline note edited', 'note', note.patientId, note.text);
}

export async function deleteTimelineNote(note: TimelineNote) {
  await deleteDoc(scopedDoc('note_timeline', note.id));
  await createAudit('Timeline note deleted', 'note', note.patientId, note.text);
}

export async function addPayment(payment: Payment) {
  await setDoc(scopedDoc('payments', payment.id), payment);
  await createAudit('Payment added', 'payment', payment.id, `${payment.patientName} paid ${payment.amount} DH`);
}

export async function exportBackup(data: Omit<ClinicBackup, 'exportedAt'>) {
  return JSON.stringify({ exportedAt: nowIso(), ...data }, null, 2);
}

export function downloadFile(name: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBackupArray(input: Record<string, unknown>, key: BackupArrayKey, label: string) {
  const value = input[key];
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  value.forEach((item, index) => {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) {
      throw new Error(`${label} item ${index + 1} is missing a valid id.`);
    }
  });
  return value as Record<string, unknown>[];
}

export function prepareBackupImport(input: unknown): PreparedBackupImport {
  if (!isRecord(input)) throw new Error('Backup file is not a valid Top Management You backup.');

  const warnings: string[] = [];
  const backup = {
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : '',
  } as ClinicBackup;

  if (!backup.exportedAt) warnings.push('Backup exportedAt is missing; import can continue.');

  const summary = backupCollections.map(({ key, label }) => {
    const rows = readBackupArray(input, key, label);
    (backup as unknown as Record<BackupArrayKey, Record<string, unknown>[]>)[key] = rows;
    return { key, label, count: rows.length };
  });

  const totalRecords = summary.reduce((total, item) => total + item.count, 0);
  if (!totalRecords) throw new Error('Backup file does not contain any importable records.');
  if (totalRecords > 450) warnings.push('Large backup detected; records will be imported in multiple Firestore batches.');

  return { backup, summary, totalRecords, warnings };
}

export function exportExcel(backup: ClinicBackup) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.patients), 'Patients');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.appointments), 'Appointments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.payments), 'Payments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.treatments), 'Treatments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.services), 'Services');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(backup.timelineNotes), 'Notes Timeline');
  XLSX.writeFile(wb, `top-management-you-backup-${todayIso()}.xlsx`);
}

export async function importBackup(backup: ClinicBackup) {
  const writes = backupCollections.flatMap(({ key, collectionName }) => {
    const rows = (backup[key] || []) as Array<Record<string, unknown> & { id: string }>;
    return rows.map((item) => ({ collectionName, item }));
  });

  for (let index = 0; index < writes.length; index += 450) {
    const batch = writeBatch(db);
    writes.slice(index, index + 450).forEach(({ collectionName, item }) => {
      batch.set(scopedDoc(collectionName, item.id), item);
    });
    await batch.commit();
  }

  await createAudit('Backup imported', 'backup', `backup-${Date.now()}`, `Imported ${backup.exportedAt}`);
}

export async function patchAppointment(id: string, data: Partial<Appointment>) {
  await updateDoc(scopedDoc('appointments', id), { ...data, updatedAt: nowIso() });
}

export async function softDelete(
  collectionName: string,
  id: string,
  entityId: string,
  entity: AuditLog['entity'],
  details: string,
) {
  await updateDoc(scopedDoc(collectionName, id), { deleted: true, deletedAt: nowIso(), updatedAt: nowIso() });
  await createAudit(`${entity} moved to recycle bin`, entity, entityId, details);
}

export async function restoreItem(collectionName: string, id: string, entity: AuditLog['entity'], entityId: string) {
  await updateDoc(scopedDoc(collectionName, id), { deleted: false, deletedAt: '', updatedAt: nowIso() });
  await createAudit(`${entity} restored`, entity, entityId, `Restored ${id}`);
}

export async function permanentlyDelete(collectionName: string, id: string, entity: AuditLog['entity'], entityId: string) {
  await deleteDoc(scopedDoc(collectionName, id));
  await createAudit(`${entity} permanently deleted`, entity, entityId, `Deleted ${id}`);
}

export async function purgeOldDeleted(items: Array<{ collectionName: string; id: string; deletedAt?: string; entity: AuditLog['entity']; entityId: string }>) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await Promise.all(
    items
      .filter((item) => item.deletedAt && new Date(item.deletedAt).getTime() < cutoff)
      .map((item) => permanentlyDelete(item.collectionName, item.id, item.entity, item.entityId)),
  );
}

export async function getSettingDocument(id: string) {
  const snap = await getDoc(scopedDoc('settings', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
